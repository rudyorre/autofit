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

	// Full Backup Export
	ExportBackup(ctx context.Context, userID string) (*BackupBundle, error)
}

type WorkoutSetWithDate struct {
	WorkoutSet
	LocalDate     string    `json:"local_date"`
	StartedAt     time.Time `json:"started_at"`
	WorkoutSource string    `json:"workout_source"`
}
