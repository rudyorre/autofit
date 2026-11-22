package analytics

import (
	"context"
	"testing"
	"time"

	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

func TestComputeOnDemandPillarsAndImmediateFormulaRecalc(t *testing.T) {
	ctx := context.Background()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer repo.Close()

	if err := repo.EnsureSeedCatalog(ctx, store.DefaultUserID); err != nil {
		t.Fatalf("seed catalog: %v", err)
	}

	// Verify default feature flags keep UI focused on Strength + Cardio + Sleep
	prefs, err := repo.GetUserPreferences(ctx, store.DefaultUserID)
	if err != nil {
		t.Fatalf("get prefs: %v", err)
	}
	if !prefs.FeatureFlags.PillarStrength || !prefs.FeatureFlags.PillarCardio || !prefs.FeatureFlags.PillarSleep {
		t.Fatalf("expected strength, cardio, sleep enabled by default: %+v", prefs.FeatureFlags)
	}
	if prefs.FeatureFlags.PillarScreenTime || prefs.FeatureFlags.PillarFlexibility || prefs.FeatureFlags.ViewHealthLabs || prefs.FeatureFlags.ToolOLSCalibration {
		t.Fatalf("expected extra pillars/tools feature-flagged off by default: %+v", prefs.FeatureFlags)
	}

	// Seed immutable raw facts across Strength, Cardio, Sleep, Body, Flexibility, Screen Time
	bench, _ := repo.GetExerciseBySlug(ctx, store.DefaultUserID, "bench-press")
	squat, _ := repo.GetExerciseBySlug(ctx, store.DefaultUserID, "squat")
	asOf := time.Date(2026, 11, 20, 0, 0, 0, 0, time.UTC)

	_ = repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
		UserID: store.DefaultUserID, MeasuredAt: asOf, LocalDate: "2026-11-20",
		WeightLb: 165, EWMAWeightLb: 165, BodyFatPct: 14.5, LeanMassLb: 141.1, Source: "manual",
	})
	_ = repo.UpsertWorkout(ctx, &store.Workout{
		ID: "wk-1", UserID: store.DefaultUserID, StartedAt: asOf, LocalDate: "2026-11-18",
		Title: "Push/Legs", Source: "autofit_pwa",
		Sets: []store.WorkoutSet{
			{ExerciseID: bench.ID, SetIndex: 1, Equipment: "olympic_bar", TareLb: 45, TotalWeightLb: 165, Reps: 5},
			{ExerciseID: squat.ID, SetIndex: 2, Equipment: "olympic_bar", TareLb: 45, TotalWeightLb: 225, Reps: 5},
		},
	})
	_ = repo.UpsertCardioActivity(ctx, &store.CardioActivity{
		UserID: store.DefaultUserID, StartedAt: asOf, LocalDate: "2026-11-19",
		Title: "Tempo Run", Sport: "running", DistanceM: 8000, DurationS: 2300,
		AvgHR: 152, VDOTOpen: 51.0, Zone2PaceSecPerMi: 495, Source: "garmin_fit",
	})
	_ = repo.UpsertSleepSession(ctx, &store.SleepSession{
		UserID: store.DefaultUserID, LocalDate: "2026-11-20",
		StartTS: asOf.Add(-8 * time.Hour), EndTS: asOf,
		EfficiencyPct: 92, DeepMin: 95, REMMin: 105, LightMin: 265, AwakeMin: 35,
		Source: "google_health_api",
	})
	_ = repo.UpsertDailyCheckin(ctx, &store.DailyCheckin{
		UserID: store.DefaultUserID, LocalDate: "2026-11-20",
		ScreenTimeMin: 180, MobilityMin: 45, WaistIn: 31.5, Source: "manual",
	})
	_ = repo.UpsertMobilityTest(ctx, &store.MobilityTest{
		UserID: store.DefaultUserID, LocalDate: "2026-11-20",
		TestSlug: "ankle_ktw_cm", ValueNum: 9.0, Unit: "cm",
	})

	eng := NewEngine(repo)
	dash, err := eng.BuildPillarDashboard(ctx, store.DefaultUserID, asOf)
	if err != nil {
		t.Fatalf("BuildPillarDashboard: %v", err)
	}
	if dash.EnabledCount != 3 {
		t.Fatalf("expected 3 enabled pillars by default, got %d", dash.EnabledCount)
	}

	byKey := map[string]PillarCard{}
	for _, c := range dash.Pillars {
		byKey[c.Key] = c
	}

	if byKey["strength"].ScoreModel != "percentile" || !byKey["strength"].HasData || len(byKey["strength"].Breakdown) != 2 {
		t.Fatalf("unexpected strength pillar: %+v", byKey["strength"])
	}
	if byKey["cardio"].ScoreModel != "percentile" || !byKey["cardio"].HasData || byKey["cardio"].Score < 50 {
		t.Fatalf("unexpected cardio pillar: %+v", byKey["cardio"])
	}
	if byKey["sleep"].ScoreModel != "optimum" || !byKey["sleep"].HasData || len(byKey["sleep"].Breakdown) != 4 {
		t.Fatalf("unexpected sleep pillar (expected 4 RU-SATED ingredients): %+v", byKey["sleep"])
	}
	if !byKey["flexibility"].HasData || !byKey["screen_time"].HasData || !byKey["body_fat"].HasData {
		t.Fatalf("expected flexibility, screen_time, body_fat computed on demand")
	}

	// Verify compute-on-demand: tightening ScreenTimeTargetMin immediately lowers score with zero DB reprocessing!
	beforeScreenScore := byKey["screen_time"].Score
	prefs.ScreenTimeTargetMin = 60 // tighten from 120m -> 60m
	if err := repo.UpsertUserPreferences(ctx, prefs); err != nil {
		t.Fatalf("update prefs: %v", err)
	}
	dash2, err := eng.BuildPillarDashboard(ctx, store.DefaultUserID, asOf)
	if err != nil {
		t.Fatalf("BuildPillarDashboard after pref update: %v", err)
	}
	var afterScreenScore float64
	for _, c := range dash2.Pillars {
		if c.Key == "screen_time" {
			afterScreenScore = c.Score
		}
	}
	if afterScreenScore >= beforeScreenScore {
		t.Fatalf("expected tightening screen time target to immediately lower score on demand: before=%.1f after=%.1f", beforeScreenScore, afterScreenScore)
	}

	// Verify dynamic historical pillar trend works cleanly
	tr, err := eng.BuildTrend(ctx, store.DefaultUserID, "pillar:strength", "1m", asOf)
	if err != nil || tr == nil || tr.Key != "pillar:strength" {
		t.Fatalf("expected pillar:strength dynamic trend, got %+v err=%v", tr, err)
	}
}
