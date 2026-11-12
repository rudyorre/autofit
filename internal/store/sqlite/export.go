package sqlite

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/rudyorre/autofit/internal/store"
)

func (s *Store) ExportBackup(ctx context.Context, userID string) (*store.BackupBundle, error) {
	userID = normalizeUser(userID)
	exs, err := s.ListExercises(ctx, userID)
	if err != nil {
		return nil, err
	}
	splits, err := s.ListSplitTemplates(ctx, userID)
	if err != nil {
		return nil, err
	}
	workouts, err := s.ListWorkouts(ctx, userID, 10000)
	if err != nil {
		return nil, err
	}
	dailies, err := s.ListDailySummaries(ctx, userID, "", "")
	if err != nil {
		return nil, err
	}
	sleeps, err := s.ListSleepSessions(ctx, userID, "", "")
	if err != nil {
		return nil, err
	}
	runs, err := s.ListCardioActivities(ctx, userID, 10000)
	if err != nil {
		return nil, err
	}
	body, err := s.ListBodyMeasurements(ctx, userID)
	if err != nil {
		return nil, err
	}
	labs, err := s.ListLabObservations(ctx, userID, "")
	if err != nil {
		return nil, err
	}
	cals, err := s.ListScoreCalibrations(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &store.BackupBundle{
		ExportedAt:       time.Now().UTC(),
		Exercises:        exs,
		Splits:           splits,
		Workouts:         workouts,
		DailySummaries:   dailies,
		SleepSessions:    sleeps,
		CardioActivities: runs,
		BodyMeasurements: body,
		LabObservations:  labs,
		Calibrations:     cals,
	}, nil
}

func BuildCSVTables(bundle *store.BackupBundle) map[string][][]string {
	tables := make(map[string][][]string)

	// 1. workout_sets.csv
	setRows := [][]string{{
		"local_date", "workout_id", "workout_title", "source", "exercise_slug", "exercise_name",
		"set_index", "equipment", "tare_lb", "load_mode", "per_side_or_hand_lb", "total_weight_lb",
		"reps", "e1rm_lb", "raw_formula",
	}}
	for _, w := range bundle.Workouts {
		for _, st := range w.Sets {
			setRows = append(setRows, []string{
				w.LocalDate, w.ID, w.Title, w.Source, st.ExerciseSlug, st.ExerciseName,
				strconv.Itoa(st.SetIndex), st.Equipment, fmtFloat(st.TareLb), st.LoadMode,
				fmtFloat(st.PerSideOrHandLb), fmtFloat(st.TotalWeightLb),
				strconv.Itoa(st.Reps), fmtFloat(st.E1RMLb), st.RawFormula,
			})
		}
	}
	tables["workout_sets.csv"] = setRows

	// 2. daily_summaries.csv
	dailyRows := [][]string{{
		"local_date", "steps", "distance_m", "active_kcal", "total_kcal", "azm_minutes",
		"rhr_bpm", "hrv_rmssd_ms", "spo2_pct", "resp_rate", "vo2_gh",
		"readiness_open", "sleep_score_open", "cardio_load_trimp", "source",
	}}
	for _, d := range bundle.DailySummaries {
		dailyRows = append(dailyRows, []string{
			d.LocalDate, strconv.Itoa(d.Steps), fmtFloat(d.DistanceM),
			strconv.Itoa(d.ActiveKcal), strconv.Itoa(d.TotalKcal), strconv.Itoa(d.AZMMinutes),
			fmtFloat(d.RHRBpm), fmtFloat(d.HRVRmssdMs), fmtFloat(d.SpO2Pct),
			fmtFloat(d.RespRate), fmtFloat(d.VO2GH), fmtFloat(d.ReadinessOpen),
			fmtFloat(d.SleepScoreOpen), fmtFloat(d.CardioLoadTRIMP), d.Source,
		})
	}
	tables["daily_summaries.csv"] = dailyRows

	// 3. cardio_activities.csv
	runRows := [][]string{{
		"local_date", "title", "sport", "distance_m", "duration_s", "avg_hr",
		"avg_cadence", "elevation_gain_m", "vdot_open", "zone2_efficiency", "trimp", "source",
	}}
	for _, r := range bundle.CardioActivities {
		runRows = append(runRows, []string{
			r.LocalDate, r.Title, r.Sport, fmtFloat(r.DistanceM), fmtFloat(r.DurationS),
			strconv.Itoa(r.AvgHR), strconv.Itoa(r.AvgCadence), fmtFloat(r.ElevationGainM),
			fmtFloat(r.VDOTOpen), fmtFloat(r.Zone2Efficiency), fmtFloat(r.TRIMP), r.Source,
		})
	}
	tables["cardio_activities.csv"] = runRows

	// 4. body_measurements.csv
	bodyRows := [][]string{{"local_date", "weight_lb", "ewma_weight_lb", "body_fat_pct", "lean_mass_lb", "source"}}
	for _, b := range bundle.BodyMeasurements {
		bodyRows = append(bodyRows, []string{
			b.LocalDate, fmtFloat(b.WeightLb), fmtFloat(b.EWMAWeightLb),
			fmtFloat(b.BodyFatPct), fmtFloat(b.LeanMassLb), b.Source,
		})
	}
	tables["body_measurements.csv"] = bodyRows

	// 5. lab_observations.csv
	labRows := [][]string{{"local_date", "loinc_code", "biomarker_slug", "biomarker_name", "value_num", "unit", "ref_low", "ref_high"}}
	for _, ob := range bundle.LabObservations {
		labRows = append(labRows, []string{
			ob.LocalDate, ob.LOINCCode, ob.BiomarkerSlug, ob.BiomarkerName,
			fmtFloat(ob.ValueNum), ob.Unit, fmtFloat(ob.RefLow), fmtFloat(ob.RefHigh),
		})
	}
	tables["lab_observations.csv"] = labRows

	return tables
}

func WriteExportDirectory(bundle *store.BackupBundle, outDir string) error {
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	tables := BuildCSVTables(bundle)
	for name, rows := range tables {
		f, err := os.Create(filepath.Join(outDir, name))
		if err != nil {
			return err
		}
		w := csv.NewWriter(f)
		if err := w.WriteAll(rows); err != nil {
			_ = f.Close()
			return err
		}
		w.Flush()
		_ = f.Close()
	}
	rawJSON, err := json.MarshalIndent(bundle, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outDir, "autofit_backup.json"), rawJSON, 0o644)
}

func BuildExportZip(bundle *store.BackupBundle) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	tables := BuildCSVTables(bundle)
	for name, rows := range tables {
		fw, err := zw.Create(name)
		if err != nil {
			return nil, err
		}
		cw := csv.NewWriter(fw)
		if err := cw.WriteAll(rows); err != nil {
			return nil, err
		}
		cw.Flush()
	}
	fw, err := zw.Create("autofit_backup.json")
	if err != nil {
		return nil, err
	}
	enc := json.NewEncoder(fw)
	enc.SetIndent("", "  ")
	if err := enc.Encode(bundle); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func fmtFloat(v float64) string {
	return fmt.Sprintf("%.2f", v)
}
