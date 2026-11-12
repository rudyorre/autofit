package analytics

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

func TestLongitudinalNoDataGapsPlateausAndSmithSeparation(t *testing.T) {
	ctx := context.Background()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer repo.Close()
	if err := repo.EnsureSeedCatalog(ctx, store.DefaultUserID); err != nil {
		t.Fatalf("seed catalog: %v", err)
	}
	bench, err := repo.GetExerciseBySlug(ctx, store.DefaultUserID, "bench-press")
	if err != nil || bench == nil {
		t.Fatalf("missing bench-press: %v", err)
	}

	// Phase 1: Mar-May 2024 progression (135 -> 155 lb Olympic bar)
	// Hiatus: Jun-Oct 2024 (> 21 days -> must produce explicit nil No-Data gap!)
	// Phase 2: Nov 2024 - Apr 2025 flat plateau at 175 lb Olympic bar (plus one 160 lb Smith machine session)
	sessions := []struct {
		date  string
		equip string
		tare  float64
		total float64
	}{
		{"2024-03-05", "olympic_bar", 45, 135},
		{"2024-04-10", "olympic_bar", 45, 145},
		{"2024-05-12", "olympic_bar", 45, 155},
		// 5-month hiatus here!
		{"2024-11-04", "olympic_bar", 45, 175},
		{"2024-11-18", "olympic_bar", 45, 175},
		{"2024-12-06", "olympic_bar", 45, 175},
		{"2024-12-20", "smith", 20, 160}, // Smith session must go to alt_series, not contaminate Olympic bar!
		{"2025-01-08", "olympic_bar", 45, 175},
		{"2025-01-22", "olympic_bar", 45, 175},
		{"2025-02-09", "olympic_bar", 45, 175},
		{"2025-03-11", "olympic_bar", 45, 175},
		{"2025-04-09", "olympic_bar", 45, 175},
	}

	for i, s := range sessions {
		dt, _ := time.Parse("2006-01-02", s.date)
		perSide := (s.total - s.tare) / 2.0
		wk := &store.Workout{
			ID:        fmt.Sprintf("wk-%d", i),
			UserID:    store.DefaultUserID,
			StartedAt: dt.Add(17 * time.Hour),
			LocalDate: s.date,
			Title:     "Push",
			Source:    "autofit_pwa",
			Sets: []store.WorkoutSet{{
				ExerciseID:      bench.ID,
				SetIndex:        1,
				Equipment:       s.equip,
				TareLb:          s.tare,
				LoadMode:        "plates_per_side",
				PerSideOrHandLb: perSide,
				TotalWeightLb:   s.total,
				Reps:            5,
			}},
		}
		if err := repo.UpsertWorkout(ctx, wk); err != nil {
			t.Fatalf("upsert workout: %v", err)
		}
	}

	eng := NewEngine(repo)
	ref := time.Date(2025, 4, 15, 0, 0, 0, 0, time.UTC)
	tp, err := eng.BuildTrend(ctx, store.DefaultUserID, "lift:bench-press", "all", ref)
	if err != nil {
		t.Fatalf("BuildTrend failed: %v", err)
	}

	if len(tp.NoDataGaps) == 0 {
		t.Fatalf("expected explicit No-Data hiatus band for Jun-Oct 2024, got 0 gaps")
	}
	hasNil := false
	for _, v := range tp.Series {
		if v == nil {
			hasNil = true
			break
		}
	}
	if !hasNil {
		t.Fatalf("expected nil entries in Series during No-Data hiatus so line breaks cleanly")
	}
	if len(tp.Plateaus) == 0 {
		t.Fatalf("expected flat-slope plateau detection during Nov 2024 - Apr 2025 at 175 lb")
	}
	if tp.AltSeries == nil || tp.AltSeries.Equipment != "smith" || len(tp.AltSeries.Points) != 1 {
		t.Fatalf("expected separate Smith machine alt_series with 1 point, got %+v", tp.AltSeries)
	}
}

func TestOLSScoreCalibrationAndOpenScores(t *testing.T) {
	sleep := ComputeOpenSleepScore(104, 112, 250, 24, 94)
	if sleep < 80 || sleep > 99 {
		t.Fatalf("unexpected open sleep score: %.1f", sleep)
	}

	readinessFull := ComputeOpenReadiness(66, 58, 49, 53, sleep, 1.0)
	readinessDegraded := ComputeOpenReadiness(0, 0, 49, 53, sleep, 1.0) // No HRV fallback mode
	if readinessFull < 75 || readinessDegraded < 70 {
		t.Fatalf("unexpected readiness scores: full=%.1f degraded=%.1f", readinessFull, readinessDegraded)
	}

	vdot := ComputeOpenVDOT(6630, 31*60+18, 42)
	if vdot < 42 || vdot > 58 {
		t.Fatalf("unexpected VDOT: %.1f", vdot)
	}

	pairs := []store.ScoreCalibration{
		{OpenReadiness: 70, GHReadiness: 73, OpenSleepScore: 80, GHSleepScore: 82, OpenCardioLoad: 300, GHCardioLoad: 330},
		{OpenReadiness: 80, GHReadiness: 84, OpenSleepScore: 85, GHSleepScore: 87, OpenCardioLoad: 400, GHCardioLoad: 435},
		{OpenReadiness: 90, GHReadiness: 95, OpenSleepScore: 90, GHSleepScore: 92, OpenCardioLoad: 500, GHCardioLoad: 540},
	}
	suite := FitCalibrationSuite(pairs)
	if !suite.Readiness.Active || suite.Readiness.R2 < 0.98 {
		t.Fatalf("expected high R^2 OLS fit on linear calibration pairs, got %+v", suite.Readiness)
	}
	calibrated := suite.Readiness.Apply(80, 15, 100)
	if calibrated < 83 || calibrated > 85 {
		t.Fatalf("expected calibrated readiness ~84, got %.1f", calibrated)
	}
}
