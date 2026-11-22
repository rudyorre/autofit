package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/rudyorre/autofit/internal/store"
)

func (s *Store) GetUserPreferences(ctx context.Context, userID string) (*store.UserPreferences, error) {
	userID = normalizeUser(userID)
	def := store.DefaultUserPreferences(userID)

	var p store.UserPreferences
	var flagsJSON, weightsJSON, updatedStr string
	err := s.db.QueryRowContext(ctx, `
		SELECT user_id, sex, age, bf_opt_low, bf_opt_high, weight_target_lb,
		       screen_time_target_min, mobility_weekly_target_min,
		       feature_flags_json, formula_weights_json, updated_at
		FROM user_preferences
		WHERE user_id = ?
	`, userID).Scan(
		&p.UserID, &p.Sex, &p.Age, &p.BFOptLow, &p.BFOptHigh, &p.WeightTargetLb,
		&p.ScreenTimeTargetMin, &p.MobilityWeeklyTargetMin,
		&flagsJSON, &weightsJSON, &updatedStr,
	)
	if err == sql.ErrNoRows {
		return def, nil
	}
	if err != nil {
		return nil, err
	}

	p.FeatureFlags = store.DefaultFeatureFlags()
	if strings.TrimSpace(flagsJSON) != "" && flagsJSON != "{}" {
		_ = json.Unmarshal([]byte(flagsJSON), &p.FeatureFlags)
	}
	p.FormulaWeights = map[string]float64{}
	if strings.TrimSpace(weightsJSON) != "" && weightsJSON != "{}" {
		_ = json.Unmarshal([]byte(weightsJSON), &p.FormulaWeights)
	}
	p.UpdatedAt, _ = time.Parse(time.RFC3339, updatedStr)
	return &p, nil
}

func (s *Store) UpsertUserPreferences(ctx context.Context, p *store.UserPreferences) error {
	p.UserID = normalizeUser(p.UserID)
	if p.Sex != "female" {
		p.Sex = "male"
	}
	if p.Age < 15 || p.Age > 100 {
		p.Age = 28
	}
	if p.BFOptLow <= 0 {
		p.BFOptLow = 12.0
	}
	if p.BFOptHigh <= p.BFOptLow {
		p.BFOptHigh = p.BFOptLow + 4.0
	}
	if p.WeightTargetLb <= 0 {
		p.WeightTargetLb = 165.0
	}
	if p.ScreenTimeTargetMin <= 0 {
		p.ScreenTimeTargetMin = 120
	}
	if p.MobilityWeeklyTargetMin <= 0 {
		p.MobilityWeeklyTargetMin = 60
	}
	p.UpdatedAt = time.Now().UTC()

	flagsBytes, _ := json.Marshal(p.FeatureFlags)
	if p.FormulaWeights == nil {
		p.FormulaWeights = map[string]float64{}
	}
	weightsBytes, _ := json.Marshal(p.FormulaWeights)

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO user_preferences (
			user_id, sex, age, bf_opt_low, bf_opt_high, weight_target_lb,
			screen_time_target_min, mobility_weekly_target_min,
			feature_flags_json, formula_weights_json, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			sex = excluded.sex,
			age = excluded.age,
			bf_opt_low = excluded.bf_opt_low,
			bf_opt_high = excluded.bf_opt_high,
			weight_target_lb = excluded.weight_target_lb,
			screen_time_target_min = excluded.screen_time_target_min,
			mobility_weekly_target_min = excluded.mobility_weekly_target_min,
			feature_flags_json = excluded.feature_flags_json,
			formula_weights_json = excluded.formula_weights_json,
			updated_at = excluded.updated_at
	`, p.UserID, p.Sex, p.Age, p.BFOptLow, p.BFOptHigh, p.WeightTargetLb,
		p.ScreenTimeTargetMin, p.MobilityWeeklyTargetMin,
		string(flagsBytes), string(weightsBytes), p.UpdatedAt.Format(time.RFC3339))
	return err
}

func (s *Store) GetActiveTrainingPhase(ctx context.Context, userID string) (*store.TrainingPhase, error) {
	userID = normalizeUser(userID)
	var ph store.TrainingPhase
	var focusJSON, targetsJSON, floorsJSON, createdStr string
	var isAct int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, start_date, end_date, focus_pillars_json,
		       targets_json, floors_json, notes, is_active, created_at
		FROM training_phases
		WHERE user_id = ? AND is_active = 1
		ORDER BY start_date DESC, created_at DESC
		LIMIT 1
	`, userID).Scan(
		&ph.ID, &ph.UserID, &ph.Name, &ph.StartDate, &ph.EndDate,
		&focusJSON, &targetsJSON, &floorsJSON, &ph.Notes, &isAct, &createdStr,
	)
	if err == sql.ErrNoRows {
		return store.DefaultTrainingPhase(userID, time.Now().UTC().AddDate(0, -1, 0).Format("2006-01-02")), nil
	}
	if err != nil {
		return nil, err
	}
	ph.IsActive = isAct == 1
	_ = json.Unmarshal([]byte(focusJSON), &ph.FocusPillars)
	ph.Targets = map[string]float64{}
	_ = json.Unmarshal([]byte(targetsJSON), &ph.Targets)
	ph.Floors = map[string]float64{}
	_ = json.Unmarshal([]byte(floorsJSON), &ph.Floors)
	ph.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
	return &ph, nil
}

func (s *Store) ListTrainingPhases(ctx context.Context, userID string) ([]store.TrainingPhase, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, name, start_date, end_date, focus_pillars_json,
		       targets_json, floors_json, notes, is_active, created_at
		FROM training_phases
		WHERE user_id = ?
		ORDER BY is_active DESC, start_date DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.TrainingPhase
	for rows.Next() {
		var ph store.TrainingPhase
		var focusJSON, targetsJSON, floorsJSON, createdStr string
		var isAct int
		if err := rows.Scan(
			&ph.ID, &ph.UserID, &ph.Name, &ph.StartDate, &ph.EndDate,
			&focusJSON, &targetsJSON, &floorsJSON, &ph.Notes, &isAct, &createdStr,
		); err != nil {
			return nil, err
		}
		ph.IsActive = isAct == 1
		_ = json.Unmarshal([]byte(focusJSON), &ph.FocusPillars)
		ph.Targets = map[string]float64{}
		_ = json.Unmarshal([]byte(targetsJSON), &ph.Targets)
		ph.Floors = map[string]float64{}
		_ = json.Unmarshal([]byte(floorsJSON), &ph.Floors)
		ph.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		out = append(out, ph)
	}
	return out, rows.Err()
}

func (s *Store) UpsertTrainingPhase(ctx context.Context, p *store.TrainingPhase) error {
	p.UserID = normalizeUser(p.UserID)
	if p.ID == "" {
		p.ID = NewID()
	}
	if strings.TrimSpace(p.Name) == "" {
		p.Name = "Active Focus Phase"
	}
	if p.StartDate == "" {
		p.StartDate = time.Now().UTC().Format("2006-01-02")
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now().UTC()
	}
	if p.Targets == nil {
		p.Targets = map[string]float64{}
	}
	if p.Floors == nil {
		p.Floors = map[string]float64{}
	}

	focusBytes, _ := json.Marshal(p.FocusPillars)
	targetsBytes, _ := json.Marshal(p.Targets)
	floorsBytes, _ := json.Marshal(p.Floors)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if p.IsActive {
		if _, err := tx.ExecContext(ctx, `UPDATE training_phases SET is_active = 0 WHERE user_id = ? AND id != ?`, p.UserID, p.ID); err != nil {
			return err
		}
	}

	isAct := 0
	if p.IsActive {
		isAct = 1
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO training_phases (
			id, user_id, name, start_date, end_date, focus_pillars_json,
			targets_json, floors_json, notes, is_active, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			start_date = excluded.start_date,
			end_date = excluded.end_date,
			focus_pillars_json = excluded.focus_pillars_json,
			targets_json = excluded.targets_json,
			floors_json = excluded.floors_json,
			notes = excluded.notes,
			is_active = excluded.is_active
	`, p.ID, p.UserID, p.Name, p.StartDate, p.EndDate,
		string(focusBytes), string(targetsBytes), string(floorsBytes),
		p.Notes, isAct, p.CreatedAt.UTC().Format(time.RFC3339))
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) UpsertDailyCheckin(ctx context.Context, c *store.DailyCheckin) error {
	c.UserID = normalizeUser(c.UserID)
	if c.ID == "" {
		c.ID = NewID()
	}
	if c.LocalDate == "" {
		c.LocalDate = time.Now().UTC().Format("2006-01-02")
	}
	if c.Source == "" {
		c.Source = "manual"
	}
	c.UpdatedAt = time.Now().UTC()

	// Preserve existing non-zero fields when a partial check-in updates only one domain (e.g., screen time webhook!)
	var exScreen, exMob int
	var exWaist float64
	var exNotes string
	err := s.db.QueryRowContext(ctx, `
		SELECT screen_time_min, mobility_min, waist_in, notes
		FROM daily_checkins
		WHERE user_id = ? AND local_date = ?
	`, c.UserID, c.LocalDate).Scan(&exScreen, &exMob, &exWaist, &exNotes)
	if err == nil {
		if c.ScreenTimeMin <= 0 {
			c.ScreenTimeMin = exScreen
		}
		if c.MobilityMin <= 0 {
			c.MobilityMin = exMob
		}
		if c.WaistIn <= 0 {
			c.WaistIn = exWaist
		}
		if strings.TrimSpace(c.Notes) == "" {
			c.Notes = exNotes
		}
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO daily_checkins (
			id, user_id, local_date, screen_time_min, mobility_min, waist_in, notes, source, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, local_date) DO UPDATE SET
			screen_time_min = excluded.screen_time_min,
			mobility_min = excluded.mobility_min,
			waist_in = excluded.waist_in,
			notes = excluded.notes,
			source = excluded.source,
			updated_at = excluded.updated_at
	`, c.ID, c.UserID, c.LocalDate, c.ScreenTimeMin, c.MobilityMin, c.WaistIn, c.Notes, c.Source, c.UpdatedAt.Format(time.RFC3339))
	return err
}

func (s *Store) ListDailyCheckins(ctx context.Context, userID, startDate, endDate string) ([]store.DailyCheckin, error) {
	userID = normalizeUser(userID)
	q := `
		SELECT id, user_id, local_date, screen_time_min, mobility_min, waist_in, notes, source, updated_at
		FROM daily_checkins
		WHERE user_id = ?
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
	var out []store.DailyCheckin
	for rows.Next() {
		var c store.DailyCheckin
		var ts string
		if err := rows.Scan(&c.ID, &c.UserID, &c.LocalDate, &c.ScreenTimeMin, &c.MobilityMin, &c.WaistIn, &c.Notes, &c.Source, &ts); err != nil {
			return nil, err
		}
		c.UpdatedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) UpsertMobilityTest(ctx context.Context, m *store.MobilityTest) error {
	m.UserID = normalizeUser(m.UserID)
	if m.ID == "" {
		m.ID = NewID()
	}
	if m.LocalDate == "" {
		m.LocalDate = time.Now().UTC().Format("2006-01-02")
	}
	m.UpdatedAt = time.Now().UTC()

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO mobility_tests (
			id, user_id, local_date, test_slug, value_num, unit, notes, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, local_date, test_slug) DO UPDATE SET
			value_num = excluded.value_num,
			unit = excluded.unit,
			notes = excluded.notes,
			updated_at = excluded.updated_at
	`, m.ID, m.UserID, m.LocalDate, m.TestSlug, m.ValueNum, m.Unit, m.Notes, m.UpdatedAt.Format(time.RFC3339))
	return err
}

func (s *Store) ListMobilityTests(ctx context.Context, userID string) ([]store.MobilityTest, error) {
	userID = normalizeUser(userID)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, local_date, test_slug, value_num, unit, notes, updated_at
		FROM mobility_tests
		WHERE user_id = ?
		ORDER BY local_date ASC, test_slug ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []store.MobilityTest
	for rows.Next() {
		var m store.MobilityTest
		var ts string
		if err := rows.Scan(&m.ID, &m.UserID, &m.LocalDate, &m.TestSlug, &m.ValueNum, &m.Unit, &m.Notes, &ts); err != nil {
			return nil, err
		}
		m.UpdatedAt, _ = time.Parse(time.RFC3339, ts)
		out = append(out, m)
	}
	return out, rows.Err()
}
