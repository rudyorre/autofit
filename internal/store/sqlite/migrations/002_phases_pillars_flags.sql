-- Autofit v0.2 Additive Schema Migration:
-- Training Phases, Feature Flags, Formula Preferences, Daily Check-Ins, and Mobility ROM Tests.
-- Note: Composite 0-100 pillar scores are NEVER persisted here as source of truth;
-- they are computed purely on demand from immutable raw tables + user_preferences!

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    sex TEXT NOT NULL DEFAULT 'male',
    age INTEGER NOT NULL DEFAULT 28,
    bf_opt_low REAL NOT NULL DEFAULT 12.0,
    bf_opt_high REAL NOT NULL DEFAULT 16.0,
    weight_target_lb REAL NOT NULL DEFAULT 165.0,
    screen_time_target_min INTEGER NOT NULL DEFAULT 120,
    mobility_weekly_target_min INTEGER NOT NULL DEFAULT 60,
    feature_flags_json TEXT NOT NULL DEFAULT '{}',
    formula_weights_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_phases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL DEFAULT '',
    focus_pillars_json TEXT NOT NULL DEFAULT '["strength","cardio"]',
    targets_json TEXT NOT NULL DEFAULT '{}',
    floors_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_phases_user ON training_phases(user_id, is_active, start_date DESC);

CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    screen_time_min INTEGER NOT NULL DEFAULT 0,
    mobility_min INTEGER NOT NULL DEFAULT 0,
    waist_in REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, local_date DESC);

CREATE TABLE IF NOT EXISTS mobility_tests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    test_slug TEXT NOT NULL,
    value_num REAL NOT NULL,
    unit TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, local_date, test_slug)
);
CREATE INDEX IF NOT EXISTS idx_mobility_tests_user_date ON mobility_tests(user_id, test_slug, local_date DESC);
