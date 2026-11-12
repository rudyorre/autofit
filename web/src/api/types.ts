export interface DayCardDTO {
  date: string;
  day_letter: string;
  day_num: number;
  title: string;
  steps: number;
  distance_mi: number;
  active_kcal: number;
  total_kcal: number;
  azm: number;
  rhr: number;
  hrv: number;
  spo2: number;
  vo2: number;
  readiness: number;
  readiness_open: number;
  sleep_score: number;
  sleep_open: number;
  sleep_text: string;
  cardio_load: number;
  cardio_open: number;
  battery_pct: number;
}

export interface ExerciseDTO {
  id: string;
  slug: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  default_equipment: string;
  default_tare_lb: number;
  load_mode: string;
  default_sets: number;
  default_reps: number;
}

export interface EnrichedLiftItemDTO {
  exercise_id: string;
  slug: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  tare_lb: number;
  load_mode: string;
  target_sets: number;
  target_reps: number;
  scheme: string;
  last_display_lb: number;
  last_total_lb: number;
  subtitle: string;
  sparkline: Array<number | null>;
}

export interface SplitDTO {
  id: string;
  slug: string;
  title: string;
  focus: string;
  items: EnrichedLiftItemDTO[];
}

export interface KeyLiftSummaryDTO {
  slug: string;
  metric_key: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  unit: string;
  first_val: number;
  current_val: number;
  peak_val: number;
  pct_gain: number;
  sessions: number;
  narrative: string;
  sparkline: Array<number | null>;
}

export interface WorkoutSetInput {
  id?: string;
  exercise_id?: string;
  exercise_slug?: string;
  exercise_name?: string;
  set_index: number;
  equipment: string;
  tare_lb: number;
  load_mode: string;
  per_side_or_hand_lb: number;
  total_weight_lb: number;
  reps: number;
  rpe?: number;
  is_warmup?: boolean;
  raw_formula?: string;
}

export interface WorkoutDTO {
  id: string;
  local_date: string;
  split_id?: string;
  title: string;
  source: string;
  notes?: string;
  sets: WorkoutSetInput[];
}

export interface MileSplitDTO {
  mile: number;
  distance_m: number;
  duration_s: number;
  pace_formatted: string;
  avg_hr: number;
  avg_cadence?: number;
  elevation_gain_m?: number;
}

export interface CardioActivityDTO {
  id: string;
  started_at: string;
  local_date: string;
  title: string;
  sport: string;
  distance_m: number;
  duration_s: number;
  avg_hr: number;
  max_hr: number;
  avg_cadence: number;
  elevation_gain_m: number;
  vdot_open: number;
  zone2_efficiency: number;
  zone2_pace_sec_per_mi: number;
  trimp: number;
  splits: MileSplitDTO[];
  hr_zones_minutes?: Record<string, number>;
  source: string;
}

export interface SleepSessionDTO {
  local_date: string;
  efficiency_pct: number;
  deep_min: number;
  rem_min: number;
  light_min: number;
  awake_min: number;
  nadir_hr_bpm: number;
  nadir_time: string;
  bedtime_label: string;
  sleep_score_open: number;
}

export interface LabBiomarkerSummaryDTO {
  slug: string;
  metric_key: string;
  name: string;
  loinc_code: string;
  latest_value: number;
  unit: string;
  latest_date: string;
  ref_low: number;
  ref_high: number;
  optimal_low: number;
  optimal_high: number;
  status: string;
  history_text: string;
  draws: Array<{ date: string; value: number }>;
}

export interface LinearModelDTO {
  slope: number;
  intercept: number;
  r2: number;
  samples: number;
  active: boolean;
}

export interface CalibrationSuiteDTO {
  readiness: LinearModelDTO;
  sleep_score: LinearModelDTO;
  cardio_load: LinearModelDTO;
}

export interface MetricCatalogItemDTO {
  key: string;
  category: string;
  label: string;
  title: string;
  unit: string;
  color_token: string;
  current?: string;
  delta?: string;
  sample_cnt?: number;
}

export interface BootstrapPayload {
  anchor_date: string;
  selected_date: string;
  selected_index: number;
  week_strip: DayCardDTO[];
  intraday: {
    hourly_steps: number[];
    intraday_hr: number[];
    sleep_14d: Array<{ date: string; label: string; hours: number }>;
  };
  sleep: SleepSessionDTO;
  exercises: ExerciseDTO[];
  splits: SplitDTO[];
  key_lifts: KeyLiftSummaryDTO[];
  total_workouts: number;
  recent_workouts: WorkoutDTO[];
  recent_runs: CardioActivityDTO[];
  body?: {
    weight_lb: number;
    ewma_weight_lb: number;
    body_fat_pct: number;
    lean_mass_lb: number;
    delta_vs_peak: number;
    lean_delta_lb: number;
    sparkline: number[];
    local_date: string;
  };
  labs: LabBiomarkerSummaryDTO[];
  calibration: CalibrationSuiteDTO;
  metric_catalog: MetricCatalogItemDTO[];
  integrations: {
    google_health: {
      configured: boolean;
      connected: boolean;
      status: string;
      testing_mode_7day: boolean;
      days_remaining: number;
      hours_remaining: number;
      refresh_expires_at?: string;
      reconsent_auth_url?: string;
      write_workouts_sync: boolean;
    };
    garmin: {
      configured: boolean;
      mode: string;
    };
    parity_scorecard: {
      audits_count: number;
      sleep_agreement_pct: number;
      rhr_delta_bpm: number;
      steps_delta_pct: number;
      superseded_records: number;
      outbound_ledger_cnt: number;
    };
  };
}

export interface TrendPayload {
  key: string;
  horizon: string;
  category: string;
  label: string;
  title: string;
  unit: string;
  color_token: string;
  invert_good: boolean;
  sparse: boolean;
  current: string;
  delta: string;
  summary: string;
  insight: string;
  labels: string[];
  bucket_dates: string[];
  series: Array<number | null>;
  density: number[];
  monthly_labels: string[];
  monthly_density: number[];
  no_data_gaps: Array<{
    start_bucket: number;
    end_bucket: number;
    start_date: string;
    end_date: string;
    duration_days: number;
    label: string;
  }>;
  plateaus: Array<{
    start_bucket: number;
    end_bucket: number;
    start_date: string;
    end_date: string;
    level_value: number;
    avg_density: number;
    label: string;
  }>;
  alt_series?: {
    equipment: string;
    label: string;
    points: Array<{ idx: number; date: string; val: number; raw_formula?: string }>;
  };
  ref_low?: number;
  ref_high?: number;
  optimal_high?: number;
}
