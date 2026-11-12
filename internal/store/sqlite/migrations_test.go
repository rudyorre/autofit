package sqlite

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/rudyorre/autofit/internal/store"
)

func TestSchemaMigrationsAndOnlineVacuumBackup(t *testing.T) {
	ctx := context.Background()
	tmpDir := t.TempDir()
	dbFile := filepath.Join(tmpDir, "autofit.db")

	st, err := Open(dbFile)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer st.Close()

	if err := st.EnsureSeedCatalog(ctx, store.DefaultUserID); err != nil {
		t.Fatalf("seed catalog: %v", err)
	}

	var migCnt int
	if err := st.db.QueryRow(`SELECT COUNT(1) FROM schema_migrations WHERE version = '001_init.sql'`).Scan(&migCnt); err != nil || migCnt != 1 {
		t.Fatalf("expected 001_init.sql recorded in schema_migrations, got cnt=%d err=%v", migCnt, err)
	}

	// Verify online VACUUM INTO creates an independent valid SQLite snapshot
	snapFile := filepath.Join(tmpDir, "snapshot.db")
	if err := st.BackupVacuumInto(ctx, snapFile); err != nil {
		t.Fatalf("BackupVacuumInto failed: %v", err)
	}

	snapStore, err := Open(snapFile)
	if err != nil {
		t.Fatalf("open snapshot db: %v", err)
	}
	defer snapStore.Close()

	exs, err := snapStore.ListExercises(ctx, store.DefaultUserID)
	if err != nil || len(exs) < 40 {
		t.Fatalf("expected seeded exercises preserved in snapshot, got %d (err=%v)", len(exs), err)
	}
}
