-- 001_init.sql: Autofit v0 Relational, Time-Series & Clinical Schema (SQLite WAL)

CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles_json TEXT NOT NULL DEFAULT '[]',
    default_equipment TEXT NOT NULL DEFAULT 'olympic_bar',
    default_tare_lb REAL NOT NULL DEFAULT 0,
    load_mode TEXT NOT NULL DEFAULT 'stack_total',
    default_sets INTEGER NOT NULL DEFAULT 4,
    default_reps INTEGER NOT NULL DEFAULT 10,
    legacy_aliases_json TEXT NOT NULL DEFAULT '[]',
    UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS split_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    focus TEXT NOT NULL DEFAULT '',
    row_start INTEGER NOT NULL DEFAULT 0,
    row_end INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS split_template_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    split_id TEXT NOT NULL REFERENCES split_templates(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_sets INTEGER NOT NULL DEFAULT 4,
    target_reps INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    started_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    split_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'autofit_pwa',
    external_id TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    google_health_datapoint_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, local_date DESC);

CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_index INTEGER NOT NULL,
    equipment TEXT NOT NULL DEFAULT 'olympic_bar',
    tare_lb REAL NOT NULL DEFAULT 0,
    load_mode TEXT NOT NULL DEFAULT 'stack_total',
    per_side_or_hand_lb REAL NOT NULL DEFAULT 0,
    total_weight_lb REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 10,
    rpe REAL NOT NULL DEFAULT 0,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    e1rm_lb REAL NOT NULL DEFAULT 0,
    raw_formula TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_workout ON workout_sets(workout_id, set_index);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    local_date TEXT NOT NULL,
    steps INTEGER NOT NULL DEFAULT 0,
    distance_m REAL NOT NULL DEFAULT 0,
    active_kcal INTEGER NOT NULL DEFAULT 0,
    total_kcal INTEGER NOT NULL DEFAULT 0,
    azm_minutes INTEGER NOT NULL DEFAULT 0,
    rhr_bpm REAL NOT NULL DEFAULT 0,
    hrv_rmssd_ms REAL NOT NULL DEFAULT 0,
    spo2_pct REAL NOT NULL DEFAULT 0,
    resp_rate REAL NOT NULL DEFAULT 0,
    skin_temp_delta_c REAL NOT NULL DEFAULT 0,
    vo2_gh REAL NOT NULL DEFAULT 0,
    readiness_open REAL NOT NULL DEFAULT 0,
    sleep_score_open REAL NOT NULL DEFAULT 0,
    cardio_load_trimp REAL NOT NULL DEFAULT 0,
    battery_pct INTEGER NOT NULL DEFAULT 92,
    source TEXT NOT NULL DEFAULT 'google_health_api',
    source_bundle_id TEXT NOT NULL DEFAULT '',
    external_id TEXT NOT NULL DEFAULT '',
    superseded_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_daily_active ON daily_summaries(user_id, local_date, superseded_by);

CREATE TABLE IF NOT EXISTS intraday_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    local_date TEXT NOT NULL,
    metric TEXT NOT NULL,
    samples_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'google_health_api',
    source_bundle_id TEXT NOT NULL DEFAULT '',
    external_id TEXT NOT NULL DEFAULT '',
    superseded_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_intraday_active ON intraday_metrics(user_id, local_date, metric, superseded_by);

CREATE TABLE IF NOT EXISTS sleep_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    local_date TEXT NOT NULL,
    start_ts TEXT NOT NULL,
    end_ts TEXT NOT NULL,
    efficiency_pct REAL NOT NULL DEFAULT 0,
    deep_min INTEGER NOT NULL DEFAULT 0,
    rem_min INTEGER NOT NULL DEFAULT 0,
    light_min INTEGER NOT NULL DEFAULT 0,
    awake_min INTEGER NOT NULL DEFAULT 0,
    nadir_hr_bpm REAL NOT NULL DEFAULT 0,
    nadir_time TEXT NOT NULL DEFAULT '',
    bedtime_label TEXT NOT NULL DEFAULT '',
    sleep_score_open REAL NOT NULL DEFAULT 0,
    stages_json TEXT NOT NULL DEFAULT '[]',
    external_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'google_health_api',
    source_bundle_id TEXT NOT NULL DEFAULT '',
    superseded_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sleep_active ON sleep_sessions(user_id, local_date, superseded_by);

CREATE TABLE IF NOT EXISTS cardio_activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    started_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Run',
    sport TEXT NOT NULL DEFAULT 'running',
    distance_m REAL NOT NULL DEFAULT 0,
    duration_s REAL NOT NULL DEFAULT 0,
    avg_hr INTEGER NOT NULL DEFAULT 0,
    max_hr INTEGER NOT NULL DEFAULT 0,
    avg_cadence INTEGER NOT NULL DEFAULT 0,
    elevation_gain_m REAL NOT NULL DEFAULT 0,
    vdot_open REAL NOT NULL DEFAULT 0,
    zone2_efficiency REAL NOT NULL DEFAULT 0,
    zone2_pace_sec_per_mi REAL NOT NULL DEFAULT 0,
    trimp REAL NOT NULL DEFAULT 0,
    splits_json TEXT NOT NULL DEFAULT '[]',
    hr_zones_json TEXT NOT NULL DEFAULT '{}',
    fit_sha256 TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'garmin_fit',
    external_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cardio_user_date ON cardio_activities(user_id, local_date DESC);

CREATE TABLE IF NOT EXISTS body_measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    measured_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    weight_lb REAL NOT NULL,
    ewma_weight_lb REAL NOT NULL DEFAULT 0,
    body_fat_pct REAL NOT NULL DEFAULT 0,
    lean_mass_lb REAL NOT NULL DEFAULT 0,
    external_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'autofit_pwa',
    source_bundle_id TEXT NOT NULL DEFAULT '',
    superseded_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_body_active ON body_measurements(user_id, local_date, superseded_by);

CREATE TABLE IF NOT EXISTS outbound_sync_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    entity_type TEXT NOT NULL,
    local_id TEXT NOT NULL,
    google_datapoint_id TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    UNIQUE(user_id, google_datapoint_id)
);

CREATE TABLE IF NOT EXISTS score_calibrations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    local_date TEXT NOT NULL,
    open_readiness REAL NOT NULL DEFAULT 0,
    gh_readiness REAL NOT NULL DEFAULT 0,
    open_sleep_score REAL NOT NULL DEFAULT 0,
    gh_sleep_score REAL NOT NULL DEFAULT 0,
    open_cardio_load REAL NOT NULL DEFAULT 0,
    gh_cardio_load REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS lab_panels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    collected_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'shlink',
    provider TEXT NOT NULL DEFAULT 'Clinical Lab'
);

CREATE TABLE IF NOT EXISTS lab_observations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    panel_id TEXT NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
    collected_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    loinc_code TEXT NOT NULL,
    biomarker_slug TEXT NOT NULL,
    biomarker_name TEXT NOT NULL,
    value_num REAL NOT NULL,
    unit TEXT NOT NULL,
    ref_low REAL NOT NULL DEFAULT 0,
    ref_high REAL NOT NULL DEFAULT 0,
    optimal_low REAL NOT NULL DEFAULT 0,
    optimal_high REAL NOT NULL DEFAULT 0,
    fhir_raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_labs_slug_date ON lab_observations(user_id, biomarker_slug, local_date);

CREATE TABLE IF NOT EXISTS source_parity_audits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    local_date TEXT NOT NULL,
    sleep_agreement_pct REAL NOT NULL DEFAULT 100,
    sleep_duration_delta_m REAL NOT NULL DEFAULT 0,
    rhr_delta_bpm REAL NOT NULL DEFAULT 0,
    steps_delta_pct REAL NOT NULL DEFAULT 0,
    primary_source TEXT NOT NULL DEFAULT 'google_health_api',
    fallback_source_bundle TEXT NOT NULL DEFAULT 'com.fitbit.FitbitMobile',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_cursors (
    user_id TEXT NOT NULL DEFAULT 'owner',
    provider TEXT NOT NULL,
    metric TEXT NOT NULL,
    last_successful_sync_ts TEXT NOT NULL DEFAULT '',
    last_attempt_ts TEXT NOT NULL DEFAULT '',
    last_http_status INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(user_id, provider, metric)
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
    user_id TEXT NOT NULL DEFAULT 'owner',
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL DEFAULT '',
    refresh_token TEXT NOT NULL DEFAULT '',
    token_expiry TEXT NOT NULL DEFAULT '',
    refresh_issued_at TEXT NOT NULL DEFAULT '',
    refresh_expires_at TEXT NOT NULL DEFAULT '',
    testing_mode_7day INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(user_id, provider)
);
