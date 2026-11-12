package analytics

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/rudyorre/autofit/internal/store"
)

type GapBand struct {
	StartBucket  int    `json:"start_bucket"`
	EndBucket    int    `json:"end_bucket"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	DurationDays int    `json:"duration_days"`
	Label        string `json:"label"`
}

type PlateauZone struct {
	StartBucket int     `json:"start_bucket"`
	EndBucket   int     `json:"end_bucket"`
	StartDate   string  `json:"start_date"`
	EndDate     string  `json:"end_date"`
	LevelValue  float64 `json:"level_value"`
	AvgDensity  float64 `json:"avg_density"`
	Label       string  `json:"label"`
}

type AltPoint struct {
	BucketIndex int     `json:"idx"`
	Date        string  `json:"date"`
	Value       float64 `json:"val"`
	RawFormula  string  `json:"raw_formula,omitempty"`
}

type AltEquipmentSeries struct {
	Equipment string     `json:"equipment"`
	Label     string     `json:"label"`
	Points    []AltPoint `json:"points"`
}

type MetricCatalogItem struct {
	Key        string `json:"key"`
	Category   string `json:"category"` // lift | wearable | cardio | body | lab
	Label      string `json:"label"`
	Title      string `json:"title"`
	Unit       string `json:"unit"`
	ColorToken string `json:"color_token"`
	Current    string `json:"current"`
	Delta      string `json:"delta"`
	SampleCnt  int    `json:"sample_cnt"`
}

type TrendPayload struct {
	Key                string              `json:"key"`
	Horizon            string              `json:"horizon"`
	Category           string              `json:"category"`
	Label              string              `json:"label"`
	Title              string              `json:"title"`
	Unit               string              `json:"unit"`
	ColorToken         string              `json:"color_token"`
	InvertGood         bool                `json:"invert_good"`
	Sparse             bool                `json:"sparse"`
	CurrentFormatted   string              `json:"current"`
	DeltaFormatted     string              `json:"delta"`
	ConsistencySummary string              `json:"summary"`
	DiagnosticInsight  string              `json:"insight"`
	Labels             []string            `json:"labels"`
	BucketDates        []string            `json:"bucket_dates"`
	Series             []*float64          `json:"series"` // nil = explicit No-Data hiatus!
	Density            []int               `json:"density"`
	MonthlyLabels      []string            `json:"monthly_labels"`
	MonthlyDensity     []int               `json:"monthly_density"`
	NoDataGaps         []GapBand           `json:"no_data_gaps"`
	Plateaus           []PlateauZone       `json:"plateaus"`
	AltSeries          *AltEquipmentSeries `json:"alt_series,omitempty"`
	RefLow             float64             `json:"ref_low,omitempty"`
	RefHigh            float64             `json:"ref_high,omitempty"`
	OptimalHigh        float64             `json:"optimal_high,omitempty"`
}

type rawSample struct {
	Date       time.Time
	Value      float64
	Equipment  string
	RawFormula string
}

type Engine struct {
	repo store.Repository
}

func NewEngine(repo store.Repository) *Engine {
	return &Engine{repo: repo}
}

func (e *Engine) BuildMetricCatalog(ctx context.Context, userID string, refDate time.Time) ([]MetricCatalogItem, error) {
	var items []MetricCatalogItem

	// Priority lifts first (Bench, Squat, DB Row, Incline, Shoulder Press, Lat Pulldown, etc.)
	exs, err := e.repo.ListExercises(ctx, userID)
	if err != nil {
		return nil, err
	}
	allSets, err := e.repo.ListAllWorkoutSetsWithDate(ctx, userID)
	if err != nil {
		return nil, err
	}
	setsByEx := make(map[string][]store.WorkoutSetWithDate)
	for _, st := range allSets {
		if !st.IsWarmup {
			setsByEx[st.ExerciseID] = append(setsByEx[st.ExerciseID], st)
		}
	}

	priorityOrder := map[string]int{
		"bench-press": 1, "squat": 2, "dumbbell-row": 3, "incline-bench-press": 4,
		"dumbbell-press": 5, "shoulder-press": 6, "lat-pulldown-wide": 7, "leg-press-sled": 8,
		"seated-curls": 9, "tricep-pulldown": 10,
	}
	sort.Slice(exs, func(i, j int) bool {
		pi, okI := priorityOrder[exs[i].Slug]
		pj, okJ := priorityOrder[exs[j].Slug]
		if okI && okJ {
			return pi < pj
		}
		if okI != okJ {
			return okI
		}
		if len(setsByEx[exs[i].ID]) != len(setsByEx[exs[j].ID]) {
			return len(setsByEx[exs[i].ID]) > len(setsByEx[exs[j].ID])
		}
		return exs[i].Name < exs[j].Name
	})

	for _, ex := range exs {
		sets := setsByEx[ex.ID]
		if len(sets) == 0 {
			continue
		}
		first := liftDisplayWeight(ex, sets[0].WorkoutSet)
		last := liftDisplayWeight(ex, sets[len(sets)-1].WorkoutSet)
		delta := last - first
		sign := "+"
		if delta < 0 {
			sign = ""
		}
		unit := "lb"
		if ex.LoadMode == "per_hand" {
			unit = "lb/hand"
		}
		items = append(items, MetricCatalogItem{
			Key:        "lift:" + ex.Slug,
			Category:   "lift",
			Label:      ex.Name,
			Title:      fmt.Sprintf("%s (%d×%d)", ex.Name, ex.DefaultSets, ex.DefaultReps),
			Unit:       unit,
			ColorToken: "--m3-teal",
			Current:    fmt.Sprintf("%.1f %s", last, unit),
			Delta:      fmt.Sprintf("%s%.1f %s", sign, delta, unit),
			SampleCnt:  len(sets),
		})
	}

	// Core Wearable, Cardio & Body metrics
	builtin := []struct {
		key, cat, label, title, unit, col string
	}{
		{"vo2", "cardio", "VO2 Max", "Running VDOT / VO2 Max (.FIT + GH)", "mL/kg", "--m3-amber"},
		{"rhr", "wearable", "Resting HR", "Resting Heart Rate (Rolling Baseline)", "bpm", "--m3-coral"},
		{"hrv", "wearable", "HRV (RMSSD)", "Overnight HRV (RMSSD)", "ms", "--m3-teal"},
		{"sleep", "wearable", "Sleep", "Sleep Duration & Quality", "hrs", "--m3-blue"},
		{"steps", "wearable", "Steps", "Daily Steps", "/day", "--m3-teal"},
		{"readiness", "wearable", "Readiness", "Systemic Readiness Score", "pts", "--m3-teal"},
		{"weight", "body", "Weight", "Body Weight (EWMA Smoothed)", "lb", "--m3-teal"},
		{"body_fat", "body", "Body Fat %", "Body Fat Percentage", "%", "--m3-teal"},
	}
	for _, b := range builtin {
		items = append(items, MetricCatalogItem{
			Key: b.key, Category: b.cat, Label: b.label, Title: b.title, Unit: b.unit, ColorToken: b.col,
		})
	}

	// Clinical FHIR Lab Biomarkers
	labs, _ := e.repo.ListLatestLabObservations(ctx, userID)
	for _, ob := range labs {
		items = append(items, MetricCatalogItem{
			Key:        "lab:" + ob.BiomarkerSlug,
			Category:   "lab",
			Label:      ob.BiomarkerName,
			Title:      fmt.Sprintf("%s (Clinical FHIR R4 • LOINC %s)", ob.BiomarkerName, ob.LOINCCode),
			Unit:       ob.Unit,
			ColorToken: "--m3-teal",
			Current:    fmt.Sprintf("%.1f %s", ob.ValueNum, ob.Unit),
		})
	}

	return items, nil
}

func (e *Engine) BuildTrend(ctx context.Context, userID, metricKey, horizon string, refDate time.Time) (*TrendPayload, error) {
	if horizon == "" {
		horizon = "all"
	}
	horizon = strings.ToLower(horizon)

	// Alias convenience keys from UI ("bench" -> "lift:bench-press", "squat" -> "lift:squat", "dbrow" -> "lift:dumbbell-row", "apob" -> "lab:apob")
	metricKey = normalizeMetricAlias(metricKey)

	if strings.HasPrefix(metricKey, "lift:") {
		slug := strings.TrimPrefix(metricKey, "lift:")
		return e.buildLiftTrend(ctx, userID, slug, horizon, refDate)
	}
	if strings.HasPrefix(metricKey, "lab:") {
		slug := strings.TrimPrefix(metricKey, "lab:")
		return e.buildLabTrend(ctx, userID, slug, horizon, refDate)
	}
	return e.buildVitalsOrBodyTrend(ctx, userID, metricKey, horizon, refDate)
}

func normalizeMetricAlias(k string) string {
	switch strings.ToLower(strings.TrimSpace(k)) {
	case "bench", "bench-press":
		return "lift:bench-press"
	case "squat":
		return "lift:squat"
	case "dbrow", "dumbbell-row":
		return "lift:dumbbell-row"
	case "incline", "incline-bench-press":
		return "lift:incline-bench-press"
	case "shoulder-press":
		return "lift:shoulder-press"
	case "apob":
		return "lab:apob"
	case "hba1c":
		return "lab:hba1c"
	case "hscrp", "hs-crp":
		return "lab:hs-crp"
	case "ldlc", "ldl-c", "ldl":
		return "lab:ldl-c"
	case "ferritin":
		return "lab:ferritin"
	case "vitd", "vitamin-d":
		return "lab:vitamin-d"
	default:
		return k
	}
}

func (e *Engine) buildLiftTrend(ctx context.Context, userID, slug, horizon string, refDate time.Time) (*TrendPayload, error) {
	ex, err := e.repo.GetExerciseBySlug(ctx, userID, slug)
	if err != nil {
		return nil, err
	}
	if ex == nil {
		return nil, fmt.Errorf("exercise %q not found", slug)
	}
	sets, err := e.repo.ListWorkoutSetsByExercise(ctx, userID, ex.ID)
	if err != nil {
		return nil, err
	}

	// Group sets by workout date + equipment so primary curve stays equipment-pure (e.g., Olympic 45 lb bar vs Smith 15/20 lb bar!)
	type dayEquip struct {
		date  time.Time
		equip string
		best  float64
		rawF  string
	}
	byDayEquip := make(map[string]*dayEquip)
	for _, st := range sets {
		if st.IsWarmup {
			continue
		}
		dt, err := time.Parse("2006-01-02", st.LocalDate)
		if err != nil {
			continue
		}
		val := liftDisplayWeight(*ex, st.WorkoutSet)
		if val <= 0 {
			continue
		}
		eqKey := st.LocalDate + "|" + st.Equipment
		if cur, ok := byDayEquip[eqKey]; !ok || val > cur.best {
			byDayEquip[eqKey] = &dayEquip{date: dt, equip: st.Equipment, best: val, rawF: st.RawFormula}
		}
	}

	var primarySamples []rawSample
	var smithSamples []rawSample
	for _, de := range byDayEquip {
		if ex.DefaultEquipment == "olympic_bar" && de.equip == "smith" {
			smithSamples = append(smithSamples, rawSample{Date: de.date, Value: de.best, Equipment: "smith", RawFormula: de.rawF})
		} else {
			primarySamples = append(primarySamples, rawSample{Date: de.date, Value: de.best, Equipment: de.equip, RawFormula: de.rawF})
		}
	}
	// If ALL logged sessions used smith, promote them to primary so chart isn't empty
	if len(primarySamples) == 0 && len(smithSamples) > 0 {
		primarySamples = smithSamples
		smithSamples = nil
	}

	sort.Slice(primarySamples, func(i, j int) bool { return primarySamples[i].Date.Before(primarySamples[j].Date) })
	sort.Slice(smithSamples, func(i, j int) bool { return smithSamples[i].Date.Before(smithSamples[j].Date) })

	unit := "lb"
	modeNote := fmt.Sprintf("Working %d×%d", ex.DefaultSets, ex.DefaultReps)
	if ex.LoadMode == "per_hand" {
		unit = "lb"
		modeNote = "Per-Hand Normalized"
	}

	// Also include global workout dates for monthly training consistency strip when viewing lifts
	allWorkouts, _ := e.repo.ListWorkouts(ctx, userID, 5000)
	var allLiftDates []time.Time
	for _, w := range allWorkouts {
		if dt, err := time.Parse("2006-01-02", w.LocalDate); err == nil {
			allLiftDates = append(allLiftDates, dt)
		}
	}

	payload := bucketizeAndAnalyze(bucketConfig{
		Key:           "lift:" + ex.Slug,
		Category:      "lift",
		Label:         ex.Name,
		Title:         fmt.Sprintf("%s (%s)", ex.Name, modeNote),
		Unit:          unit,
		ColorToken:    "--m3-teal",
		Horizon:       horizon,
		RefDate:       refDate,
		Samples:       primarySamples,
		AltSamples:    smithSamples,
		AltLabel:      "Smith Bar (15–20 lb tare)",
		GapDaysThresh: 21, // >21 days missing = explicit strength hiatus
		AggregateMax:  true,
		GlobalDates:   allLiftDates,
	})
	return payload, nil
}

func (e *Engine) buildLabTrend(ctx context.Context, userID, slug, horizon string, refDate time.Time) (*TrendPayload, error) {
	obs, err := e.repo.ListLabObservations(ctx, userID, slug)
	if err != nil {
		return nil, err
	}
	if len(obs) == 0 {
		return &TrendPayload{
			Key: "lab:" + slug, Horizon: horizon, Category: "lab", Label: slug,
			Title: slug, ColorToken: "--m3-teal", Sparse: true,
		}, nil
	}
	var samples []rawSample
	for _, ob := range obs {
		dt, err := time.Parse("2006-01-02", ob.LocalDate)
		if err != nil {
			dt = ob.CollectedAt
		}
		samples = append(samples, rawSample{Date: dt, Value: ob.ValueNum})
	}
	last := obs[len(obs)-1]
	invertGood := slug == "apob" || slug == "ldl-c" || slug == "hba1c" || slug == "hs-crp" || slug == "triglycerides"

	p := bucketizeAndAnalyze(bucketConfig{
		Key:           "lab:" + slug,
		Category:      "lab",
		Label:         last.BiomarkerName,
		Title:         fmt.Sprintf("%s (Clinical FHIR R4 • LOINC %s)", last.BiomarkerName, last.LOINCCode),
		Unit:          last.Unit,
		ColorToken:    "--m3-teal",
		InvertGood:    invertGood,
		Sparse:        true,
		Horizon:       horizon,
		RefDate:       refDate,
		Samples:       samples,
		GapDaysThresh: 365,
	})
	p.RefLow = last.RefLow
	p.RefHigh = last.RefHigh
	p.OptimalHigh = last.OptimalHigh
	return p, nil
}

func (e *Engine) buildVitalsOrBodyTrend(ctx context.Context, userID, key, horizon string, refDate time.Time) (*TrendPayload, error) {
	switch key {
	case "weight", "body_fat":
		body, err := e.repo.ListBodyMeasurements(ctx, userID)
		if err != nil {
			return nil, err
		}
		var samples []rawSample
		for _, b := range body {
			dt, err := time.Parse("2006-01-02", b.LocalDate)
			if err != nil {
				continue
			}
			val := b.EWMAWeightLb
			if val <= 0 {
				val = b.WeightLb
			}
			if key == "body_fat" {
				if b.BodyFatPct <= 0 {
					continue
				}
				val = b.BodyFatPct
			}
			samples = append(samples, rawSample{Date: dt, Value: val})
		}
		title := "Body Weight (EWMA Multi-Year)"
		label := "Weight"
		unit := "lb"
		invert := false
		if key == "body_fat" {
			title = "Body Fat % (Multi-Year)"
			label = "Body Fat %"
			unit = "%"
			invert = true
		}
		return bucketizeAndAnalyze(bucketConfig{
			Key: key, Category: "body", Label: label, Title: title, Unit: unit,
			ColorToken: "--m3-teal", InvertGood: invert, Horizon: horizon, RefDate: refDate,
			Samples: samples, GapDaysThresh: 14,
		}), nil

	case "vo2":
		runs, _ := e.repo.ListCardioActivities(ctx, userID, 5000)
		dailies, _ := e.repo.ListDailySummaries(ctx, userID, "", "")
		var samples []rawSample
		seenDate := map[string]bool{}
		for _, r := range runs {
			if r.VDOTOpen > 0 {
				if dt, err := time.Parse("2006-01-02", r.LocalDate); err == nil {
					samples = append(samples, rawSample{Date: dt, Value: r.VDOTOpen})
					seenDate[r.LocalDate] = true
				}
			}
		}
		for _, d := range dailies {
			if d.VO2GH > 0 && !seenDate[d.LocalDate] {
				if dt, err := time.Parse("2006-01-02", d.LocalDate); err == nil {
					samples = append(samples, rawSample{Date: dt, Value: d.VO2GH})
				}
			}
		}
		sort.Slice(samples, func(i, j int) bool { return samples[i].Date.Before(samples[j].Date) })
		return bucketizeAndAnalyze(bucketConfig{
			Key: "vo2", Category: "cardio", Label: "VO2 Max", Title: "Running VDOT / VO2 Max (.FIT + GH)",
			Unit: "mL/kg", ColorToken: "--m3-amber", Horizon: horizon, RefDate: refDate,
			Samples: samples, GapDaysThresh: 21, AggregateMax: true,
		}), nil

	default:
		dailies, err := e.repo.ListDailySummaries(ctx, userID, "", "")
		if err != nil {
			return nil, err
		}
		sleeps, _ := e.repo.ListSleepSessions(ctx, userID, "", "")
		sleepByDate := make(map[string]store.SleepSession, len(sleeps))
		for _, s := range sleeps {
			sleepByDate[s.LocalDate] = s
		}

		var samples []rawSample
		label, title, unit, color := "Steps", "Daily Steps", "/day", "--m3-teal"
		invert := false
		switch key {
		case "rhr":
			label, title, unit, color, invert = "Resting HR", "Resting Heart Rate", "bpm", "--m3-coral", true
		case "hrv":
			label, title, unit, color = "HRV (RMSSD)", "Overnight HRV (RMSSD)", "ms", "--m3-teal"
		case "sleep":
			label, title, unit, color = "Sleep", "Sleep Duration", "hrs", "--m3-blue"
		case "readiness":
			label, title, unit, color = "Readiness", "Systemic Readiness Score", "pts", "--m3-teal"
		case "cardio_load":
			label, title, unit, color = "Cardio Load", "Cardio Load (TRIMP)", "load", "--m3-amber"
		default:
			key = "steps"
		}

		for _, d := range dailies {
			dt, err := time.Parse("2006-01-02", d.LocalDate)
			if err != nil {
				continue
			}
			var v float64
			switch key {
			case "rhr":
				v = d.RHRBpm
			case "hrv":
				v = d.HRVRmssdMs
			case "sleep":
				if ss, ok := sleepByDate[d.LocalDate]; ok {
					v = math.Round((float64(ss.DeepMin+ss.REMMin+ss.LightMin)/60.0)*100) / 100
				}
			case "readiness":
				v = d.ReadinessOpen
			case "cardio_load":
				v = d.CardioLoadTRIMP
			default:
				v = float64(d.Steps)
			}
			if v > 0 {
				samples = append(samples, rawSample{Date: dt, Value: v})
			}
		}

		return bucketizeAndAnalyze(bucketConfig{
			Key: key, Category: "wearable", Label: label, Title: title, Unit: unit,
			ColorToken: color, InvertGood: invert, Horizon: horizon, RefDate: refDate,
			Samples: samples, GapDaysThresh: 7, // >7 days missing = explicit wearable gap
		}), nil
	}
}

type bucketConfig struct {
	Key           string
	Category      string
	Label         string
	Title         string
	Unit          string
	ColorToken    string
	InvertGood    bool
	Sparse        bool
	Horizon       string
	RefDate       time.Time
	Samples       []rawSample
	AltSamples    []rawSample
	AltLabel      string
	GapDaysThresh int
	AggregateMax  bool
	GlobalDates   []time.Time
}

func bucketizeAndAnalyze(cfg bucketConfig) *TrendPayload {
	ref := cfg.RefDate
	if ref.IsZero() {
		ref = time.Now().UTC()
	}
	if len(cfg.Samples) > 0 && cfg.Samples[len(cfg.Samples)-1].Date.After(ref) {
		ref = cfg.Samples[len(cfg.Samples)-1].Date
	}

	// Determine start date and bucket width based on requested horizon
	var startDate time.Time
	var bucketDays int
	labelFmt := "Jan '06"

	switch cfg.Horizon {
	case "7d":
		startDate = ref.AddDate(0, 0, -6)
		bucketDays = 1
		labelFmt = "Mon 2"
	case "1m":
		startDate = ref.AddDate(0, 0, -29)
		bucketDays = 1
		labelFmt = "Jan 2"
	case "3m":
		startDate = ref.AddDate(0, 0, -90)
		bucketDays = 7
		labelFmt = "Jan 2"
	case "6m":
		startDate = ref.AddDate(0, 0, -180)
		bucketDays = 14
		labelFmt = "Jan 2"
	case "1y":
		startDate = ref.AddDate(-1, 0, 0)
		bucketDays = 14
		labelFmt = "Jan '06"
	default: // "all" ('22-'26)
		cfg.Horizon = "all"
		startDate = time.Date(2022, 2, 1, 0, 0, 0, 0, time.UTC)
		if len(cfg.Samples) > 0 && cfg.Samples[0].Date.Before(startDate) {
			startDate = time.Date(cfg.Samples[0].Date.Year(), cfg.Samples[0].Date.Month(), 1, 0, 0, 0, 0, time.UTC)
		}
		bucketDays = 60 // Clean ~28-30 bi-monthly buckets across 4.5+ years (matching Material 3 reference!)
		labelFmt = "Jan '06"
	}

	// Build contiguous calendar buckets from startDate -> ref
	type bucketWindow struct {
		start time.Time
		end   time.Time
		label string
	}
	var windows []bucketWindow
	if cfg.Horizon == "all" {
		// Bi-monthly calendar windows starting Feb 2022 -> refDate
		cur := time.Date(startDate.Year(), startDate.Month(), 1, 0, 0, 0, 0, time.UTC)
		for !cur.After(ref) {
			next := cur.AddDate(0, 2, 0)
			windows = append(windows, bucketWindow{
				start: cur,
				end:   next.Add(-time.Second),
				label: cur.Format(labelFmt),
			})
			cur = next
		}
	} else {
		cur := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
		endDay := time.Date(ref.Year(), ref.Month(), ref.Day(), 23, 59, 59, 0, time.UTC)
		for !cur.After(endDay) {
			next := cur.AddDate(0, 0, bucketDays)
			windows = append(windows, bucketWindow{
				start: cur,
				end:   next.Add(-time.Second),
				label: cur.Format(labelFmt),
			})
			cur = next
		}
	}

	n := len(windows)
	labels := make([]string, n)
	bucketDates := make([]string, n)
	series := make([]*float64, n)
	density := make([]int, n)

	for i, w := range windows {
		labels[i] = w.label
		bucketDates[i] = w.start.Format("2006-01-02")
		var vals []float64
		for _, s := range cfg.Samples {
			if !s.Date.Before(w.start) && !s.Date.After(w.end) {
				vals = append(vals, s.Value)
			}
		}
		density[i] = len(vals)
		if len(vals) > 0 {
			var agg float64
			if cfg.AggregateMax {
				agg = vals[0]
				for _, v := range vals[1:] {
					if v > agg {
						agg = v
					}
				}
			} else {
				var sum float64
				for _, v := range vals {
					sum += v
				}
				agg = sum / float64(len(vals))
			}
			if cfg.Unit == "/day" || cfg.Unit == "pts" || cfg.Unit == "bpm" || cfg.Unit == "ms" {
				agg = math.Round(agg)
			} else {
				agg = math.Round(agg*10) / 10
			}
			vCopy := agg
			series[i] = &vCopy
		}
	}

	// For short horizons where a lift happens 1-2x/week (e.g., 7d / 1m daily buckets on a lift),
	// only mark buckets as explicit No-Data gaps if the gap exceeds GapDaysThresh!
	// Wait: on bi-monthly/monthly/fortnightly buckets (bucketDays >= GapDaysThresh or "all"), any nil bucket IS a true hiatus!
	// On 1-day buckets for lifts ("7d" / "1m"), keep nil on rest days and mark Sparse=true when GapDaysThresh > bucketDays*3 so rest days connect smoothly while >21d hiatuses break!
	sparseRender := cfg.Sparse
	if !sparseRender && bucketDays == 1 && cfg.GapDaysThresh >= 14 {
		sparseRender = true
	}

	// Detect explicit No-Data Gap bands between first and last active sample
	var gaps []GapBand
	firstActive, lastActive := -1, -1
	for i := 0; i < n; i++ {
		if series[i] != nil {
			if firstActive == -1 {
				firstActive = i
			}
			lastActive = i
		}
	}
	if !cfg.Sparse && firstActive >= 0 {
		i := firstActive
		for i <= lastActive {
			if series[i] == nil {
				j := i
				for j+1 <= lastActive && series[j+1] == nil {
					j++
				}
				gapDays := int(windows[j].end.Sub(windows[i].start).Hours()/24) + 1
				if gapDays >= cfg.GapDaysThresh {
					gaps = append(gaps, GapBand{
						StartBucket:  i,
						EndBucket:    j,
						StartDate:    windows[i].start.Format("2006-01-02"),
						EndDate:      windows[j].end.Format("2006-01-02"),
						DurationDays: gapDays,
						Label:        fmt.Sprintf("No Data (%dw)", maxInt(1, gapDays/7)),
					})
				}
				i = j + 1
			} else {
				i++
			}
		}
	}

	// Detect flat-slope Plateaus across >= 3 contiguous active buckets where session density > 0
	var plateaus []PlateauZone
	if !cfg.Sparse && n >= 4 {
		var validVals []float64
		for _, v := range series {
			if v != nil {
				validVals = append(validVals, *v)
			}
		}
		if len(validVals) >= 4 {
			minV, maxV := validVals[0], validVals[0]
			for _, v := range validVals[1:] {
				if v < minV {
					minV = v
				}
				if v > maxV {
					maxV = v
				}
			}
			flatBand := math.Max(1.0, (maxV-minV)*0.055)
			i := 0
			for i <= n-3 {
				if series[i] == nil {
					i++
					continue
				}
				j := i
				lo, hi := *series[i], *series[i]
				densSum := density[i]
				for j+1 < n && series[j+1] != nil {
					cand := *series[j+1]
					nLo := math.Min(lo, cand)
					nHi := math.Max(hi, cand)
					if nHi-nLo > flatBand {
						break
					}
					lo, hi = nLo, nHi
					j++
					densSum += density[j]
				}
				spanBuckets := j - i + 1
				avgDens := float64(densSum) / float64(spanBuckets)
				if spanBuckets >= 3 && avgDens >= 1.0 {
					lvl := math.Round(((lo+hi)/2.0)*10) / 10
					plateaus = append(plateaus, PlateauZone{
						StartBucket: i,
						EndBucket:   j,
						StartDate:   windows[i].start.Format("2006-01-02"),
						EndDate:     windows[j].end.Format("2006-01-02"),
						LevelValue:  lvl,
						AvgDensity:  math.Round(avgDens*10) / 10,
						Label:       fmt.Sprintf("Plateau · %g %s", lvl, cfg.Unit),
					})
					i = j + 1
					continue
				}
				i++
			}
		}
	}

	// Equipment-separated AltSeries (e.g., Smith Machine 15/20 lb tare markers)
	var altOut *AltEquipmentSeries
	if len(cfg.AltSamples) > 0 {
		var pts []AltPoint
		for i, w := range windows {
			var best *rawSample
			for k := range cfg.AltSamples {
				s := &cfg.AltSamples[k]
				if !s.Date.Before(w.start) && !s.Date.After(w.end) {
					if best == nil || s.Value > best.Value {
						best = s
					}
				}
			}
			if best != nil {
				pts = append(pts, AltPoint{
					BucketIndex: i,
					Date:        best.Date.Format("2006-01-02"),
					Value:       math.Round(best.Value*10) / 10,
					RawFormula:  best.RawFormula,
				})
			}
		}
		if len(pts) > 0 {
			altOut = &AltEquipmentSeries{
				Equipment: "smith",
				Label:     cfg.AltLabel,
				Points:    pts,
			}
		}
	}

	// Build 28-cell 2022->2026 bi-monthly consistency strip so bottom strip always shows multi-year consistency context
	stripStart := time.Date(2022, 2, 1, 0, 0, 0, 0, time.UTC)
	var mLabels []string
	var mDensity []int
	curM := stripStart
	for !curM.After(ref) {
		nextM := curM.AddDate(0, 2, 0)
		cnt := 0
		for _, s := range cfg.Samples {
			if !s.Date.Before(curM) && s.Date.Before(nextM) {
				cnt++
			}
		}
		mLabels = append(mLabels, curM.Format("Jan '06"))
		mDensity = append(mDensity, cnt)
		curM = nextM
	}

	// Compute headline Current, Delta, Summary & Rule-Based Diagnostic Insight
	curStr, deltaStr := "--", "No data yet"
	summaryStr := "No logged samples in window"
	insightStr := "Import your .xlsx workout sheet, .FIT runs, or SMART Health Link to populate longitudinal curves."

	if firstActive >= 0 && lastActive >= 0 {
		firstVal := *series[firstActive]
		lastVal := *series[lastActive]
		curStr = formatValUnit(lastVal, cfg.Unit)
		diff := math.Round((lastVal-firstVal)*10) / 10
		sign := "+"
		if diff < 0 {
			sign = ""
		}
		deltaStr = fmt.Sprintf("%s%g %s since %s", sign, diff, cfg.Unit, labels[firstActive])

		pctGain := 0.0
		if firstVal > 0 {
			pctGain = ((lastVal - firstVal) / firstVal) * 100.0
		}
		summaryStr = fmt.Sprintf("%d hiatus gaps • %d plateaus • %+.0f%% window change", len(gaps), len(plateaus), pctGain)

		insightStr = buildRuleBasedInsight(cfg, firstVal, lastVal, labels[firstActive], gaps, plateaus, altOut)
	}

	return &TrendPayload{
		Key:                cfg.Key,
		Horizon:            cfg.Horizon,
		Category:           cfg.Category,
		Label:              cfg.Label,
		Title:              cfg.Title,
		Unit:               cfg.Unit,
		ColorToken:         cfg.ColorToken,
		InvertGood:         cfg.InvertGood,
		Sparse:             sparseRender,
		CurrentFormatted:   curStr,
		DeltaFormatted:     deltaStr,
		ConsistencySummary: summaryStr,
		DiagnosticInsight:  insightStr,
		Labels:             labels,
		BucketDates:        bucketDates,
		Series:             series,
		Density:            density,
		MonthlyLabels:      mLabels,
		MonthlyDensity:     mDensity,
		NoDataGaps:         gaps,
		Plateaus:           plateaus,
		AltSeries:          altOut,
	}
}

func buildRuleBasedInsight(cfg bucketConfig, firstVal, lastVal float64, firstLbl string, gaps []GapBand, plateaus []PlateauZone, alt *AltEquipmentSeries) string {
	var parts []string
	diff := math.Round((lastVal-firstVal)*10) / 10
	if cfg.InvertGood {
		if diff < 0 {
			parts = append(parts, fmt.Sprintf("Improved from %g → %g %s since %s.", firstVal, lastVal, cfg.Unit, firstLbl))
		} else if diff > 0 {
			parts = append(parts, fmt.Sprintf("Drifted from %g → %g %s since %s.", firstVal, lastVal, cfg.Unit, firstLbl))
		}
	} else {
		if diff > 0 {
			parts = append(parts, fmt.Sprintf("Progressed from %g → %g %s since %s.", firstVal, lastVal, cfg.Unit, firstLbl))
		}
	}
	if len(plateaus) > 0 {
		p := plateaus[0]
		parts = append(parts, fmt.Sprintf("Detected active stimulus plateau at %g %s (%s to %s).", p.LevelValue, cfg.Unit, p.StartDate[:7], p.EndDate[:7]))
	}
	if len(gaps) > 0 {
		longest := gaps[0]
		for _, g := range gaps[1:] {
			if g.DurationDays > longest.DurationDays {
				longest = g
			}
		}
		parts = append(parts, fmt.Sprintf("Longest no-data hiatus spanned %d weeks (%s → %s), broken cleanly rather than interpolated.", maxInt(1, longest.DurationDays/7), longest.StartDate[:7], longest.EndDate[:7]))
	}
	if alt != nil && len(alt.Points) > 0 {
		parts = append(parts, fmt.Sprintf("Separated %d %s session(s) as hollow markers to keep Olympic bar PRs uncorrupted.", len(alt.Points), alt.Label))
	}
	if len(parts) == 0 {
		return fmt.Sprintf("Holding steady around %g %s across %d logged data points.", lastVal, cfg.Unit, len(cfg.Samples))
	}
	return "Diagnostic: " + strings.Join(parts, " ")
}

func liftDisplayWeight(ex store.Exercise, st store.WorkoutSet) float64 {
	if ex.LoadMode == "per_hand" && st.PerSideOrHandLb > 0 {
		return st.PerSideOrHandLb
	}
	return st.TotalWeightLb
}

func formatValUnit(v float64, unit string) string {
	if unit == "/day" {
		return formatIntComma(int(math.Round(v)))
	}
	return fmt.Sprintf("%g %s", v, unit)
}

func formatIntComma(n int) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	return s[:len(s)-3] + "," + s[len(s)-3:]
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
