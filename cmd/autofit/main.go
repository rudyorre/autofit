package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rudyorre/autofit/internal/api"
	"github.com/rudyorre/autofit/internal/config"
	"github.com/rudyorre/autofit/internal/demo"
	"github.com/rudyorre/autofit/internal/garmin"
	"github.com/rudyorre/autofit/internal/googlehealth"
	"github.com/rudyorre/autofit/internal/importer"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

func main() {
	cfg := config.Load()

	cmd := "serve"
	if len(os.Args) > 1 && os.Args[1][0] != '-' {
		cmd = os.Args[1]
	}

	switch cmd {
	case "serve":
		var args []string
		if len(os.Args) > 1 && os.Args[1] == "serve" {
			args = os.Args[2:]
		} else {
			args = os.Args[1:]
		}
		if err := runServe(cfg, args); err != nil {
			log.Fatalf("autofit serve: %v", err)
		}
	case "import-xlsx":
		if err := runImportXLSX(cfg, os.Args[2:]); err != nil {
			log.Fatalf("autofit import-xlsx: %v", err)
		}
	case "export-csv":
		if err := runExportCSV(cfg, os.Args[2:]); err != nil {
			log.Fatalf("autofit export-csv: %v", err)
		}
	case "seed-demo":
		if err := runSeedDemo(cfg, os.Args[2:]); err != nil {
			log.Fatalf("autofit seed-demo: %v", err)
		}
	case "backup":
		if err := runBackup(cfg, os.Args[2:]); err != nil {
			log.Fatalf("autofit backup: %v", err)
		}
	default:
		printUsage()
		os.Exit(1)
	}
}

func runServe(cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	addr := fs.String("addr", cfg.Addr, "HTTP listen address")
	dbPath := fs.String("db", cfg.DBPath, "SQLite WAL database path")
	if err := fs.Parse(args); err != nil {
		return err
	}
	cfg.Addr = *addr
	cfg.DBPath = *dbPath

	repo, err := sqlite.Open(cfg.DBPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := repo.EnsureSeedCatalog(ctx, store.DefaultUserID); err != nil {
		return err
	}

	// Start background Google Health & Garmin sync workers when configured
	ghSvc := googlehealth.NewService(cfg, repo)
	garSvc := garmin.NewService(cfg, repo)
	go runBackgroundSync(ctx, cfg, ghSvc, garSvc)

	srv := api.NewServer(cfg, repo)
	httpSrv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(shutCtx)
	}()

	log.Printf("Autofit v0 listening on %s (SQLite WAL: %s)", cfg.Addr, cfg.DBPath)
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func runBackgroundSync(ctx context.Context, cfg config.Config, gh *googlehealth.Service, gar *garmin.Service) {
	ghTicker := time.NewTicker(cfg.GoogleSyncInterval)
	garTicker := time.NewTicker(cfg.GarminSyncInterval)
	defer ghTicker.Stop()
	defer garTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ghTicker.C:
			_, _ = gh.PollDailyRollup(ctx, store.DefaultUserID, time.Now().UTC())
		case <-garTicker.C:
			_, _ = gar.PollRecentActivities(ctx, store.DefaultUserID, time.Now().UTC())
		}
	}
}

func runImportXLSX(cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("import-xlsx", flag.ContinueOnError)
	dbPath := fs.String("db", cfg.DBPath, "SQLite WAL database path")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() < 1 {
		return fmt.Errorf("usage: autofit import-xlsx [-db path] <file.xlsx | https://docs.google.com/spreadsheets/d/...>")
	}
	source := fs.Arg(0)

	repo, err := sqlite.Open(*dbPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	sum, err := importer.ImportXLSXFileOrURL(context.Background(), repo, store.DefaultUserID, source)
	if err != nil {
		return err
	}
	out, _ := json.MarshalIndent(sum, "", "  ")
	fmt.Println(string(out))
	return nil
}

func runExportCSV(cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("export-csv", flag.ContinueOnError)
	dbPath := fs.String("db", cfg.DBPath, "SQLite WAL database path")
	outDir := fs.String("out", "./exports", "Output directory for CSV & JSON backup")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() >= 1 {
		*outDir = fs.Arg(0)
	}

	repo, err := sqlite.Open(*dbPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	bundle, err := repo.ExportBackup(context.Background(), store.DefaultUserID)
	if err != nil {
		return err
	}
	if err := sqlite.WriteExportDirectory(bundle, *outDir); err != nil {
		return err
	}
	fmt.Printf("Exported CSV + JSON backup to %s (%d workouts, %d daily summaries, %d runs, %d lab observations)\n",
		*outDir, len(bundle.Workouts), len(bundle.DailySummaries), len(bundle.CardioActivities), len(bundle.LabObservations))
	return nil
}

func runSeedDemo(cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("seed-demo", flag.ContinueOnError)
	dbPath := fs.String("db", cfg.DBPath, "SQLite WAL database path")
	if err := fs.Parse(args); err != nil {
		return err
	}

	repo, err := sqlite.Open(*dbPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	rep, err := demo.Seed(context.Background(), repo, store.DefaultUserID, time.Now().UTC())
	if err != nil {
		return err
	}
	out, _ := json.MarshalIndent(rep, "", "  ")
	fmt.Println(string(out))
	return nil
}

func runBackup(cfg config.Config, args []string) error {
	fs := flag.NewFlagSet("backup", flag.ContinueOnError)
	dbPath := fs.String("db", cfg.DBPath, "SQLite WAL database path")
	if err := fs.Parse(args); err != nil {
		return err
	}
	dest := fmt.Sprintf("%s.bak-%s", *dbPath, time.Now().UTC().Format("20060102T150405Z"))
	if fs.NArg() >= 1 {
		dest = fs.Arg(0)
	}

	repo, err := sqlite.Open(*dbPath)
	if err != nil {
		return err
	}
	defer repo.Close()

	if err := repo.BackupVacuumInto(context.Background(), dest); err != nil {
		return err
	}
	fmt.Printf("Created atomic online SQLite snapshot: %s\n", dest)
	return nil
}

func printUsage() {
	fmt.Fprintf(os.Stderr, `Autofit v0 — Open-Source Health, Garmin .FIT & Longitudinal Strength OS

Usage:
  autofit serve [-addr :8080] [-db ./data/local/autofit.db]
  autofit import-xlsx [-db ./data/local/autofit.db] <file.xlsx | google-sheet-url>
  autofit seed-demo [-db ./data/local/autofit.db]
  autofit backup [-db ./data/local/autofit.db] [snapshot-path.db]
  autofit export-csv [-db ./data/local/autofit.db] [output-dir]
`)
}
