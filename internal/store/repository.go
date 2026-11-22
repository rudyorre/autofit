package store

import (
	"context"
	"time"
)

const DefaultUserID = "owner"

type Exercise struct {
	ID               string   `json:"id"`
	UserID           string   `json:"user_id"`
	Slug             string   `json:"slug"`
	Name             string   `json:"name"`
	PrimaryMuscle    string   `json:"primary_muscle"`
	SecondaryMuscles []string `json:"secondary_muscles"`
	DefaultEquipment string   `json:"default_equipment"` // olympic_bar | smith | dumbbell_pair | dumbbell_single | sled | cable | machine
	DefaultTareLb    float64  `json:"default_tare_lb"`
	LoadMode         string   `json:"load_mode"` // plates_per_side | per_hand | stack_total | bodyweight_plus
	DefaultSets      int      `json:"default_sets"`
	DefaultReps      int      `json:"default_reps"`
	LegacyAliases    []string `json:"legacy_aliases"`
}

type SplitTemplateItem struct {
	ID           string    `json:"id"`
	SplitID      string    `json:"split_id"`
	Position     int       `json:"position"`
	ExerciseID   string    `json:"exercise_id"`
	ExerciseSlug string    `json:"exercise_slug"`
	ExerciseName string    `json:"exercise_name"`
	TargetSets   int       `json:"target_sets"`
	TargetReps   int       `json:"target_reps"`
	Exercise     *Exercise `json:"exercise,omitempty"`
}

type SplitTemplate struct {
	ID       string              `json:"id"`
	UserID   string              `json:"user_id"`
	Slug     string              `json:"slug"`
	Title    string              `json:"title"`
	Focus    string              `json:"focus"`
	RowStart int                 `json:"row_start"`
	RowEnd   int                 `json:"row_end"`
	Items    []SplitTemplateItem `json:"items"`
}

type WorkoutSet struct {
	ID              string  `json:"id"`
	UserID          string  `json:"user_id"`
	WorkoutID       string  `json:"workout_id"`
	ExerciseID      string  `json:"exercise_id"`
	ExerciseSlug    string  `json:"exercise_slug,omitempty"`
	ExerciseName    string  `json:"exercise_name,omitempty"`
	SetIndex        int     `json:"set_index"`
	Equipment       string  `json:"equipment"`
	TareLb          float64 `json:"tare_lb"`
	LoadMode        string  `json:"load_mode"`
	PerSideOrHandLb float64 `json:"per_side_or_hand_lb"`
	TotalWeightLb   float64 `json:"total_weight_lb"`
	Reps            int     `json:"reps"`
	RPE             float64 `json:"rpe,omitempty"`
	IsWarmup        bool    `json:"is_warmup"`
	E1RMLb          float64 `json:"e1rm_lb"`
	RawFormula      string  `json:"raw_formula,omitempty"`
}

type Workout struct {
	ID                      string       `json:"id"`
	UserID                  string       `json:"user_id"`
	StartedAt               time.Time    `json:"started_at"`
	LocalDate               string       `json:"local_date"`
	SplitID                 string       `json:"split_id,omitempty"`
	Title                   string       `json:"title"`
	Source                  string       `json:"source"` // autofit_pwa | legacy_sheet | google_health_api
	ExternalID              string       `json:"external_id,omitempty"`
	Notes                   string       `json:"notes,omitempty"`
	GoogleHealthDatapointID string       `json:"google_health_datapoint_id,omitempty"`
	Sets                    []WorkoutSet `json:"sets,omitempty"`
}

type DailySummary struct {
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	LocalDate        string  `json:"local_date"`
	Steps            int     `json:"steps"`
	DistanceM        float64 `json:"distance_m"`
	ActiveKcal       int     `json:"active_kcal"`
	TotalKcal        int     `json:"total_kcal"`
	AZMMinutes       int     `json:"azm_minutes"`
	RHRBpm           float64 `json:"rhr_bpm"`
	HRVRmssdMs       float64 `json:"hrv_rmssd_ms"`
	SpO2Pct          float64 `json:"spo2_pct"`
	RespRate         float64 `json:"resp_rate"`
	SkinTempDeltaC   float64 `json:"skin_temp_delta_c"`
	VO2GH            float64 `json:"vo2_gh"`
	ReadinessOpen    float64 `json:"readiness_open"`
	SleepScoreOpen   float64 `json:"sleep_score_open"`
	CardioLoadTRIMP  float64 `json:"cardio_load_trimp"`
	Source           string  `json:"source"` // google_health_api | apple_healthkit | demo_seed
	SourceBundleID   string  `json:"source_bundle_id,omitempty"`
	ExternalID       string  `json:"external_id,omitempty"`
	SupersededBy     string  `json:"superseded_by,omitempty"`
	BatteryPct       int     `json:"battery_pct,omitempty"`
}

type IntradayMetric struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	LocalDate      string    `json:"local_date"`
	Metric         string    `json:"metric"` // hourly_steps | intraday_hr
	Samples        []float64 `json:"samples"`
	Source         string    `json:"source"`
	SourceBundleID string    `json:"source_bundle_id,omitempty"`
	ExternalID     string    `json:"external_id,omitempty"`
	SupersededBy   string    `json:"superseded_by,omitempty"`
}

type SleepStageSegment struct {
	Stage    string `json:"stage"` // deep | rem | light | awake
	StartMin int    `json:"start_min"`
	Duration int    `json:"duration_min"`
}

type SleepSession struct {
	ID             string              `json:"id"`
	UserID         string              `json:"user_id"`
	LocalDate      string              `json:"local_date"`
	StartTS        time.Time           `json:"start_ts"`
	EndTS          time.Time           `json:"end_ts"`
	EfficiencyPct  float64             `json:"efficiency_pct"`
	DeepMin        int                 `json:"deep_min"`
	REMMin         int                 `json:"rem_min"`
	LightMin       int                 `json:"light_min"`
	AwakeMin       int                 `json:"awake_min"`
	NadirHRBpm     float64             `json:"nadir_hr_bpm"`
	NadirTime      string              `json:"nadir_time"`
	BedtimeLabel   string              `json:"bedtime_label"`
	SleepScoreOpen float64             `json:"sleep_score_open"`
	Stages         []SleepStageSegment `json:"stages,omitempty"`
	ExternalID     string              `json:"external_id,omitempty"`
	Source         string              `json:"source"`
	SourceBundleID string              `json:"source_bundle_id,omitempty"`
	SupersededBy   string              `json:"superseded_by,omitempty"`
}

type MileSplit struct {
	Mile           int     `json:"mile"`
	DistanceM      float64 `json:"distance_m"`
	DurationS      float64 `json:"duration_s"`
	PaceFormatted  string  `json:"pace_formatted"`
	AvgHR          int     `json:"avg_hr"`
	AvgCadence     int     `json:"avg_cadence,omitempty"`
	ElevationGainM float64 `json:"elevation_gain_m,omitempty"`
}

type CardioActivity struct {
	ID                string         `json:"id"`
	UserID            string         `json:"user_id"`
	StartedAt         time.Time      `json:"started_at"`
	LocalDate         string         `json:"local_date"`
	Title             string         `json:"title"`
	Sport             string         `json:"sport"`
	DistanceM         float64        `json:"distance_m"`
	DurationS         float64        `json:"duration_s"`
	AvgHR             int            `json:"avg_hr"`
	MaxHR             int            `json:"max_hr"`
	AvgCadence        int            `json:"avg_cadence"`
	ElevationGainM    float64        `json:"elevation_gain_m"`
	VDOTOpen          float64        `json:"vdot_open"`
	Zone2Efficiency   float64        `json:"zone2_efficiency"`
	Zone2PaceSecPerMi float64        `json:"zone2_pace_sec_per_mi"`
	TRIMP             float64        `json:"trimp"`
	Splits            []MileSplit    `json:"splits"`
	HRZonesMinutes    map[string]int `json:"hr_zones_minutes,omitempty"`
	FitSHA256         string         `json:"fit_sha256,omitempty"`
	Source            string         `json:"source"` // garmin_fit | garmin_api | google_health_api | legacy_sheet
	ExternalID        string         `json:"external_id,omitempty"`
}

type BodyMeasurement struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	MeasuredAt     time.Time `json:"measured_at"`
	LocalDate      string    `json:"local_date"`
	WeightLb       float64   `json:"weight_lb"`
	EWMAWeightLb   float64   `json:"ewma_weight_lb"`
	BodyFatPct     float64   `json:"body_fat_pct,omitempty"`
	LeanMassLb     float64   `json:"lean_mass_lb,omitempty"`
	ExternalID     string    `json:"external_id,omitempty"`
	Source         string    `json:"source"`
	SourceBundleID string    `json:"source_bundle_id,omitempty"`
	SupersededBy   string    `json:"superseded_by,omitempty"`
}

type OutboundSyncEntry struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id"`
	EntityType        string    `json:"entity_type"` // weight | body_fat | workout | cardio
	LocalID           string    `json:"local_id"`
	GoogleDatapointID string    `json:"google_datapoint_id"`
	SyncedAt          time.Time `json:"synced_at"`
}

type ScoreCalibration struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	LocalDate      string    `json:"local_date"`
	OpenReadiness  float64   `json:"open_readiness"`
	GHReadiness    float64   `json:"gh_readiness"`
	OpenSleepScore float64   `json:"open_sleep_score"`
	GHSleepScore   float64   `json:"gh_sleep_score"`
	OpenCardioLoad float64   `json:"open_cardio_load"`
	GHCardioLoad   float64   `json:"gh_cardio_load"`
	CreatedAt      time.Time `json:"created_at"`
}

type LabPanel struct {
	ID           string           `json:"id"`
	UserID       string           `json:"user_id"`
	CollectedAt  time.Time        `json:"collected_at"`
	LocalDate    string           `json:"local_date"`
	Source       string           `json:"source"` // shlink | fhir_json | manual | demo_seed
	Provider     string           `json:"provider"`
	Observations []LabObservation `json:"observations,omitempty"`
}

type LabObservation struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	PanelID       string    `json:"panel_id"`
	CollectedAt   time.Time `json:"collected_at"`
	LocalDate     string    `json:"local_date"`
	LOINCCode     string    `json:"loinc_code"`
	BiomarkerSlug string    `json:"biomarker_slug"`
	BiomarkerName string    `json:"biomarker_name"`
	ValueNum      float64   `json:"value_num"`
	Unit          string    `json:"unit"`
	RefLow        float64   `json:"ref_low"`
	RefHigh       float64   `json:"ref_high"`
	OptimalLow    float64   `json:"optimal_low"`
	OptimalHigh   float64   `json:"optimal_high"`
	FHIRRawJSON   string    `json:"fhir_raw_json,omitempty"`
}

type ParityAudit struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"user_id"`
	LocalDate            string    `json:"local_date"`
	SleepAgreementPct    float64   `json:"sleep_agreement_pct"`
	SleepDurationDeltaM  float64   `json:"sleep_duration_delta_m"`
	RHRDeltaBpm          float64   `json:"rhr_delta_bpm"`
	StepsDeltaPct        float64   `json:"steps_delta_pct"`
	PrimarySource        string    `json:"primary_source"`
	FallbackSourceBundle string    `json:"fallback_source_bundle"`
	CreatedAt            time.Time `json:"created_at"`
}

type SyncCursor struct {
	Provider             string    `json:"provider"`
	Metric               string    `json:"metric"`
	LastSuccessfulSyncTS time.Time `json:"last_successful_sync_ts"`
	LastAttemptTS        time.Time `json:"last_attempt_ts"`
	LastHTTPStatus       int       `json:"last_http_status"`
	LastError            string    `json:"last_error,omitempty"`
}

type OAuthTokenState struct {
	Provider         string    `json:"provider"`
	AccessToken      string    `json:"-"`
	RefreshToken     string    `json:"-"`
	TokenExpiry      time.Time `json:"token_expiry"`
	RefreshIssuedAt  time.Time `json:"refresh_issued_at"`
	RefreshExpiresAt time.Time `json:"refresh_expires_at"`
	TestingMode7Day  bool      `json:"testing_mode_7day"`
}

type FeatureFlags struct {
	PillarStrength       bool `json:"pillar_strength"`
	PillarCardio         bool `json:"pillar_cardio"`
	PillarSleep          bool `json:"pillar_sleep"`
	PillarWeight         bool `json:"pillar_weight"`
	PillarBodyFat        bool `json:"pillar_body_fat"`
	PillarFlexibility    bool `json:"pillar_flexibility"`
	PillarScreenTime     bool `json:"pillar_screen_time"`
	ViewHealthLabs       bool `json:"view_health_labs"`
	ToolOLSCalibration   bool `json:"tool_ols_calibration"`
	ToolWearableIntraday bool `json:"tool_wearable_intraday"`
}

func DefaultFeatureFlags() FeatureFlags {
	return FeatureFlags{
		PillarStrength:       true,
		PillarCardio:         true,
		PillarSleep:          true,
		PillarWeight:         false,
		PillarBodyFat:        false,
		PillarFlexibility:    false,
		PillarScreenTime:     false,
		ViewHealthLabs:       false,
		ToolOLSCalibration:   false,
		ToolWearableIntraday: false,
	}
}

func (f FeatureFlags) IsPillarEnabled(key string) bool {
	switch key {
	case "strength":
		return f.PillarStrength
	case "cardio":
		return f.PillarCardio
	case "sleep":
		return f.PillarSleep
	case "weight":
		return f.PillarWeight
	case "body_fat":
		return f.PillarBodyFat
	case "flexibility":
		return f.PillarFlexibility
	case "screen_time":
		return f.PillarScreenTime
	default:
		return false
	}
}

type UserPreferences struct {
	UserID                  string             `json:"user_id"`
	Sex                     string             `json:"sex"` // male | female
	Age                     int                `json:"age"`
	BFOptLow                float64            `json:"bf_opt_low"`
	BFOptHigh               float64            `json:"bf_opt_high"`
	WeightTargetLb          float64            `json:"weight_target_lb"`
	ScreenTimeTargetMin     int                `json:"screen_time_target_min"`
	MobilityWeeklyTargetMin int                `json:"mobility_weekly_target_min"`
	FeatureFlags            FeatureFlags       `json:"feature_flags"`
	FormulaWeights          map[string]float64 `json:"formula_weights,omitempty"`
	UpdatedAt               time.Time          `json:"updated_at"`
}

func DefaultUserPreferences(userID string) *UserPreferences {
	if userID == "" {
		userID = DefaultUserID
	}
	return &UserPreferences{
		UserID:                  userID,
		Sex:                     "male",
		Age:                     28,
		BFOptLow:                12.0,
		BFOptHigh:               16.0,
		WeightTargetLb:          165.0,
		ScreenTimeTargetMin:     120,
		MobilityWeeklyTargetMin: 60,
		FeatureFlags:            DefaultFeatureFlags(),
		FormulaWeights:          map[string]float64{},
		UpdatedAt:               time.Now().UTC(),
	}
}

type TrainingPhase struct {
	ID           string             `json:"id"`
	UserID       string             `json:"user_id"`
	Name         string             `json:"name"`
	StartDate    string             `json:"start_date"`
	EndDate      string             `json:"end_date,omitempty"`
	FocusPillars []string           `json:"focus_pillars"` // 1-2 active focus pillars
	Targets      map[string]float64 `json:"targets"`       // optional target 0-100 score per focus pillar
	Floors       map[string]float64 `json:"floors"`        // maintenance floor 0-100 score per pillar
	Notes        string             `json:"notes,omitempty"`
	IsActive     bool               `json:"is_active"`
	CreatedAt    time.Time          `json:"created_at"`
}

func DefaultTrainingPhase(userID, startDate string) *TrainingPhase {
	if userID == "" {
		userID = DefaultUserID
	}
	if startDate == "" {
		startDate = time.Now().UTC().Format("2006-01-02")
	}
	return &TrainingPhase{
		ID:           "phase-default",
		UserID:       userID,
		Name:         "Strength & Cardio Build",
		StartDate:    startDate,
		FocusPillars: []string{"strength", "cardio"},
		Targets: map[string]float64{
			"strength": 75,
			"cardio":   80,
		},
		Floors: map[string]float64{
			"strength":    55,
			"cardio":      65,
			"sleep":       75,
			"weight":      75,
			"body_fat":    75,
			"flexibility": 65,
			"screen_time": 65,
		},
		Notes:     "Push meaningful progress on Strength and Cardio while holding Sleep above baseline.",
		IsActive:  true,
		CreatedAt: time.Now().UTC(),
	}
}

type DailyCheckin struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	LocalDate     string    `json:"local_date"`
	ScreenTimeMin int       `json:"screen_time_min"`
	MobilityMin   int       `json:"mobility_min"`
	WaistIn       float64   `json:"waist_in"`
	Notes         string    `json:"notes,omitempty"`
	Source        string    `json:"source"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type MobilityTest struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	LocalDate string    `json:"local_date"`
	TestSlug  string    `json:"test_slug"` // ankle_ktw_cm | sit_reach_in | shoulder_flex_deg | deep_squat_score
	ValueNum  float64   `json:"value_num"`
	Unit      string    `json:"unit"`
	Notes     string    `json:"notes,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BackupBundle struct {
	ExportedAt       time.Time          `json:"exported_at"`
	Exercises        []Exercise         `json:"exercises"`
	Splits           []SplitTemplate    `json:"splits"`
	Workouts         []Workout          `json:"workouts"`
	DailySummaries   []DailySummary     `json:"daily_summaries"`
	SleepSessions    []SleepSession     `json:"sleep_sessions"`
	CardioActivities []CardioActivity   `json:"cardio_activities"`
	BodyMeasurements []BodyMeasurement  `json:"body_measurements"`
	LabPanels        []LabPanel         `json:"lab_panels"`
	LabObservations  []LabObservation   `json:"lab_observations"`
	Calibrations     []ScoreCalibration `json:"calibrations"`
	Preferences      *UserPreferences   `json:"preferences,omitempty"`
	TrainingPhases   []TrainingPhase    `json:"training_phases,omitempty"`
	DailyCheckins    []DailyCheckin     `json:"daily_checkins,omitempty"`
	MobilityTests    []MobilityTest     `json:"mobility_tests,omitempty"`
}

type Repository interface {
	Close() error
	EnsureSeedCatalog(ctx context.Context, userID string) error

	// Strength & Catalog
	ListExercises(ctx context.Context, userID string) ([]Exercise, error)
	GetExerciseBySlug(ctx context.Context, userID, slug string) (*Exercise, error)
	ListSplitTemplates(ctx context.Context, userID string) ([]SplitTemplate, error)
	UpsertWorkout(ctx context.Context, w *Workout) error
	DeleteWorkoutsBySource(ctx context.Context, userID, source string) error
	ListWorkouts(ctx context.Context, userID string, limit int) ([]Workout, error)
	ListWorkoutSetsByExercise(ctx context.Context, userID, exerciseID string) ([]WorkoutSetWithDate, error)
	ListAllWorkoutSetsWithDate(ctx context.Context, userID string) ([]WorkoutSetWithDate, error)
	CountWorkouts(ctx context.Context, userID string) (int, error)

	// Wearables, Sleep, Intraday & Soft-Superseding Reconciler
	UpsertDailySummary(ctx context.Context, d *DailySummary) error
	GetDailySummary(ctx context.Context, userID, localDate string) (*DailySummary, error)
	ListDailySummaries(ctx context.Context, userID, startDate, endDate string) ([]DailySummary, error)
	UpsertIntradayMetric(ctx context.Context, m *IntradayMetric) error
	GetIntradayMetric(ctx context.Context, userID, localDate, metric string) (*IntradayMetric, error)
	UpsertSleepSession(ctx context.Context, s *SleepSession) error
	GetSleepSessionByDate(ctx context.Context, userID, localDate string) (*SleepSession, error)
	ListSleepSessions(ctx context.Context, userID, startDate, endDate string) ([]SleepSession, error)

	// Runs & Cardio
	UpsertCardioActivity(ctx context.Context, a *CardioActivity) error
	ListCardioActivities(ctx context.Context, userID string, limit int) ([]CardioActivity, error)

	// Body Measurements & EWMA
	UpsertBodyMeasurement(ctx context.Context, b *BodyMeasurement) error
	ListBodyMeasurements(ctx context.Context, userID string) ([]BodyMeasurement, error)
	RecomputeBodyEWMA(ctx context.Context, userID string) error

	// Outbound Google Health Sync Ledger & Echo Deduplication
	RecordOutboundSync(ctx context.Context, entry *OutboundSyncEntry) error
	IsOutboundEcho(ctx context.Context, userID, googleDatapointID string) (bool, error)
	ListOutboundSyncEntries(ctx context.Context, userID string, limit int) ([]OutboundSyncEntry, error)

	// Parity Audits, Sync Cursors & OAuth 7d Token Health
	RecordParityAudit(ctx context.Context, a *ParityAudit) error
	ListParityAudits(ctx context.Context, userID string, limit int) ([]ParityAudit, error)
	ListSupersededRecordsCount(ctx context.Context, userID string) (int, error)
	GetSyncCursor(ctx context.Context, userID, provider, metric string) (*SyncCursor, error)
	UpdateSyncCursorAttempt(ctx context.Context, userID, provider, metric string, status int, errMsg string, advanceTS *time.Time) error
	ListSyncCursors(ctx context.Context, userID string) ([]SyncCursor, error)
	SaveOAuthToken(ctx context.Context, userID string, tok *OAuthTokenState) error
	GetOAuthToken(ctx context.Context, userID, provider string) (*OAuthTokenState, error)

	// Calibrations
	UpsertScoreCalibration(ctx context.Context, c *ScoreCalibration) error
	ListScoreCalibrations(ctx context.Context, userID string) ([]ScoreCalibration, error)

	// Clinical Labs & FHIR Biomarkers
	UpsertLabPanel(ctx context.Context, p *LabPanel) error
	ListLabObservations(ctx context.Context, userID, biomarkerSlug string) ([]LabObservation, error)
	ListLatestLabObservations(ctx context.Context, userID string) ([]LabObservation, error)

	// Feature Flags, Formula Preferences, Training Phases & Unified Check-Ins
	GetUserPreferences(ctx context.Context, userID string) (*UserPreferences, error)
	UpsertUserPreferences(ctx context.Context, p *UserPreferences) error
	GetActiveTrainingPhase(ctx context.Context, userID string) (*TrainingPhase, error)
	ListTrainingPhases(ctx context.Context, userID string) ([]TrainingPhase, error)
	UpsertTrainingPhase(ctx context.Context, p *TrainingPhase) error
	UpsertDailyCheckin(ctx context.Context, c *DailyCheckin) error
	ListDailyCheckins(ctx context.Context, userID, startDate, endDate string) ([]DailyCheckin, error)
	UpsertMobilityTest(ctx context.Context, m *MobilityTest) error
	ListMobilityTests(ctx context.Context, userID string) ([]MobilityTest, error)

	// Full Backup Export
	ExportBackup(ctx context.Context, userID string) (*BackupBundle, error)
}

type WorkoutSetWithDate struct {
	WorkoutSet
	LocalDate     string    `json:"local_date"`
	StartedAt     time.Time `json:"started_at"`
	WorkoutSource string    `json:"workout_source"`
}
