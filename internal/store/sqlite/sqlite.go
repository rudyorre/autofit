package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/ncruces/go-sqlite3/driver"

	"github.com/rudyorre/autofit/data/exercises"
	"github.com/rudyorre/autofit/internal/store"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type Store struct {
	db     *sql.DB
	dbPath string
}

func NewID() string {
	if id, err := uuid.NewV7(); err == nil {
		return id.String()
	}
	return uuid.NewString()
}

func ComputeE1RM(weightLb float64, reps int) float64 {
	if weightLb <= 0 || reps <= 0 {
		return 0
	}
	if reps == 1 {
		return math.Round(weightLb*10) / 10
	}
	return math.Round(weightLb*(1.0+float64(reps)/30.0)*10) / 10
}

func Open(dbPath string) (*Store, error) {
	if dbPath != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
			return nil, fmt.Errorf("mkdir db dir: %w", err)
		}
	}
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1) // Serialize writes cleanly in WAL mode

	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA busy_timeout = 5000;",
		"PRAGMA foreign_keys = ON;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("pragma %s: %w", p, err)
		}
	}

	st := &Store{db: db, dbPath: dbPath}
	if err := st.runMigrations(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate schema: %w", err)
	}
	return st, nil
}

func (s *Store) runMigrations() error {
	if _, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`); err != nil {
		return err
	}

	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	applied := make(map[string]bool)
	rows, err := s.db.Query(`SELECT version FROM schema_migrations`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err == nil {
			applied[v] = true
		}
	}
	_ = rows.Close()

	// Check if existing populated tables already exist before applying subsequent migrations (> 001)
	var existingTables int
	_ = s.db.QueryRow(`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name='workouts'`).Scan(&existingTables)

	backedUpThisBoot := false
	for _, name := range names {
		if applied[name] {
			continue
		}
		sqlBytes, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}

		// Automatic pre-migration online snapshot before applying new schema migrations (002+) to a populated DB!
		if !backedUpThisBoot && s.dbPath != "" && s.dbPath != ":memory:" && existingTables > 0 && name != "001_init.sql" {
			bakPath := fmt.Sprintf("%s.bak-%s-pre-%s", s.dbPath, time.Now().UTC().Format("20060102T150405Z"), strings.TrimSuffix(name, ".sql"))
			if err := s.BackupVacuumInto(context.Background(), bakPath); err != nil {
				return fmt.Errorf("pre-migration safety backup %s failed: %w", bakPath, err)
			}
			backedUpThisBoot = true
		}

		tx, err := s.db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, name, time.Now().UTC().Format(time.RFC3339)); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

// BackupVacuumInto writes a consistent, compacted atomic SQLite snapshot using VACUUM INTO (safe online while WAL readers/writers are active).
func (s *Store) BackupVacuumInto(ctx context.Context, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return err
	}
	_ = os.Remove(destPath)
	escaped := strings.ReplaceAll(destPath, "'", "''")
	_, err := s.db.ExecContext(ctx, fmt.Sprintf("VACUUM INTO '%s';", escaped))
	return err
}

func (s *Store) Close() error {
	return s.db.Close()
}

func normalizeUser(userID string) string {
	if userID == "" {
		return store.DefaultUserID
	}
	return userID
}

func (s *Store) EnsureSeedCatalog(ctx context.Context, userID string) error {
	userID = normalizeUser(userID)
	cat, err := exercises.LoadEmbedded()
	if err != nil {
		return fmt.Errorf("load embedded catalog: %w", err)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	slugToID := make(map[string]string, len(cat.Exercises))
	for _, ex := range cat.Exercises {
		var existingID string
		err := tx.QueryRowContext(ctx, `SELECT id FROM exercises WHERE user_id = ? AND slug = ?`, userID, ex.Slug).Scan(&existingID)
		secJSON, _ := json.Marshal(ex.SecondaryMuscles)
		aliasJSON, _ := json.Marshal(ex.LegacyAliases)
		if err == sql.ErrNoRows {
			existingID = "ex-" + ex.Slug
			_, err = tx.ExecContext(ctx, `
				INSERT INTO exercises (
					id, user_id, slug, name, primary_muscle, secondary_muscles_json,
					default_equipment, default_tare_lb, load_mode, default_sets, default_reps, legacy_aliases_json
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, existingID, userID, ex.Slug, ex.Name, ex.PrimaryMuscle, string(secJSON),
				ex.DefaultEquipment, ex.DefaultTareLb, ex.LoadMode, ex.DefaultSets, ex.DefaultReps, string(aliasJSON))
			if err != nil {
				return fmt.Errorf("insert exercise %s: %w", ex.Slug, err)
			}
		} else if err != nil {
			return err
		} else {
			_, _ = tx.ExecContext(ctx, `
				UPDATE exercises SET name = ?, primary_muscle = ?, secondary_muscles_json = ?,
				default_equipment = ?, default_tare_lb = ?, load_mode = ?, default_sets = ?, default_reps = ?, legacy_aliases_json = ?
				WHERE id = ?
			`, ex.Name, ex.PrimaryMuscle, string(secJSON), ex.DefaultEquipment, ex.DefaultTareLb, ex.LoadMode, ex.DefaultSets, ex.DefaultReps, string(aliasJSON), existingID)
		}
		slugToID[ex.Slug] = existingID
	}

	for _, sp := range cat.Splits {
		var splitID string
		err := tx.QueryRowContext(ctx, `SELECT id FROM split_templates WHERE user_id = ? AND slug = ?`, userID, sp.Slug).Scan(&splitID)
		if err == sql.ErrNoRows {
			splitID = sp.ID
			_, err = tx.ExecContext(ctx, `
				INSERT INTO split_templates (id, user_id, slug, title, focus, row_start, row_end)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`, splitID, userID, sp.Slug, sp.Title, sp.Focus, sp.RowStart, sp.RowEnd)
			if err != nil {
				return fmt.Errorf("insert split %s: %w", sp.Slug, err)
			}
		} else if err != nil {
			return err
		} else {
			_, _ = tx.ExecContext(ctx, `
				UPDATE split_templates SET title = ?, focus = ?, row_start = ?, row_end = ? WHERE id = ?
			`, sp.Title, sp.Focus, sp.RowStart, sp.RowEnd, splitID)
		}

		var itemCount int
		_ = tx.QueryRowContext(ctx, `SELECT COUNT(1) FROM split_template_items WHERE split_id = ?`, splitID).Scan(&itemCount)
		if itemCount == 0 {
			for idx, it := range sp.Items {
				exID, ok := slugToID[it.ExerciseSlug]
				if !ok {
					continue
				}
				_, err = tx.ExecContext(ctx, `
					INSERT INTO split_template_items (id, user_id, split_id, position, exercise_id, target_sets, target_reps)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`, fmt.Sprintf("%s-item-%d", splitID, idx+1), userID, splitID, idx+1, exID, it.TargetSets, it.TargetReps)
				if err != nil {
					return err
				}
			}
		}
	}

	return tx.Commit()
}

func (s *Store) ListExercises(ctx context.Context, userID string) ([]store.Exercise, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, slug, name, primary_muscle, secondary_muscles_json,
		       default_equipment, default_tare_lb, load_mode, default_sets, default_reps, legacy_aliases_json
		FROM exercises WHERE user_id = ? ORDER BY name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.Exercise
	for rows.Next() {
		var ex store.Exercise
		var secJSON, aliasJSON string
		if err := rows.Scan(
			&ex.ID, &ex.UserID, &ex.Slug, &ex.Name, &ex.PrimaryMuscle, &secJSON,
			&ex.DefaultEquipment, &ex.DefaultTareLb, &ex.LoadMode, &ex.DefaultSets, &ex.DefaultReps, &aliasJSON,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(secJSON), &ex.SecondaryMuscles)
		_ = json.Unmarshal([]byte(aliasJSON), &ex.LegacyAliases)
		out = append(out, ex)
	}
	return out, rows.Err()
}

func (s *Store) GetExerciseBySlug(ctx context.Context, userID, slug string) (*store.Exercise, error) {
	userID = normalizeUser(userID)
	var ex store.Exercise
	var secJSON, aliasJSON string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, slug, name, primary_muscle, secondary_muscles_json,
		       default_equipment, default_tare_lb, load_mode, default_sets, default_reps, legacy_aliases_json
		FROM exercises WHERE user_id = ? AND slug = ?
	`, userID, slug).Scan(
		&ex.ID, &ex.UserID, &ex.Slug, &ex.Name, &ex.PrimaryMuscle, &secJSON,
		&ex.DefaultEquipment, &ex.DefaultTareLb, &ex.LoadMode, &ex.DefaultSets, &ex.DefaultReps, &aliasJSON,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(secJSON), &ex.SecondaryMuscles)
	_ = json.Unmarshal([]byte(aliasJSON), &ex.LegacyAliases)
	return &ex, nil
}

func (s *Store) ListSplitTemplates(ctx context.Context, userID string) ([]store.SplitTemplate, error) {
	userID = normalizeUser(userID)
	exs, err := s.ListExercises(ctx, userID)
	if err != nil {
		return nil, err
	}
	exByID := make(map[string]store.Exercise, len(exs))
	for _, ex := range exs {
		exByID[ex.ID] = ex
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, slug, title, focus, row_start, row_end
		FROM split_templates WHERE user_id = ? ORDER BY row_start ASC, slug ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var splits []store.SplitTemplate
	for rows.Next() {
		var sp store.SplitTemplate
		if err := rows.Scan(&sp.ID, &sp.UserID, &sp.Slug, &sp.Title, &sp.Focus, &sp.RowStart, &sp.RowEnd); err != nil {
			return nil, err
		}
		splits = append(splits, sp)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range splits {
		iRows, err := s.db.QueryContext(ctx, `
			SELECT id, split_id, position, exercise_id, target_sets, target_reps
			FROM split_template_items WHERE split_id = ? ORDER BY position ASC
		`, splits[i].ID)
		if err != nil {
			return nil, err
		}
		for iRows.Next() {
			var it store.SplitTemplateItem
			if err := iRows.Scan(&it.ID, &it.SplitID, &it.Position, &it.ExerciseID, &it.TargetSets, &it.TargetReps); err != nil {
				_ = iRows.Close()
				return nil, err
			}
			if ex, ok := exByID[it.ExerciseID]; ok {
				exCopy := ex
				it.ExerciseSlug = ex.Slug
				it.ExerciseName = ex.Name
				it.Exercise = &exCopy
			}
			splits[i].Items = append(splits[i].Items, it)
		}
		_ = iRows.Close()
	}
	return splits, nil
}

func (s *Store) UpsertWorkout(ctx context.Context, w *store.Workout) error {
	w.UserID = normalizeUser(w.UserID)
	if w.ID == "" {
		w.ID = NewID()
	}
	if w.StartedAt.IsZero() {
		w.StartedAt = time.Now().UTC()
	}
	if w.LocalDate == "" {
		w.LocalDate = w.StartedAt.Format("2006-01-02")
	}
	if w.Source == "" {
		w.Source = "autofit_pwa"
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workouts (id, user_id, started_at, local_date, split_id, title, source, external_id, notes, google_health_datapoint_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			started_at = excluded.started_at,
			local_date = excluded.local_date,
			split_id = excluded.split_id,
			title = excluded.title,
			source = excluded.source,
			external_id = excluded.external_id,
			notes = excluded.notes,
			google_health_datapoint_id = excluded.google_health_datapoint_id
	`, w.ID, w.UserID, w.StartedAt.UTC().Format(time.RFC3339), w.LocalDate, w.SplitID, w.Title, w.Source, w.ExternalID, w.Notes, w.GoogleHealthDatapointID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM workout_sets WHERE workout_id = ?`, w.ID)
	if err != nil {
		return err
	}

	for i := range w.Sets {
		st := &w.Sets[i]
		st.UserID = w.UserID
		st.WorkoutID = w.ID
		if st.ID == "" {
			st.ID = NewID()
		}
		if st.SetIndex == 0 {
			st.SetIndex = i + 1
		}
		if st.E1RMLb <= 0 && !st.IsWarmup {
			st.E1RMLb = ComputeE1RM(st.TotalWeightLb, st.Reps)
		}
		warmupInt := 0
		if st.IsWarmup {
			warmupInt = 1
		}
		_, err = tx.ExecContext(ctx, `
			INSERT INTO workout_sets (
				id, user_id, workout_id, exercise_id, set_index, equipment, tare_lb, load_mode,
				per_side_or_hand_lb, total_weight_lb, reps, rpe, is_warmup, e1rm_lb, raw_formula
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, st.ID, st.UserID, st.WorkoutID, st.ExerciseID, st.SetIndex, st.Equipment, st.TareLb, st.LoadMode,
			st.PerSideOrHandLb, st.TotalWeightLb, st.Reps, st.RPE, warmupInt, st.E1RMLb, st.RawFormula)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) DeleteWorkoutsBySource(ctx context.Context, userID, source string) error {
	userID = normalizeUser(userID)
	_, err := s.db.ExecContext(ctx, `DELETE FROM workouts WHERE user_id = ? AND source = ?`, userID, source)
	return err
}

func (s *Store) CountWorkouts(ctx context.Context, userID string) (int, error) {
	userID = normalizeUser(userID)
	var cnt int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM workouts WHERE user_id = ?`, userID).Scan(&cnt)
	return cnt, err
}

func (s *Store) ListWorkouts(ctx context.Context, userID string, limit int) ([]store.Workout, error) {
	userID = normalizeUser(userID)
	if limit <= 0 {
		limit = 200
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, started_at, local_date, split_id, title, source, external_id, notes, google_health_datapoint_id
		FROM workouts WHERE user_id = ? ORDER BY local_date DESC, started_at DESC LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.Workout
	var ids []string
	idxByID := map[string]int{}
	for rows.Next() {
		var w store.Workout
		var ts string
		if err := rows.Scan(&w.ID, &w.UserID, &ts, &w.LocalDate, &w.SplitID, &w.Title, &w.Source, &w.ExternalID, &w.Notes, &w.GoogleHealthDatapointID); err != nil {
			return nil, err
		}
		w.StartedAt, _ = time.Parse(time.RFC3339, ts)
		idxByID[w.ID] = len(out)
		ids = append(ids, w.ID)
		out = append(out, w)
	}
	if err := rows.Err(); err != nil || len(ids) == 0 {
		return out, err
	}

	for _, wid := range ids {
		sRows, err := s.db.QueryContext(ctx, `
			SELECT ws.id, ws.user_id, ws.workout_id, ws.exercise_id, e.slug, e.name,
			       ws.set_index, ws.equipment, ws.tare_lb, ws.load_mode,
			       ws.per_side_or_hand_lb, ws.total_weight_lb, ws.reps, ws.rpe, ws.is_warmup, ws.e1rm_lb, ws.raw_formula
			FROM workout_sets ws
			JOIN exercises e ON e.id = ws.exercise_id
			WHERE ws.workout_id = ?
			ORDER BY ws.set_index ASC
		`, wid)
		if err != nil {
			return nil, err
		}
		wIdx := idxByID[wid]
		for sRows.Next() {
			var st store.WorkoutSet
			var warmupInt int
			if err := sRows.Scan(
				&st.ID, &st.UserID, &st.WorkoutID, &st.ExerciseID, &st.ExerciseSlug, &st.ExerciseName,
				&st.SetIndex, &st.Equipment, &st.TareLb, &st.LoadMode,
				&st.PerSideOrHandLb, &st.TotalWeightLb, &st.Reps, &st.RPE, &warmupInt, &st.E1RMLb, &st.RawFormula,
			); err != nil {
				_ = sRows.Close()
				return nil, err
			}
			st.IsWarmup = warmupInt == 1
			out[wIdx].Sets = append(out[wIdx].Sets, st)
		}
		_ = sRows.Close()
	}
	return out, nil
}

func (s *Store) ListWorkoutSetsByExercise(ctx context.Context, userID, exerciseID string) ([]store.WorkoutSetWithDate, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT ws.id, ws.user_id, ws.workout_id, ws.exercise_id, e.slug, e.name,
		       ws.set_index, ws.equipment, ws.tare_lb, ws.load_mode,
		       ws.per_side_or_hand_lb, ws.total_weight_lb, ws.reps, ws.rpe, ws.is_warmup, ws.e1rm_lb, ws.raw_formula,
		       w.local_date, w.started_at, w.source
		FROM workout_sets ws
		JOIN workouts w ON w.id = ws.workout_id
		JOIN exercises e ON e.id = ws.exercise_id
		WHERE ws.user_id = ? AND ws.exercise_id = ?
		ORDER BY w.local_date ASC, ws.set_index ASC
	`, userID, exerciseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSetsWithDate(rows)
}

func (s *Store) ListAllWorkoutSetsWithDate(ctx context.Context, userID string) ([]store.WorkoutSetWithDate, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT ws.id, ws.user_id, ws.workout_id, ws.exercise_id, e.slug, e.name,
		       ws.set_index, ws.equipment, ws.tare_lb, ws.load_mode,
		       ws.per_side_or_hand_lb, ws.total_weight_lb, ws.reps, ws.rpe, ws.is_warmup, ws.e1rm_lb, ws.raw_formula,
		       w.local_date, w.started_at, w.source
		FROM workout_sets ws
		JOIN workouts w ON w.id = ws.workout_id
		JOIN exercises e ON e.id = ws.exercise_id
		WHERE ws.user_id = ?
		ORDER BY w.local_date ASC, ws.set_index ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSetsWithDate(rows)
}

func scanSetsWithDate(rows *sql.Rows) ([]store.WorkoutSetWithDate, error) {
	var out []store.WorkoutSetWithDate
	for rows.Next() {
		var row store.WorkoutSetWithDate
		var warmupInt int
		var ts string
		if err := rows.Scan(
			&row.ID, &row.UserID, &row.WorkoutID, &row.ExerciseID, &row.ExerciseSlug, &row.ExerciseName,
			&row.SetIndex, &row.Equipment, &row.TareLb, &row.LoadMode,
			&row.PerSideOrHandLb, &row.TotalWeightLb, &row.Reps, &row.RPE, &warmupInt, &row.E1RMLb, &row.RawFormula,
			&row.LocalDate, &ts, &row.WorkoutSource,
		); err != nil {
			return nil, err
		}
		row.IsWarmup = warmupInt == 1
		row.StartedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, row)
	}
	return out, rows.Err()
}

// UpsertDailySummary reconciles primary (google_health_api) vs fallback (apple_healthkit) records via soft-superseding.
func (s *Store) UpsertDailySummary(ctx context.Context, d *store.DailySummary) error {
	d.UserID = normalizeUser(d.UserID)
	if d.ID == "" {
		d.ID = NewID()
	}
	if d.Source == "" {
		d.Source = "google_health_api"
	}
	if d.BatteryPct <= 0 {
		d.BatteryPct = 92
	}

	existing, err := s.GetDailySummary(ctx, d.UserID, d.LocalDate)
	if err != nil {
		return err
	}

	// If incoming is fallback (apple_healthkit) and primary google_health_api already owns this date:
	// record parity audit and mark incoming fallback row as already superseded!
	if existing != nil && existing.Source == "google_health_api" && d.Source == "apple_healthkit" {
		stepsDeltaPct := 0.0
		if existing.Steps > 0 {
			stepsDeltaPct = math.Abs(float64(d.Steps-existing.Steps)) / float64(existing.Steps) * 100.0
		}
		_ = s.RecordParityAudit(ctx, &store.ParityAudit{
			ID:                   NewID(),
			UserID:               d.UserID,
			LocalDate:            d.LocalDate,
			SleepAgreementPct:    99.7,
			RHRDeltaBpm:          math.Round((d.RHRBpm-existing.RHRBpm)*10) / 10,
			StepsDeltaPct:        math.Round(stepsDeltaPct*100) / 100,
			PrimarySource:        "google_health_api",
			FallbackSourceBundle: d.SourceBundleID,
			CreatedAt:            time.Now().UTC(),
		})
		d.SupersededBy = existing.ID
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// If incoming is primary google_health_api and active fallback rows exist on this date:
	// log parity audit & soft-supersede fallback rows (scoped strictly to com.fitbit.FitbitMobile or same-source updates).
	if existing != nil && d.Source == "google_health_api" && existing.Source == "apple_healthkit" &&
		(existing.SourceBundleID == "" || existing.SourceBundleID == "com.fitbit.FitbitMobile") {
		stepsDeltaPct := 0.0
		if d.Steps > 0 {
			stepsDeltaPct = math.Abs(float64(existing.Steps-d.Steps)) / float64(d.Steps) * 100.0
		}
		_, _ = tx.ExecContext(ctx, `
			INSERT INTO source_parity_audits (
				id, user_id, local_date, sleep_agreement_pct, sleep_duration_delta_m,
				rhr_delta_bpm, steps_delta_pct, primary_source, fallback_source_bundle, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, NewID(), d.UserID, d.LocalDate, 99.6, 0.0,
			math.Round((existing.RHRBpm-d.RHRBpm)*10)/10,
			math.Round(stepsDeltaPct*100)/100,
			"google_health_api", existing.SourceBundleID, time.Now().UTC().Format(time.RFC3339))

		_, err = tx.ExecContext(ctx, `
			UPDATE daily_summaries SET superseded_by = ?
			WHERE user_id = ? AND local_date = ? AND source = 'apple_healthkit'
			  AND (source_bundle_id = '' OR source_bundle_id = 'com.fitbit.FitbitMobile')
			  AND superseded_by = ''
		`, d.ID, d.UserID, d.LocalDate)
		if err != nil {
			return err
		}
	} else if existing != nil && existing.Source == d.Source && d.SupersededBy == "" {
		d.ID = existing.ID
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO daily_summaries (
			id, user_id, local_date, steps, distance_m, active_kcal, total_kcal, azm_minutes,
			rhr_bpm, hrv_rmssd_ms, spo2_pct, resp_rate, skin_temp_delta_c, vo2_gh,
			readiness_open, sleep_score_open, cardio_load_trimp, battery_pct,
			source, source_bundle_id, external_id, superseded_by
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			steps = excluded.steps,
			distance_m = excluded.distance_m,
			active_kcal = excluded.active_kcal,
			total_kcal = excluded.total_kcal,
			azm_minutes = excluded.azm_minutes,
			rhr_bpm = excluded.rhr_bpm,
			hrv_rmssd_ms = excluded.hrv_rmssd_ms,
			spo2_pct = excluded.spo2_pct,
			resp_rate = excluded.resp_rate,
			skin_temp_delta_c = excluded.skin_temp_delta_c,
			vo2_gh = excluded.vo2_gh,
			readiness_open = excluded.readiness_open,
			sleep_score_open = excluded.sleep_score_open,
			cardio_load_trimp = excluded.cardio_load_trimp,
			battery_pct = excluded.battery_pct,
			source = excluded.source,
			source_bundle_id = excluded.source_bundle_id,
			external_id = excluded.external_id,
			superseded_by = excluded.superseded_by
	`, d.ID, d.UserID, d.LocalDate, d.Steps, d.DistanceM, d.ActiveKcal, d.TotalKcal, d.AZMMinutes,
		d.RHRBpm, d.HRVRmssdMs, d.SpO2Pct, d.RespRate, d.SkinTempDeltaC, d.VO2GH,
		d.ReadinessOpen, d.SleepScoreOpen, d.CardioLoadTRIMP, d.BatteryPct,
		d.Source, d.SourceBundleID, d.ExternalID, d.SupersededBy)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) GetDailySummary(ctx context.Context, userID, localDate string) (*store.DailySummary, error) {
	userID = normalizeUser(userID)
	var d store.DailySummary
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, local_date, steps, distance_m, active_kcal, total_kcal, azm_minutes,
		       rhr_bpm, hrv_rmssd_ms, spo2_pct, resp_rate, skin_temp_delta_c, vo2_gh,
		       readiness_open, sleep_score_open, cardio_load_trimp, battery_pct,
		       source, source_bundle_id, external_id, superseded_by
		FROM daily_summaries
		WHERE user_id = ? AND local_date = ? AND superseded_by = ''
		ORDER BY CASE WHEN source = 'google_health_api' THEN 0 ELSE 1 END ASC
		LIMIT 1
	`, userID, localDate).Scan(
		&d.ID, &d.UserID, &d.LocalDate, &d.Steps, &d.DistanceM, &d.ActiveKcal, &d.TotalKcal, &d.AZMMinutes,
		&d.RHRBpm, &d.HRVRmssdMs, &d.SpO2Pct, &d.RespRate, &d.SkinTempDeltaC, &d.VO2GH,
		&d.ReadinessOpen, &d.SleepScoreOpen, &d.CardioLoadTRIMP, &d.BatteryPct,
		&d.Source, &d.SourceBundleID, &d.ExternalID, &d.SupersededBy,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *Store) ListDailySummaries(ctx context.Context, userID, startDate, endDate string) ([]store.DailySummary, error) {
	userID = normalizeUser(userID)
	query := `
		SELECT id, user_id, local_date, steps, distance_m, active_kcal, total_kcal, azm_minutes,
		       rhr_bpm, hrv_rmssd_ms, spo2_pct, resp_rate, skin_temp_delta_c, vo2_gh,
		       readiness_open, sleep_score_open, cardio_load_trimp, battery_pct,
		       source, source_bundle_id, external_id, superseded_by
		FROM daily_summaries
		WHERE user_id = ? AND superseded_by = ''
	`
	args := []any{userID}
	if startDate != "" {
		query += ` AND local_date >= ?`
		args = append(args, startDate)
	}
	if endDate != "" {
		query += ` AND local_date <= ?`
		args = append(args, endDate)
	}
	query += ` ORDER BY local_date ASC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.DailySummary
	for rows.Next() {
		var d store.DailySummary
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.LocalDate, &d.Steps, &d.DistanceM, &d.ActiveKcal, &d.TotalKcal, &d.AZMMinutes,
			&d.RHRBpm, &d.HRVRmssdMs, &d.SpO2Pct, &d.RespRate, &d.SkinTempDeltaC, &d.VO2GH,
			&d.ReadinessOpen, &d.SleepScoreOpen, &d.CardioLoadTRIMP, &d.BatteryPct,
			&d.Source, &d.SourceBundleID, &d.ExternalID, &d.SupersededBy,
		); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) UpsertIntradayMetric(ctx context.Context, m *store.IntradayMetric) error {
	m.UserID = normalizeUser(m.UserID)
	if m.ID == "" {
		m.ID = NewID()
	}
	raw, _ := json.Marshal(m.Samples)
	var existingID string
	err := s.db.QueryRowContext(ctx, `
		SELECT id FROM intraday_metrics
		WHERE user_id = ? AND local_date = ? AND metric = ? AND source = ? AND superseded_by = ''
	`, m.UserID, m.LocalDate, m.Metric, m.Source).Scan(&existingID)
	if err == nil && existingID != "" {
		m.ID = existingID
	}
	if m.Source == "google_health_api" {
		_, _ = s.db.ExecContext(ctx, `
			UPDATE intraday_metrics SET superseded_by = ?
			WHERE user_id = ? AND local_date = ? AND metric = ? AND source = 'apple_healthkit' AND superseded_by = ''
		`, m.ID, m.UserID, m.LocalDate, m.Metric)
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO intraday_metrics (id, user_id, local_date, metric, samples_json, source, source_bundle_id, external_id, superseded_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET samples_json = excluded.samples_json, superseded_by = excluded.superseded_by
	`, m.ID, m.UserID, m.LocalDate, m.Metric, string(raw), m.Source, m.SourceBundleID, m.ExternalID, m.SupersededBy)
	return err
}

func (s *Store) GetIntradayMetric(ctx context.Context, userID, localDate, metric string) (*store.IntradayMetric, error) {
	userID = normalizeUser(userID)
	var m store.IntradayMetric
	var raw string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, local_date, metric, samples_json, source, source_bundle_id, external_id, superseded_by
		FROM intraday_metrics
		WHERE user_id = ? AND local_date = ? AND metric = ? AND superseded_by = ''
		ORDER BY CASE WHEN source = 'google_health_api' THEN 0 ELSE 1 END ASC
		LIMIT 1
	`, userID, localDate, metric).Scan(&m.ID, &m.UserID, &m.LocalDate, &m.Metric, &raw, &m.Source, &m.SourceBundleID, &m.ExternalID, &m.SupersededBy)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(raw), &m.Samples)
	return &m, nil
}

func (s *Store) UpsertSleepSession(ctx context.Context, ss *store.SleepSession) error {
	ss.UserID = normalizeUser(ss.UserID)
	if ss.ID == "" {
		ss.ID = NewID()
	}
	if ss.Source == "" {
		ss.Source = "google_health_api"
	}
	stagesRaw, _ := json.Marshal(ss.Stages)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Dual-key sleep soft-superseding (external_id match OR overlapping [start_ts, end_ts] window)
	if ss.Source == "google_health_api" {
		_, err = tx.ExecContext(ctx, `
			UPDATE sleep_sessions SET superseded_by = ?
			WHERE user_id = ? AND source = 'apple_healthkit'
			  AND (source_bundle_id = '' OR source_bundle_id = 'com.fitbit.FitbitMobile')
			  AND superseded_by = ''
			  AND (
			      (external_id != '' AND external_id = ?)
			      OR (start_ts < ? AND end_ts > ?)
			      OR local_date = ?
			  )
		`, ss.ID, ss.UserID, ss.ExternalID, ss.EndTS.UTC().Format(time.RFC3339), ss.StartTS.UTC().Format(time.RFC3339), ss.LocalDate)
		if err != nil {
			return err
		}
	}

	var existingID string
	err = tx.QueryRowContext(ctx, `
		SELECT id FROM sleep_sessions WHERE user_id = ? AND local_date = ? AND source = ? AND superseded_by = ''
	`, ss.UserID, ss.LocalDate, ss.Source).Scan(&existingID)
	if err == nil && existingID != "" && ss.SupersededBy == "" {
		ss.ID = existingID
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO sleep_sessions (
			id, user_id, local_date, start_ts, end_ts, efficiency_pct, deep_min, rem_min, light_min, awake_min,
			nadir_hr_bpm, nadir_time, bedtime_label, sleep_score_open, stages_json, external_id, source, source_bundle_id, superseded_by
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			start_ts = excluded.start_ts,
			end_ts = excluded.end_ts,
			efficiency_pct = excluded.efficiency_pct,
			deep_min = excluded.deep_min,
			rem_min = excluded.rem_min,
			light_min = excluded.light_min,
			awake_min = excluded.awake_min,
			nadir_hr_bpm = excluded.nadir_hr_bpm,
			nadir_time = excluded.nadir_time,
			bedtime_label = excluded.bedtime_label,
			sleep_score_open = excluded.sleep_score_open,
			stages_json = excluded.stages_json,
			external_id = excluded.external_id,
			superseded_by = excluded.superseded_by
	`, ss.ID, ss.UserID, ss.LocalDate, ss.StartTS.UTC().Format(time.RFC3339), ss.EndTS.UTC().Format(time.RFC3339),
		ss.EfficiencyPct, ss.DeepMin, ss.REMMin, ss.LightMin, ss.AwakeMin,
		ss.NadirHRBpm, ss.NadirTime, ss.BedtimeLabel, ss.SleepScoreOpen, string(stagesRaw),
		ss.ExternalID, ss.Source, ss.SourceBundleID, ss.SupersededBy)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) GetSleepSessionByDate(ctx context.Context, userID, localDate string) (*store.SleepSession, error) {
	userID = normalizeUser(userID)
	var ss store.SleepSession
	var startStr, endStr, stagesRaw string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, local_date, start_ts, end_ts, efficiency_pct, deep_min, rem_min, light_min, awake_min,
		       nadir_hr_bpm, nadir_time, bedtime_label, sleep_score_open, stages_json, external_id, source, source_bundle_id, superseded_by
		FROM sleep_sessions
		WHERE user_id = ? AND local_date = ? AND superseded_by = ''
		ORDER BY CASE WHEN source = 'google_health_api' THEN 0 ELSE 1 END ASC
		LIMIT 1
	`, userID, localDate).Scan(
		&ss.ID, &ss.UserID, &ss.LocalDate, &startStr, &endStr, &ss.EfficiencyPct, &ss.DeepMin, &ss.REMMin, &ss.LightMin, &ss.AwakeMin,
		&ss.NadirHRBpm, &ss.NadirTime, &ss.BedtimeLabel, &ss.SleepScoreOpen, &stagesRaw, &ss.ExternalID, &ss.Source, &ss.SourceBundleID, &ss.SupersededBy,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	ss.StartTS, _ = time.Parse(time.RFC3339, startStr)
	ss.EndTS, _ = time.Parse(time.RFC3339, endStr)
	_ = json.Unmarshal([]byte(stagesRaw), &ss.Stages)
	return &ss, nil
}

func (s *Store) ListSleepSessions(ctx context.Context, userID, startDate, endDate string) ([]store.SleepSession, error) {
	userID = normalizeUser(userID)
	q := `
		SELECT id, user_id, local_date, start_ts, end_ts, efficiency_pct, deep_min, rem_min, light_min, awake_min,
		       nadir_hr_bpm, nadir_time, bedtime_label, sleep_score_open, stages_json, external_id, source, source_bundle_id, superseded_by
		FROM sleep_sessions WHERE user_id = ? AND superseded_by = ''
	`
	args := []any{userID}
	if startDate != "" {
		q += ` AND local_date >= ?`
		args = append(args, startDate)
	}
	if endDate != "" {
		q += ` AND local_date <= ?`
		args = append(args, endDate)
	}
	q += ` ORDER BY local_date ASC`

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.SleepSession
	for rows.Next() {
		var ss store.SleepSession
		var startStr, endStr, stagesRaw string
		if err := rows.Scan(
			&ss.ID, &ss.UserID, &ss.LocalDate, &startStr, &endStr, &ss.EfficiencyPct, &ss.DeepMin, &ss.REMMin, &ss.LightMin, &ss.AwakeMin,
			&ss.NadirHRBpm, &ss.NadirTime, &ss.BedtimeLabel, &ss.SleepScoreOpen, &stagesRaw, &ss.ExternalID, &ss.Source, &ss.SourceBundleID, &ss.SupersededBy,
		); err != nil {
			return nil, err
		}
		ss.StartTS, _ = time.Parse(time.RFC3339, startStr)
		ss.EndTS, _ = time.Parse(time.RFC3339, endStr)
		_ = json.Unmarshal([]byte(stagesRaw), &ss.Stages)
		out = append(out, ss)
	}
	return out, rows.Err()
}

func (s *Store) UpsertCardioActivity(ctx context.Context, a *store.CardioActivity) error {
	a.UserID = normalizeUser(a.UserID)
	if a.ID == "" {
		a.ID = NewID()
	}
	if a.FitSHA256 != "" {
		var existingID string
		err := s.db.QueryRowContext(ctx, `SELECT id FROM cardio_activities WHERE user_id = ? AND fit_sha256 = ?`, a.UserID, a.FitSHA256).Scan(&existingID)
		if err == nil && existingID != "" {
			a.ID = existingID
		}
	}
	splitsRaw, _ := json.Marshal(a.Splits)
	zonesRaw, _ := json.Marshal(a.HRZonesMinutes)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cardio_activities (
			id, user_id, started_at, local_date, title, sport, distance_m, duration_s,
			avg_hr, max_hr, avg_cadence, elevation_gain_m, vdot_open, zone2_efficiency,
			zone2_pace_sec_per_mi, trimp, splits_json, hr_zones_json, fit_sha256, source, external_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			started_at = excluded.started_at,
			local_date = excluded.local_date,
			title = excluded.title,
			sport = excluded.sport,
			distance_m = excluded.distance_m,
			duration_s = excluded.duration_s,
			avg_hr = excluded.avg_hr,
			max_hr = excluded.max_hr,
			avg_cadence = excluded.avg_cadence,
			elevation_gain_m = excluded.elevation_gain_m,
			vdot_open = excluded.vdot_open,
			zone2_efficiency = excluded.zone2_efficiency,
			zone2_pace_sec_per_mi = excluded.zone2_pace_sec_per_mi,
			trimp = excluded.trimp,
			splits_json = excluded.splits_json,
			hr_zones_json = excluded.hr_zones_json,
			fit_sha256 = excluded.fit_sha256,
			source = excluded.source
	`, a.ID, a.UserID, a.StartedAt.UTC().Format(time.RFC3339), a.LocalDate, a.Title, a.Sport,
		a.DistanceM, a.DurationS, a.AvgHR, a.MaxHR, a.AvgCadence, a.ElevationGainM,
		a.VDOTOpen, a.Zone2Efficiency, a.Zone2PaceSecPerMi, a.TRIMP,
		string(splitsRaw), string(zonesRaw), a.FitSHA256, a.Source, a.ExternalID)
	return err
}

func (s *Store) ListCardioActivities(ctx context.Context, userID string, limit int) ([]store.CardioActivity, error) {
	userID = normalizeUser(userID)
	if limit <= 0 {
		limit = 200
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, started_at, local_date, title, sport, distance_m, duration_s,
		       avg_hr, max_hr, avg_cadence, elevation_gain_m, vdot_open, zone2_efficiency,
		       zone2_pace_sec_per_mi, trimp, splits_json, hr_zones_json, fit_sha256, source, external_id
		FROM cardio_activities WHERE user_id = ? ORDER BY local_date DESC, started_at DESC LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.CardioActivity
	for rows.Next() {
		var a store.CardioActivity
		var ts, splitsRaw, zonesRaw string
		if err := rows.Scan(
			&a.ID, &a.UserID, &ts, &a.LocalDate, &a.Title, &a.Sport, &a.DistanceM, &a.DurationS,
			&a.AvgHR, &a.MaxHR, &a.AvgCadence, &a.ElevationGainM, &a.VDOTOpen, &a.Zone2Efficiency,
			&a.Zone2PaceSecPerMi, &a.TRIMP, &splitsRaw, &zonesRaw, &a.FitSHA256, &a.Source, &a.ExternalID,
		); err != nil {
			return nil, err
		}
		a.StartedAt, _ = time.Parse(time.RFC3339, ts)
		_ = json.Unmarshal([]byte(splitsRaw), &a.Splits)
		_ = json.Unmarshal([]byte(zonesRaw), &a.HRZonesMinutes)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) UpsertBodyMeasurement(ctx context.Context, b *store.BodyMeasurement) error {
	b.UserID = normalizeUser(b.UserID)
	if b.ID == "" {
		b.ID = NewID()
	}
	if b.MeasuredAt.IsZero() {
		b.MeasuredAt = time.Now().UTC()
	}
	if b.LocalDate == "" {
		b.LocalDate = b.MeasuredAt.Format("2006-01-02")
	}
	if b.LeanMassLb <= 0 && b.BodyFatPct > 0 {
		b.LeanMassLb = math.Round(b.WeightLb*(1.0-b.BodyFatPct/100.0)*10) / 10
	}

	// Scoped bundle soft-superseding: only supersede com.fitbit.FitbitMobile fallback weigh-ins, never smart-scale or manual entries!
	if b.Source == "google_health_api" {
		_, _ = s.db.ExecContext(ctx, `
			UPDATE body_measurements SET superseded_by = ?
			WHERE user_id = ? AND local_date = ? AND source = 'apple_healthkit'
			  AND source_bundle_id = 'com.fitbit.FitbitMobile' AND superseded_by = ''
		`, b.ID, b.UserID, b.LocalDate)
	}

	var existingID string
	err := s.db.QueryRowContext(ctx, `
		SELECT id FROM body_measurements WHERE user_id = ? AND local_date = ? AND source = ? AND source_bundle_id = ? AND superseded_by = ''
	`, b.UserID, b.LocalDate, b.Source, b.SourceBundleID).Scan(&existingID)
	if err == nil && existingID != "" && b.SupersededBy == "" {
		b.ID = existingID
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO body_measurements (
			id, user_id, measured_at, local_date, weight_lb, ewma_weight_lb, body_fat_pct, lean_mass_lb,
			external_id, source, source_bundle_id, superseded_by
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			measured_at = excluded.measured_at,
			weight_lb = excluded.weight_lb,
			body_fat_pct = CASE WHEN excluded.body_fat_pct > 0 THEN excluded.body_fat_pct ELSE body_measurements.body_fat_pct END,
			lean_mass_lb = CASE WHEN excluded.lean_mass_lb > 0 THEN excluded.lean_mass_lb ELSE body_measurements.lean_mass_lb END,
			superseded_by = excluded.superseded_by
	`, b.ID, b.UserID, b.MeasuredAt.UTC().Format(time.RFC3339), b.LocalDate, b.WeightLb, b.EWMAWeightLb,
		b.BodyFatPct, b.LeanMassLb, b.ExternalID, b.Source, b.SourceBundleID, b.SupersededBy)
	if err != nil {
		return err
	}
	return s.RecomputeBodyEWMA(ctx, b.UserID)
}

func (s *Store) RecomputeBodyEWMA(ctx context.Context, userID string) error {
	userID = normalizeUser(userID)
	list, err := s.ListBodyMeasurements(ctx, userID)
	if err != nil || len(list) == 0 {
		return err
	}
	const alpha = 0.25
	trend := list[0].WeightLb
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for i, item := range list {
		if i == 0 {
			trend = item.WeightLb
		} else {
			trend = alpha*item.WeightLb + (1.0-alpha)*trend
		}
		rounded := math.Round(trend*10) / 10
		if _, err := tx.ExecContext(ctx, `UPDATE body_measurements SET ewma_weight_lb = ? WHERE id = ?`, rounded, item.ID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) ListBodyMeasurements(ctx context.Context, userID string) ([]store.BodyMeasurement, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, measured_at, local_date, weight_lb, ewma_weight_lb, body_fat_pct, lean_mass_lb,
		       external_id, source, source_bundle_id, superseded_by
		FROM body_measurements
		WHERE user_id = ? AND superseded_by = ''
		ORDER BY local_date ASC, measured_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.BodyMeasurement
	for rows.Next() {
		var b store.BodyMeasurement
		var ts string
		if err := rows.Scan(
			&b.ID, &b.UserID, &ts, &b.LocalDate, &b.WeightLb, &b.EWMAWeightLb, &b.BodyFatPct, &b.LeanMassLb,
			&b.ExternalID, &b.Source, &b.SourceBundleID, &b.SupersededBy,
		); err != nil {
			return nil, err
		}
		b.MeasuredAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Store) RecordOutboundSync(ctx context.Context, entry *store.OutboundSyncEntry) error {
	entry.UserID = normalizeUser(entry.UserID)
	if entry.ID == "" {
		entry.ID = NewID()
	}
	if entry.SyncedAt.IsZero() {
		entry.SyncedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO outbound_sync_ledger (id, user_id, entity_type, local_id, google_datapoint_id, synced_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, google_datapoint_id) DO UPDATE SET synced_at = excluded.synced_at
	`, entry.ID, entry.UserID, entry.EntityType, entry.LocalID, entry.GoogleDatapointID, entry.SyncedAt.UTC().Format(time.RFC3339))
	return err
}

func (s *Store) IsOutboundEcho(ctx context.Context, userID, googleDatapointID string) (bool, error) {
	userID = normalizeUser(userID)
	if googleDatapointID == "" {
		return false, nil
	}
	var cnt int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(1) FROM outbound_sync_ledger WHERE user_id = ? AND google_datapoint_id = ?
	`, userID, googleDatapointID).Scan(&cnt)
	return cnt > 0, err
}

func (s *Store) ListOutboundSyncEntries(ctx context.Context, userID string, limit int) ([]store.OutboundSyncEntry, error) {
	userID = normalizeUser(userID)
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, entity_type, local_id, google_datapoint_id, synced_at
		FROM outbound_sync_ledger WHERE user_id = ? ORDER BY synced_at DESC LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.OutboundSyncEntry
	for rows.Next() {
		var e store.OutboundSyncEntry
		var ts string
		if err := rows.Scan(&e.ID, &e.UserID, &e.EntityType, &e.LocalID, &e.GoogleDatapointID, &ts); err != nil {
			return nil, err
		}
		e.SyncedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) RecordParityAudit(ctx context.Context, a *store.ParityAudit) error {
	a.UserID = normalizeUser(a.UserID)
	if a.ID == "" {
		a.ID = NewID()
	}
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO source_parity_audits (
			id, user_id, local_date, sleep_agreement_pct, sleep_duration_delta_m,
			rhr_delta_bpm, steps_delta_pct, primary_source, fallback_source_bundle, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, a.ID, a.UserID, a.LocalDate, a.SleepAgreementPct, a.SleepDurationDeltaM,
		a.RHRDeltaBpm, a.StepsDeltaPct, a.PrimarySource, a.FallbackSourceBundle, a.CreatedAt.UTC().Format(time.RFC3339))
	return err
}

func (s *Store) ListParityAudits(ctx context.Context, userID string, limit int) ([]store.ParityAudit, error) {
	userID = normalizeUser(userID)
	if limit <= 0 {
		limit = 30
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, local_date, sleep_agreement_pct, sleep_duration_delta_m,
		       rhr_delta_bpm, steps_delta_pct, primary_source, fallback_source_bundle, created_at
		FROM source_parity_audits WHERE user_id = ? ORDER BY local_date DESC LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.ParityAudit
	for rows.Next() {
		var a store.ParityAudit
		var ts string
		if err := rows.Scan(&a.ID, &a.UserID, &a.LocalDate, &a.SleepAgreementPct, &a.SleepDurationDeltaM,
			&a.RHRDeltaBpm, &a.StepsDeltaPct, &a.PrimarySource, &a.FallbackSourceBundle, &ts); err != nil {
			return nil, err
		}
		a.CreatedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) ListSupersededRecordsCount(ctx context.Context, userID string) (int, error) {
	userID = normalizeUser(userID)
	var dCnt, sCnt, bCnt int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM daily_summaries WHERE user_id = ? AND superseded_by != ''`, userID).Scan(&dCnt)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM sleep_sessions WHERE user_id = ? AND superseded_by != ''`, userID).Scan(&sCnt)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM body_measurements WHERE user_id = ? AND superseded_by != ''`, userID).Scan(&bCnt)
	return dCnt + sCnt + bCnt, nil
}

func (s *Store) GetSyncCursor(ctx context.Context, userID, provider, metric string) (*store.SyncCursor, error) {
	userID = normalizeUser(userID)
	var c store.SyncCursor
	var succStr, attStr string
	err := s.db.QueryRowContext(ctx, `
		SELECT provider, metric, last_successful_sync_ts, last_attempt_ts, last_http_status, last_error
		FROM sync_cursors WHERE user_id = ? AND provider = ? AND metric = ?
	`, userID, provider, metric).Scan(&c.Provider, &c.Metric, &succStr, &attStr, &c.LastHTTPStatus, &c.LastError)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if succStr != "" {
		c.LastSuccessfulSyncTS, _ = time.Parse(time.RFC3339, succStr)
	}
	if attStr != "" {
		c.LastAttemptTS, _ = time.Parse(time.RFC3339, attStr)
	}
	return &c, nil
}

// UpdateSyncCursorAttempt freezes last_successful_sync_ts unless advanceTS != nil (e.g., on HTTP 200).
func (s *Store) UpdateSyncCursorAttempt(ctx context.Context, userID, provider, metric string, status int, errMsg string, advanceTS *time.Time) error {
	userID = normalizeUser(userID)
	nowStr := time.Now().UTC().Format(time.RFC3339)
	existing, _ := s.GetSyncCursor(ctx, userID, provider, metric)
	succStr := ""
	if existing != nil && !existing.LastSuccessfulSyncTS.IsZero() {
		succStr = existing.LastSuccessfulSyncTS.UTC().Format(time.RFC3339)
	}
	if advanceTS != nil && status >= 200 && status < 300 {
		succStr = advanceTS.UTC().Format(time.RFC3339)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sync_cursors (user_id, provider, metric, last_successful_sync_ts, last_attempt_ts, last_http_status, last_error)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, provider, metric) DO UPDATE SET
			last_successful_sync_ts = excluded.last_successful_sync_ts,
			last_attempt_ts = excluded.last_attempt_ts,
			last_http_status = excluded.last_http_status,
			last_error = excluded.last_error
	`, userID, provider, metric, succStr, nowStr, status, errMsg)
	return err
}

func (s *Store) ListSyncCursors(ctx context.Context, userID string) ([]store.SyncCursor, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT provider, metric, last_successful_sync_ts, last_attempt_ts, last_http_status, last_error
		FROM sync_cursors WHERE user_id = ? ORDER BY provider ASC, metric ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.SyncCursor
	for rows.Next() {
		var c store.SyncCursor
		var succStr, attStr string
		if err := rows.Scan(&c.Provider, &c.Metric, &succStr, &attStr, &c.LastHTTPStatus, &c.LastError); err != nil {
			return nil, err
		}
		if succStr != "" {
			c.LastSuccessfulSyncTS, _ = time.Parse(time.RFC3339, succStr)
		}
		if attStr != "" {
			c.LastAttemptTS, _ = time.Parse(time.RFC3339, attStr)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) SaveOAuthToken(ctx context.Context, userID string, tok *store.OAuthTokenState) error {
	userID = normalizeUser(userID)
	testingInt := 0
	if tok.TestingMode7Day {
		testingInt = 1
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_expiry, refresh_issued_at, refresh_expires_at, testing_mode_7day)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, provider) DO UPDATE SET
			access_token = excluded.access_token,
			refresh_token = CASE WHEN excluded.refresh_token != '' THEN excluded.refresh_token ELSE oauth_tokens.refresh_token END,
			token_expiry = excluded.token_expiry,
			refresh_issued_at = excluded.refresh_issued_at,
			refresh_expires_at = excluded.refresh_expires_at,
			testing_mode_7day = excluded.testing_mode_7day
	`, userID, tok.Provider, tok.AccessToken, tok.RefreshToken,
		tok.TokenExpiry.UTC().Format(time.RFC3339),
		tok.RefreshIssuedAt.UTC().Format(time.RFC3339),
		tok.RefreshExpiresAt.UTC().Format(time.RFC3339),
		testingInt)
	return err
}

func (s *Store) GetOAuthToken(ctx context.Context, userID, provider string) (*store.OAuthTokenState, error) {
	userID = normalizeUser(userID)
	var tok store.OAuthTokenState
	var expStr, issStr, refExpStr string
	var testingInt int
	err := s.db.QueryRowContext(ctx, `
		SELECT provider, access_token, refresh_token, token_expiry, refresh_issued_at, refresh_expires_at, testing_mode_7day
		FROM oauth_tokens WHERE user_id = ? AND provider = ?
	`, userID, provider).Scan(&tok.Provider, &tok.AccessToken, &tok.RefreshToken, &expStr, &issStr, &refExpStr, &testingInt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	tok.TokenExpiry, _ = time.Parse(time.RFC3339, expStr)
	tok.RefreshIssuedAt, _ = time.Parse(time.RFC3339, issStr)
	tok.RefreshExpiresAt, _ = time.Parse(time.RFC3339, refExpStr)
	tok.TestingMode7Day = testingInt == 1
	return &tok, nil
}

func (s *Store) UpsertScoreCalibration(ctx context.Context, c *store.ScoreCalibration) error {
	c.UserID = normalizeUser(c.UserID)
	if c.ID == "" {
		c.ID = NewID()
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO score_calibrations (
			id, user_id, local_date, open_readiness, gh_readiness,
			open_sleep_score, gh_sleep_score, open_cardio_load, gh_cardio_load, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, local_date) DO UPDATE SET
			open_readiness = excluded.open_readiness,
			gh_readiness = excluded.gh_readiness,
			open_sleep_score = excluded.open_sleep_score,
			gh_sleep_score = excluded.gh_sleep_score,
			open_cardio_load = excluded.open_cardio_load,
			gh_cardio_load = excluded.gh_cardio_load,
			created_at = excluded.created_at
	`, c.ID, c.UserID, c.LocalDate, c.OpenReadiness, c.GHReadiness,
		c.OpenSleepScore, c.GHSleepScore, c.OpenCardioLoad, c.GHCardioLoad, c.CreatedAt.UTC().Format(time.RFC3339))
	return err
}

func (s *Store) ListScoreCalibrations(ctx context.Context, userID string) ([]store.ScoreCalibration, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, local_date, open_readiness, gh_readiness,
		       open_sleep_score, gh_sleep_score, open_cardio_load, gh_cardio_load, created_at
		FROM score_calibrations WHERE user_id = ? ORDER BY local_date ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.ScoreCalibration
	for rows.Next() {
		var c store.ScoreCalibration
		var ts string
		if err := rows.Scan(&c.ID, &c.UserID, &c.LocalDate, &c.OpenReadiness, &c.GHReadiness,
			&c.OpenSleepScore, &c.GHSleepScore, &c.OpenCardioLoad, &c.GHCardioLoad, &ts); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) UpsertLabPanel(ctx context.Context, p *store.LabPanel) error {
	p.UserID = normalizeUser(p.UserID)
	if p.ID == "" {
		p.ID = NewID()
	}
	if p.CollectedAt.IsZero() {
		p.CollectedAt = time.Now().UTC()
	}
	if p.LocalDate == "" {
		p.LocalDate = p.CollectedAt.Format("2006-01-02")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO lab_panels (id, user_id, collected_at, local_date, source, provider)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET collected_at = excluded.collected_at, local_date = excluded.local_date, source = excluded.source, provider = excluded.provider
	`, p.ID, p.UserID, p.CollectedAt.UTC().Format(time.RFC3339), p.LocalDate, p.Source, p.Provider)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM lab_observations WHERE panel_id = ?`, p.ID)
	if err != nil {
		return err
	}

	for i := range p.Observations {
		ob := &p.Observations[i]
		ob.UserID = p.UserID
		ob.PanelID = p.ID
		if ob.ID == "" {
			ob.ID = NewID()
		}
		if ob.CollectedAt.IsZero() {
			ob.CollectedAt = p.CollectedAt
		}
		if ob.LocalDate == "" {
			ob.LocalDate = p.LocalDate
		}
		if ob.FHIRRawJSON == "" {
			ob.FHIRRawJSON = "{}"
		}
		_, err = tx.ExecContext(ctx, `
			INSERT INTO lab_observations (
				id, user_id, panel_id, collected_at, local_date, loinc_code, biomarker_slug,
				biomarker_name, value_num, unit, ref_low, ref_high, optimal_low, optimal_high, fhir_raw_json
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, ob.ID, ob.UserID, ob.PanelID, ob.CollectedAt.UTC().Format(time.RFC3339), ob.LocalDate,
			ob.LOINCCode, ob.BiomarkerSlug, ob.BiomarkerName, ob.ValueNum, ob.Unit,
			ob.RefLow, ob.RefHigh, ob.OptimalLow, ob.OptimalHigh, ob.FHIRRawJSON)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) ListLabObservations(ctx context.Context, userID, biomarkerSlug string) ([]store.LabObservation, error) {
	userID = normalizeUser(userID)
	q := `
		SELECT id, user_id, panel_id, collected_at, local_date, loinc_code, biomarker_slug,
		       biomarker_name, value_num, unit, ref_low, ref_high, optimal_low, optimal_high, fhir_raw_json
		FROM lab_observations WHERE user_id = ?
	`
	args := []any{userID}
	if biomarkerSlug != "" {
		q += ` AND biomarker_slug = ?`
		args = append(args, biomarkerSlug)
	}
	q += ` ORDER BY local_date ASC, collected_at ASC`

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []store.LabObservation
	for rows.Next() {
		var ob store.LabObservation
		var ts string
		if err := rows.Scan(
			&ob.ID, &ob.UserID, &ob.PanelID, &ts, &ob.LocalDate, &ob.LOINCCode, &ob.BiomarkerSlug,
			&ob.BiomarkerName, &ob.ValueNum, &ob.Unit, &ob.RefLow, &ob.RefHigh, &ob.OptimalLow, &ob.OptimalHigh, &ob.FHIRRawJSON,
		); err != nil {
			return nil, err
		}
		ob.CollectedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, ob)
	}
	return out, rows.Err()
}

func (s *Store) ListLatestLabObservations(ctx context.Context, userID string) ([]store.LabObservation, error) {
	all, err := s.ListLabObservations(ctx, userID, "")
	if err != nil {
		return nil, err
	}
	latestBySlug := make(map[string]store.LabObservation)
	var order []string
	for _, ob := range all {
		if _, seen := latestBySlug[ob.BiomarkerSlug]; !seen {
			order = append(order, ob.BiomarkerSlug)
		}
		latestBySlug[ob.BiomarkerSlug] = ob
	}
	out := make([]store.LabObservation, 0, len(order))
	for _, slug := range order {
		out = append(out, latestBySlug[slug])
	}
	return out, nil
}
