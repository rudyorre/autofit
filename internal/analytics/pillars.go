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

type ScoreIngredient struct {
	Label     string  `json:"label"`
	RawValue  string  `json:"raw_value"`
	Points    float64 `json:"points"`
	MaxPoints float64 `json:"max_points"`
	WeightPct int     `json:"weight_pct"`
	Note      string  `json:"note,omitempty"`
	MetricKey string  `json:"metric_key,omitempty"`
}

type PillarCard struct {
	Key            string            `json:"key"`
	Label          string            `json:"label"`
	ColorToken     string            `json:"color_token"`
	Enabled        bool              `json:"enabled"`
	Role           string            `json:"role"`        // focus | maintenance
	ScoreModel     string            `json:"score_model"` // percentile | optimum
	ScoreModelNote string            `json:"score_model_note"`
	FormulaVersion string            `json:"formula_version"`
	Score          float64           `json:"score"`
	HasData        bool              `json:"has_data"`
	PrimaryRaw     string            `json:"primary_raw"`
	SecondaryRaw   string            `json:"secondary_raw,omitempty"`
	Delta30d       float64           `json:"delta_30d"`
	DeltaText      string            `json:"delta_text"`
	TargetOrFloor  float64           `json:"target_or_floor"`
	Status         string            `json:"status"` // focus_improving | focus_steady | holding | improving | slipping | no_data
	StatusLabel    string            `json:"status_label"`
	MetricKey      string            `json:"metric_key"`
	Breakdown      []ScoreIngredient `json:"breakdown"`
}

type PillarDashboard struct {
	AsOfDate            string                 `json:"as_of_date"`
	Phase               *store.TrainingPhase   `json:"phase"`
	Preferences         *store.UserPreferences `json:"preferences"`
	Pillars             []PillarCard           `json:"pillars"`
	OnTrackCount        int                    `json:"on_track_count"`
	EnabledCount        int                    `json:"enabled_count"`
	TodayCheckin        *store.DailyCheckin    `json:"today_checkin,omitempty"`
	LatestMobilityTests map[string]float64     `json:"latest_mobility_tests"`
}

type rawSnapshot struct {
	exercises []store.Exercise
	exByID    map[string]store.Exercise
	exBySlug  map[string]store.Exercise
	sets      []store.WorkoutSetWithDate
	dailies   []store.DailySummary
	sleeps    []store.SleepSession
	runs      []store.CardioActivity
	body      []store.BodyMeasurement
	checkins  []store.DailyCheckin
	mobTests  []store.MobilityTest
}

func (e *Engine) loadRawSnapshot(ctx context.Context, userID string) (*rawSnapshot, error) {
	exs, err := e.repo.ListExercises(ctx, userID)
	if err != nil {
		return nil, err
	}
	sets, _ := e.repo.ListAllWorkoutSetsWithDate(ctx, userID)
	dailies, _ := e.repo.ListDailySummaries(ctx, userID, "", "")
	sleeps, _ := e.repo.ListSleepSessions(ctx, userID, "", "")
	runs, _ := e.repo.ListCardioActivities(ctx, userID, 5000)
	body, _ := e.repo.ListBodyMeasurements(ctx, userID)
	checkins, _ := e.repo.ListDailyCheckins(ctx, userID, "", "")
	mobTests, _ := e.repo.ListMobilityTests(ctx, userID)

	exByID := make(map[string]store.Exercise, len(exs))
	exBySlug := make(map[string]store.Exercise, len(exs))
	for _, ex := range exs {
		exByID[ex.ID] = ex
		exBySlug[ex.Slug] = ex
	}

	return &rawSnapshot{
		exercises: exs,
		exByID:    exByID,
		exBySlug:  exBySlug,
		sets:      sets,
		dailies:   dailies,
		sleeps:    sleeps,
		runs:      runs,
		body:      body,
		checkins:  checkins,
		mobTests:  mobTests,
	}, nil
}

// BuildPillarDashboard computes all 7 pillar scores purely on demand from immutable raw tables + preferences + active phase.
// Updating any formula, weight, cohort, or target immediately updates current scores and historical trends with zero reprocessing.
func (e *Engine) BuildPillarDashboard(ctx context.Context, userID string, asOf time.Time) (*PillarDashboard, error) {
	prefs, err := e.repo.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}
	phase, err := e.repo.GetActiveTrainingPhase(ctx, userID)
	if err != nil {
		return nil, err
	}
	snap, err := e.loadRawSnapshot(ctx, userID)
	if err != nil {
		return nil, err
	}

	asOfStr := asOf.Format("2006-01-02")
	prevAsOf := asOf.AddDate(0, 0, -30)

	focusSet := make(map[string]bool)
	for _, fp := range phase.FocusPillars {
		focusSet[fp] = true
	}

	order := []string{"strength", "cardio", "sleep", "weight", "body_fat", "flexibility", "screen_time"}
	cards := make([]PillarCard, 0, len(order))
	enabledCnt := 0
	onTrackCnt := 0

	for _, key := range order {
		cur := evaluatePillar(key, snap, prefs, asOf)
		prev := evaluatePillar(key, snap, prefs, prevAsOf)

		cur.Enabled = prefs.FeatureFlags.IsPillarEnabled(key)
		if focusSet[key] {
			cur.Role = "focus"
			if t, ok := phase.Targets[key]; ok && t > 0 {
				cur.TargetOrFloor = t
			} else {
				cur.TargetOrFloor = math.Min(95, math.Round(cur.Score+8))
			}
		} else {
			cur.Role = "maintenance"
			if fl, ok := phase.Floors[key]; ok && fl > 0 {
				cur.TargetOrFloor = fl
			} else {
				cur.TargetOrFloor = 70
			}
		}

		if cur.HasData && prev.HasData {
			cur.Delta30d = math.Round((cur.Score-prev.Score)*10) / 10
			sign := "+"
			if cur.Delta30d < 0 {
				sign = ""
			}
			cur.DeltaText = fmt.Sprintf("%s%g pts (30d)", sign, cur.Delta30d)
		} else if cur.HasData {
			cur.DeltaText = "Baseline established"
		} else {
			cur.DeltaText = "No logs yet"
		}

		if !cur.HasData {
			cur.Status = "no_data"
			cur.StatusLabel = "Needs Input"
		} else if cur.Role == "focus" {
			if cur.Score >= cur.TargetOrFloor {
				cur.Status = "focus_improving"
				cur.StatusLabel = "Target Hit"
			} else if cur.Delta30d >= 1.0 {
				cur.Status = "focus_improving"
				cur.StatusLabel = "Improving"
			} else {
				cur.Status = "focus_steady"
				cur.StatusLabel = "In Focus"
			}
		} else {
			if cur.Score < cur.TargetOrFloor {
				cur.Status = "slipping"
				cur.StatusLabel = "Below Floor"
			} else if cur.Delta30d >= 2.0 {
				cur.Status = "improving"
				cur.StatusLabel = "Improving"
			} else {
				cur.Status = "holding"
				cur.StatusLabel = "Holding"
			}
		}

		if cur.Enabled {
			enabledCnt++
			if cur.HasData && cur.Status != "slipping" {
				onTrackCnt++
			}
		}
		cards = append(cards, cur)
	}

	// Latest check-in for asOf date (or most recent overall as pre-fill)
	var todayCheckin *store.DailyCheckin
	for i := len(snap.checkins) - 1; i >= 0; i-- {
		c := snap.checkins[i]
		if c.LocalDate <= asOfStr {
			cp := c
			todayCheckin = &cp
			break
		}
	}

	latestMob := map[string]float64{}
	for _, mt := range snap.mobTests {
		if mt.LocalDate <= asOfStr {
			latestMob[mt.TestSlug] = mt.ValueNum
		}
	}

	return &PillarDashboard{
		AsOfDate:            asOfStr,
		Phase:               phase,
		Preferences:         prefs,
		Pillars:             cards,
		OnTrackCount:        onTrackCnt,
		EnabledCount:        enabledCnt,
		TodayCheckin:        todayCheckin,
		LatestMobilityTests: latestMob,
	}, nil
}

func evaluatePillar(key string, snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	var card PillarCard
	switch key {
	case "strength":
		card = evalStrengthPillar(snap, prefs, asOf)
	case "cardio":
		card = evalCardioPillar(snap, prefs, asOf)
	case "sleep":
		card = evalSleepPillar(snap, prefs, asOf)
	case "flexibility":
		card = evalFlexibilityPillar(snap, prefs, asOf)
	case "weight":
		card = evalWeightPillar(snap, prefs, asOf)
	case "body_fat":
		card = evalBodyFatPillar(snap, prefs, asOf)
	case "screen_time":
		card = evalScreenTimePillar(snap, prefs, asOf)
	default:
		card = PillarCard{Key: key, Label: key, HasData: false}
	}
	if card.Breakdown == nil {
		card.Breakdown = []ScoreIngredient{}
	}
	return card
}

func latestBodyweightLb(snap *rawSnapshot, prefs *store.UserPreferences, asOfStr string) float64 {
	for i := len(snap.body) - 1; i >= 0; i-- {
		b := snap.body[i]
		if b.LocalDate <= asOfStr {
			if b.EWMAWeightLb > 0 {
				return b.EWMAWeightLb
			}
			if b.WeightLb > 0 {
				return b.WeightLb
			}
		}
	}
	if prefs.WeightTargetLb > 0 {
		return prefs.WeightTargetLb
	}
	return 165.0
}

// evalStrengthPillar computes a bodyweight-normalized movement-pattern percentile (0-100, asymptotic).
// Anchored to ExRx / DOTS relative bodyweight standards per specific exercise across Push, Lower, Pull, and Incline/Overhead.
func evalStrengthPillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "strength",
		Label:          "Strength",
		ColorToken:     "--m3-teal",
		ScoreModel:     "percentile",
		ScoreModelNote: fmt.Sprintf("Bodyweight-normalized %s percentile (ExRx / DOTS standards)", prefs.Sex),
		FormulaVersion: "strength.rel_bw.v1",
		MetricKey:      "pillar:strength",
		Breakdown:      []ScoreIngredient{},
	}

	asOfStr := asOf.Format("2006-01-02")
	windowStartStr := asOf.AddDate(0, 0, -180).Format("2006-01-02")
	bw := latestBodyweightLb(snap, prefs, asOfStr)

	type liftNorm struct {
		slug    string
		maleMid float64 // e1RM / BW at ~50th percentile (trained general adult norm)
		maleK   float64
		femMid  float64
		femK    float64
	}
	type patternSpec struct {
		name  string
		lifts []liftNorm
	}

	patterns := []patternSpec{
		{
			name: "Horizontal Push",
			lifts: []liftNorm{
				{"bench-press", 0.85, 3.6, 0.52, 5.0},
				{"dumbbell-press", 0.72, 4.0, 0.44, 5.5},
				{"close-grip-bench", 0.78, 3.8, 0.48, 5.2},
			},
		},
		{
			name: "Lower / Squat",
			lifts: []liftNorm{
				{"squat", 1.10, 3.0, 0.76, 4.0},
				{"leg-press-sled", 2.00, 1.8, 1.40, 2.4},
				{"goblet-squat", 0.42, 6.0, 0.30, 7.5},
			},
		},
		{
			name: "Upper Pull",
			lifts: []liftNorm{
				{"dumbbell-row", 0.52, 5.5, 0.34, 7.0},
				{"lat-pulldown-wide", 0.78, 3.8, 0.52, 5.2},
				{"barbell-row", 0.75, 4.0, 0.48, 5.4},
				{"cable-row", 0.78, 3.8, 0.52, 5.2},
			},
		},
		{
			name: "Incline / Overhead",
			lifts: []liftNorm{
				{"incline-bench-press", 0.68, 4.2, 0.42, 5.8},
				{"shoulder-press", 0.55, 4.8, 0.34, 6.2},
				{"overhead-press", 0.55, 4.8, 0.34, 6.2},
			},
		},
	}

	type foundLift struct {
		patName string
		ex      store.Exercise
		set     store.WorkoutSetWithDate
		e1rm    float64
		ratio   float64
		pctile  float64
		recent  bool
	}

	var matched []foundLift
	for _, pat := range patterns {
		var chosen *foundLift

		for _, ln := range pat.lifts {
			ex, ok := snap.exBySlug[ln.slug]
			if !ok {
				continue
			}
			var bestRecent *foundLift
			var bestLatest *foundLift

			for _, st := range snap.sets {
				if st.ExerciseID != ex.ID || st.IsWarmup || st.TotalWeightLb <= 0 || st.LocalDate > asOfStr {
					continue
				}
				reps := st.Reps
				if reps <= 0 {
					reps = maxInt(1, ex.DefaultReps)
				}
				e1rm := st.E1RMLb
				if e1rm <= 0 {
					e1rm = st.TotalWeightLb * (1.0 + float64(reps)/30.0)
				}
				ratio := e1rm / bw
				mid, k := ln.maleMid, ln.maleK
				if prefs.Sex == "female" {
					mid, k = ln.femMid, ln.femK
				}
				pctile := clamp(100.0/(1.0+math.Exp(-k*(ratio-mid))), 5, 99)
				cand := foundLift{
					patName: pat.name,
					ex:      ex,
					set:     st,
					e1rm:    math.Round(e1rm*10) / 10,
					ratio:   math.Round(ratio*100) / 100,
					pctile:  math.Round(pctile*10) / 10,
					recent:  st.LocalDate >= windowStartStr,
				}
				if cand.recent {
					if bestRecent == nil || cand.pctile > bestRecent.pctile {
						cp := cand
						bestRecent = &cp
					}
				}
				if bestLatest == nil || cand.set.LocalDate > bestLatest.set.LocalDate || (cand.set.LocalDate == bestLatest.set.LocalDate && cand.pctile > bestLatest.pctile) {
					cp := cand
					bestLatest = &cp
				}
			}

			// Prefer primary compound lift in priority order (don't let accessory goblet-squat override squat!)
			if bestRecent != nil {
				chosen = bestRecent
				break
			}
			if bestLatest != nil && chosen == nil {
				chosen = bestLatest
			}
		}

		if chosen != nil {
			matched = append(matched, *chosen)
		}
	}

	if len(matched) == 0 {
		card.PrimaryRaw = "No working sets logged"
		return card
	}

	sumPct := 0.0
	weightEach := int(math.Round(100.0 / float64(len(matched))))
	var rawHighlights []string
	for _, m := range matched {
		sumPct += m.pctile
		disp := liftDisplayWeight(m.ex, m.set.WorkoutSet)
		unit := "lb"
		if m.ex.LoadMode == "per_hand" {
			unit = "lb/h"
		}
		if len(rawHighlights) < 2 {
			rawHighlights = append(rawHighlights, fmt.Sprintf("%s %g %s", shortLiftName(m.ex.Name), math.Round(disp*10)/10, unit))
		}
		note := fmt.Sprintf("e1RM %g lb (%.2f× BW @ %.0f lb)", m.e1rm, m.ratio, bw)
		if !m.recent {
			note += fmt.Sprintf(" • last %s", m.set.LocalDate)
		}
		card.Breakdown = append(card.Breakdown, ScoreIngredient{
			Label:     fmt.Sprintf("%s (%s)", m.patName, m.ex.Name),
			RawValue:  fmt.Sprintf("%g %s × %d", math.Round(disp*10)/10, unit, m.set.Reps),
			Points:    math.Round(m.pctile),
			MaxPoints: 100,
			WeightPct: weightEach,
			Note:      note,
			MetricKey: "lift:" + m.ex.Slug,
		})
	}

	card.HasData = true
	card.Score = math.Round(sumPct / float64(len(matched)))
	card.PrimaryRaw = strings.Join(rawHighlights, " • ")
	card.SecondaryRaw = fmt.Sprintf("%d/%d movement patterns • %.0f lb BW ref", len(matched), len(patterns), bw)
	return card
}

func shortLiftName(name string) string {
	switch name {
	case "Bench Press":
		return "Bench"
	case "Dumbbell Row":
		return "DB Row"
	case "Incline Bench Press":
		return "Incline"
	case "Leg Press (Sled)":
		return "Leg Press"
	default:
		return name
	}
}

// evalCardioPillar computes FRIEND Registry / ACSM VO2max age & sex percentile (80%) + Weekly Aerobic Minutes vs 150m WHO/AHA target (20%).
func evalCardioPillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "cardio",
		Label:          "Cardio",
		ColorToken:     "--m3-amber",
		ScoreModel:     "percentile",
		ScoreModelNote: fmt.Sprintf("FRIEND Registry VO2max %s age-%d percentile + AHA weekly volume", prefs.Sex, prefs.Age),
		FormulaVersion: "cardio.friend_vo2.v1",
		MetricKey:      "pillar:cardio",
	}

	asOfStr := asOf.Format("2006-01-02")
	weekStartStr := asOf.AddDate(0, 0, -6).Format("2006-01-02")

	// Latest run <= asOf (runs are sorted newest-first from ListCardioActivities)
	var latestRun *store.CardioActivity
	weeklyRunMin := 0.0
	for i := range snap.runs {
		r := &snap.runs[i]
		if r.LocalDate > asOfStr {
			continue
		}
		if latestRun == nil || r.LocalDate > latestRun.LocalDate {
			latestRun = r
		}
		if r.LocalDate >= weekStartStr {
			weeklyRunMin += r.DurationS / 60.0
		}
	}

	// Latest daily summary <= asOf + trailing 7d AZM
	var latestDaily *store.DailySummary
	weeklyAZM := 0.0
	for i := len(snap.dailies) - 1; i >= 0; i-- {
		d := &snap.dailies[i]
		if d.LocalDate > asOfStr {
			continue
		}
		if latestDaily == nil {
			latestDaily = d
		}
		if d.LocalDate >= weekStartStr {
			weeklyAZM += float64(d.AZMMinutes)
		}
	}

	vo2 := 0.0
	vo2Source := ""
	if latestRun != nil && latestRun.VDOTOpen > 0 {
		vo2 = latestRun.VDOTOpen
		vo2Source = "Garmin .FIT VDOT"
	} else if latestDaily != nil && latestDaily.VO2GH > 0 {
		vo2 = latestDaily.VO2GH
		vo2Source = "Wearable VO2max"
	} else if latestDaily != nil && latestDaily.RHRBpm > 35 {
		maxHR := 208.0 - 0.7*float64(prefs.Age)
		vo2 = math.Round((15.3*(maxHR/latestDaily.RHRBpm))*10) / 10
		vo2Source = "Estimated from RHR"
	}

	if vo2 <= 0 {
		card.PrimaryRaw = "No runs or VO2 data yet"
		return card
	}

	// FRIEND Registry age & sex reference median + SD
	ageOffset := math.Max(0, float64(prefs.Age-25))
	median := 44.0 - 0.34*ageOffset
	sd := 8.0
	if prefs.Sex == "female" {
		median = 36.5 - 0.29*ageOffset
		sd = 7.0
	}
	z := (vo2 - median) / sd
	vo2Pctile := clamp(100.0/(1.0+math.Exp(-1.702*z)), 5, 99)

	aerobicMin := math.Max(weeklyRunMin, weeklyAZM)
	volScore := clamp((aerobicMin/150.0)*100.0, 10, 100)

	vo2Pts := math.Round(vo2Pctile*0.80*10) / 10
	volPts := math.Round(volScore*0.20*10) / 10
	totalScore := math.Round(clamp(vo2Pts+volPts, 5, 99))

	card.HasData = true
	card.Score = totalScore

	z2Txt := ""
	if latestRun != nil && latestRun.Zone2PaceSecPerMi > 0 {
		z2Txt = fmt.Sprintf("Z2 %d:%02d/mi", int(latestRun.Zone2PaceSecPerMi)/60, int(math.Round(math.Mod(latestRun.Zone2PaceSecPerMi, 60))))
	}
	if z2Txt != "" {
		card.PrimaryRaw = fmt.Sprintf("VO2 %.1f • %s", vo2, z2Txt)
	} else {
		card.PrimaryRaw = fmt.Sprintf("VO2 %.1f mL/kg", vo2)
	}
	if latestDaily != nil && latestDaily.RHRBpm > 0 {
		card.SecondaryRaw = fmt.Sprintf("RHR %.0f bpm • %.0f aerobic min/wk", latestDaily.RHRBpm, aerobicMin)
	} else {
		card.SecondaryRaw = fmt.Sprintf("%.0f aerobic min / 150m target", aerobicMin)
	}

	card.Breakdown = []ScoreIngredient{
		{
			Label:     "Aerobic Capacity (VO2max / VDOT)",
			RawValue:  fmt.Sprintf("%.1f mL/kg (%.0fth %%ile)", vo2, vo2Pctile),
			Points:    vo2Pts,
			MaxPoints: 80,
			WeightPct: 80,
			Note:      fmt.Sprintf("%s • FRIEND median %.1f for %s age %d", vo2Source, median, prefs.Sex, prefs.Age),
			MetricKey: "vo2",
		},
		{
			Label:     "Weekly Aerobic Volume",
			RawValue:  fmt.Sprintf("%.0f min / 150 min", aerobicMin),
			Points:    volPts,
			MaxPoints: 20,
			WeightPct: 20,
			Note:      "AHA/WHO 150 min/wk aerobic target (trailing 7d)",
			MetricKey: "vo2",
		},
	}
	if latestDaily != nil && latestDaily.RHRBpm > 0 {
		card.Breakdown = append(card.Breakdown, ScoreIngredient{
			Label:     "Resting Heart Rate (Context)",
			RawValue:  fmt.Sprintf("%.0f bpm", latestDaily.RHRBpm),
			Points:    0,
			MaxPoints: 0,
			WeightPct: 0,
			Note:      "Lower RHR tracks improving stroke volume & recovery",
			MetricKey: "rhr",
		})
	}
	return card
}

// evalSleepPillar computes Buysse's RU-SATED + Sleep Regularity Index (0-100 clinical optimum) over trailing 7 nights.
func evalSleepPillar(snap *rawSnapshot, _ *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "sleep",
		Label:          "Sleep",
		ColorToken:     "--m3-blue",
		ScoreModel:     "optimum",
		ScoreModelNote: "RU-SATED clinical optimum (Duration + Efficiency + Regularity + Stages)",
		FormulaVersion: "sleep.ru_sated.v1",
		MetricKey:      "pillar:sleep",
	}

	asOfStr := asOf.Format("2006-01-02")
	weekStartStr := asOf.AddDate(0, 0, -6).Format("2006-01-02")

	var recent []store.SleepSession
	for _, sl := range snap.sleeps {
		if sl.LocalDate >= weekStartStr && sl.LocalDate <= asOfStr {
			recent = append(recent, sl)
		}
	}
	if len(recent) == 0 {
		// Fall back to latest available sleep session <= asOf
		for i := len(snap.sleeps) - 1; i >= 0; i-- {
			if snap.sleeps[i].LocalDate <= asOfStr {
				recent = append(recent, snap.sleeps[i])
				break
			}
		}
	}
	if len(recent) == 0 {
		card.PrimaryRaw = "No sleep sessions yet"
		return card
	}

	var sumAsleepMin, sumEff, sumRestShare float64
	var bedMinutes []float64
	for _, sl := range recent {
		asleep := float64(sl.DeepMin + sl.REMMin + sl.LightMin)
		if asleep <= 0 {
			continue
		}
		sumAsleepMin += asleep
		eff := sl.EfficiencyPct
		if eff <= 0 {
			tot := asleep + float64(sl.AwakeMin)
			if tot > 0 {
				eff = (asleep / tot) * 100.0
			}
		}
		sumEff += eff
		sumRestShare += float64(sl.DeepMin+sl.REMMin) / asleep

		if !sl.StartTS.IsZero() {
			m := float64(sl.StartTS.Hour()*60 + sl.StartTS.Minute())
			if m < 12*60 {
				m += 24 * 60 // Normalize post-midnight bedtimes (e.g., 00:25 -> 1465m)
			}
			bedMinutes = append(bedMinutes, m)
		}
	}
	n := float64(len(recent))
	avgMin := sumAsleepMin / n
	avgHrs := avgMin / 60.0
	avgEff := sumEff / n
	avgRestPct := (sumRestShare / n) * 100.0

	// 1. Duration (35 pts): peak 7.5h-8.5h, smooth taper outside
	var durPts float64
	switch {
	case avgHrs >= 7.5 && avgHrs <= 8.5:
		durPts = 35.0
	case avgHrs < 7.5:
		durPts = clamp(((avgHrs-4.5)/3.0)*35.0, 0, 35)
	default:
		durPts = clamp(35.0-(avgHrs-8.5)*10.0, 15, 35)
	}

	// 2. Efficiency (25 pts): NSF clinical optimum >= 90%
	effPts := clamp(((avgEff-70.0)/20.0)*25.0, 0, 25)

	// 3. Regularity (20 pts): Bedtime std-dev across trailing nights (<= 20m = 20 pts, 90m+ = 3 pts)
	regStdMin := 22.0
	regPts := 18.0
	if len(bedMinutes) >= 2 {
		mean := 0.0
		for _, m := range bedMinutes {
			mean += m
		}
		mean /= float64(len(bedMinutes))
		varSq := 0.0
		for _, m := range bedMinutes {
			d := m - mean
			varSq += d * d
		}
		regStdMin = math.Sqrt(varSq / float64(len(bedMinutes)))
		regPts = clamp(20.0-math.Max(0, regStdMin-20.0)*(17.0/70.0), 3, 20)
	}

	// 4. Restorative Architecture (20 pts): Deep + REM >= 40%
	archPts := clamp((avgRestPct/40.0)*20.0, 4, 20)

	total := math.Round(clamp(durPts+effPts+regPts+archPts, 10, 100))
	hrs := int(avgMin) / 60
	mins := int(math.Round(avgMin)) % 60

	card.HasData = true
	card.Score = total
	card.PrimaryRaw = fmt.Sprintf("%dh %02dm avg • %.0f%% eff", hrs, mins, avgEff)
	card.SecondaryRaw = fmt.Sprintf("±%.0fm bedtime • %.0f%% Deep+REM (%d nights)", regStdMin, avgRestPct, len(recent))
	card.Breakdown = []ScoreIngredient{
		{
			Label:     "Duration (7d Avg)",
			RawValue:  fmt.Sprintf("%dh %02dm", hrs, mins),
			Points:    math.Round(durPts*10) / 10,
			MaxPoints: 35,
			WeightPct: 35,
			Note:      "NSF optimum: 7.5–8.5 hrs/night",
			MetricKey: "sleep",
		},
		{
			Label:     "Sleep Efficiency",
			RawValue:  fmt.Sprintf("%.1f%%", avgEff),
			Points:    math.Round(effPts*10) / 10,
			MaxPoints: 25,
			WeightPct: 25,
			Note:      "Time asleep / time in bed (≥ 90% = full pts)",
			MetricKey: "sleep",
		},
		{
			Label:     "Bedtime Regularity",
			RawValue:  fmt.Sprintf("±%.0f min SD", regStdMin),
			Points:    math.Round(regPts*10) / 10,
			MaxPoints: 20,
			WeightPct: 20,
			Note:      "7-night bedtime consistency (≤ 20m = full pts)",
			MetricKey: "sleep",
		},
		{
			Label:     "Deep + REM Share",
			RawValue:  fmt.Sprintf("%.0f%% restorative", avgRestPct),
			Points:    math.Round(archPts*10) / 10,
			MaxPoints: 20,
			WeightPct: 20,
			Note:      "Combined Deep (13–23%) + REM (20–25%) target ≥ 40%",
			MetricKey: "sleep",
		},
	}
	return card
}

// evalFlexibilityPillar combines Functional ROM Benchmarks (65%) + Weekly Mobility Minutes (35%),
// or 100% from whichever source has data.
func evalFlexibilityPillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "flexibility",
		Label:          "Flexibility",
		ColorToken:     "--m3-teal",
		ScoreModel:     "optimum",
		ScoreModelNote: "Functional full pain-free ROM benchmarks + weekly mobility volume",
		FormulaVersion: "flexibility.rom_vol.v1",
		MetricKey:      "pillar:flexibility",
	}

	asOfStr := asOf.Format("2006-01-02")
	weekStartStr := asOf.AddDate(0, 0, -6).Format("2006-01-02")

	// Weekly mobility minutes from check-ins
	weeklyMobMin := 0
	hasMobLog := false
	for _, c := range snap.checkins {
		if c.LocalDate >= weekStartStr && c.LocalDate <= asOfStr && c.MobilityMin > 0 {
			weeklyMobMin += c.MobilityMin
			hasMobLog = true
		}
	}

	// Latest ROM test per slug <= asOf
	latestROM := map[string]store.MobilityTest{}
	for _, mt := range snap.mobTests {
		if mt.LocalDate <= asOfStr {
			latestROM[mt.TestSlug] = mt
		}
	}

	if !hasMobLog && len(latestROM) == 0 {
		card.PrimaryRaw = "Log mobility min or ROM test"
		return card
	}

	type romRule struct {
		slug   string
		label  string
		target string
		score  func(float64) float64
	}
	rules := []romRule{
		{"ankle_ktw_cm", "Ankle Knee-to-Wall", "≥ 10 cm", func(v float64) float64 { return clamp((v/10.0)*100.0, 10, 100) }},
		{"sit_reach_in", "Sit & Reach", "≥ +2 in", func(v float64) float64 { return clamp(((v+6.0)/8.0)*100.0, 10, 100) }},
		{"shoulder_flex_deg", "Overhead Shoulder Flexion", "≥ 175°", func(v float64) float64 { return clamp(((v-120.0)/55.0)*100.0, 10, 100) }},
		{"deep_squat_score", "Deep Squat Hold", "5 / 5", func(v float64) float64 { return clamp((v/5.0)*100.0, 15, 100) }},
	}

	romSum := 0.0
	romCnt := 0
	var romBreakdown []ScoreIngredient
	for _, r := range rules {
		mt, ok := latestROM[r.slug]
		if !ok {
			continue
		}
		sc := math.Round(r.score(mt.ValueNum))
		romSum += sc
		romCnt++
		romBreakdown = append(romBreakdown, ScoreIngredient{
			Label:     r.label,
			RawValue:  fmt.Sprintf("%g %s", mt.ValueNum, mt.Unit),
			Points:    sc,
			MaxPoints: 100,
			Note:      fmt.Sprintf("Full ROM target: %s (%s)", r.target, mt.LocalDate),
			MetricKey: "flexibility",
		})
	}

	targetMin := float64(maxInt(15, prefs.MobilityWeeklyTargetMin))
	volScore := clamp((float64(weeklyMobMin)/targetMin)*100.0, 0, 100)

	var total float64
	if romCnt > 0 && hasMobLog {
		romAvg := romSum / float64(romCnt)
		total = math.Round(romAvg*0.65 + volScore*0.35)
		eachW := int(math.Round(65.0 / float64(romCnt)))
		for i := range romBreakdown {
			romBreakdown[i].WeightPct = eachW
		}
		card.Breakdown = append(romBreakdown, ScoreIngredient{
			Label:     "Weekly Mobility Volume",
			RawValue:  fmt.Sprintf("%d min / %.0f min", weeklyMobMin, targetMin),
			Points:    math.Round(volScore*0.35*10) / 10,
			MaxPoints: 35,
			WeightPct: 35,
			Note:      "Trailing 7-day mobility / stretching minutes",
			MetricKey: "flexibility",
		})
		card.PrimaryRaw = fmt.Sprintf("%d min/wk • %d ROM tests", weeklyMobMin, romCnt)
	} else if romCnt > 0 {
		total = math.Round(romSum / float64(romCnt))
		eachW := int(math.Round(100.0 / float64(romCnt)))
		for i := range romBreakdown {
			romBreakdown[i].WeightPct = eachW
		}
		card.Breakdown = romBreakdown
		card.PrimaryRaw = fmt.Sprintf("%d ROM benchmarks avg %.0f%%", romCnt, total)
	} else {
		total = math.Round(volScore)
		card.Breakdown = []ScoreIngredient{{
			Label:     "Weekly Mobility Volume",
			RawValue:  fmt.Sprintf("%d min / %.0f min", weeklyMobMin, targetMin),
			Points:    total,
			MaxPoints: 100,
			WeightPct: 100,
			Note:      "Add ROM benchmarks in + Check-In to measure joint range directly",
			MetricKey: "flexibility",
		}}
		card.PrimaryRaw = fmt.Sprintf("%d / %.0f min this week", weeklyMobMin, targetMin)
	}

	card.HasData = true
	card.Score = total
	return card
}

func evalWeightPillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "weight",
		Label:          "Weight",
		ColorToken:     "--m3-teal",
		ScoreModel:     "optimum",
		ScoreModelNote: fmt.Sprintf("7-day EWMA proximity to %.1f lb target (±2 lb = 100)", prefs.WeightTargetLb),
		FormulaVersion: "weight.ewma_target.v1",
		MetricKey:      "weight",
	}

	asOfStr := asOf.Format("2006-01-02")
	var latest *store.BodyMeasurement
	for i := len(snap.body) - 1; i >= 0; i-- {
		if snap.body[i].LocalDate <= asOfStr && snap.body[i].WeightLb > 0 {
			cp := snap.body[i]
			latest = &cp
			break
		}
	}
	if latest == nil {
		card.PrimaryRaw = "No weigh-ins yet"
		return card
	}

	ewma := latest.EWMAWeightLb
	if ewma <= 0 {
		ewma = latest.WeightLb
	}
	diff := math.Abs(ewma - prefs.WeightTargetLb)
	excess := math.Max(0, diff-2.0)
	score := math.Round(clamp(100.0-excess*3.5, 10, 100))

	card.HasData = true
	card.Score = score
	card.PrimaryRaw = fmt.Sprintf("%.1f lb EWMA", ewma)
	card.SecondaryRaw = fmt.Sprintf("Scale %.1f lb • Target %.1f lb", latest.WeightLb, prefs.WeightTargetLb)
	card.Breakdown = []ScoreIngredient{
		{
			Label:     "7-Day EWMA Trend Weight",
			RawValue:  fmt.Sprintf("%.1f lb", ewma),
			Points:    score,
			MaxPoints: 100,
			WeightPct: 100,
			Note:      fmt.Sprintf("Target %.1f lb (±2 lb band = 100) • Raw scale %.1f lb on %s", prefs.WeightTargetLb, latest.WeightLb, latest.LocalDate),
			MetricKey: "weight",
		},
	}
	return card
}

func evalBodyFatPillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "body_fat",
		Label:          "Body Fat",
		ColorToken:     "--m3-teal",
		ScoreModel:     "optimum",
		ScoreModelNote: fmt.Sprintf("ACE / clinical athletic band (%.0f–%.0f%% = 100)", prefs.BFOptLow, prefs.BFOptHigh),
		FormulaVersion: "bodyfat.ace_band.v1",
		MetricKey:      "body_fat",
	}

	asOfStr := asOf.Format("2006-01-02")
	var latest *store.BodyMeasurement
	for i := len(snap.body) - 1; i >= 0; i-- {
		if snap.body[i].LocalDate <= asOfStr && snap.body[i].BodyFatPct > 0 {
			cp := snap.body[i]
			latest = &cp
			break
		}
	}
	if latest == nil {
		card.PrimaryRaw = "No body fat entries yet"
		return card
	}

	bf := latest.BodyFatPct
	var score float64
	switch {
	case bf >= prefs.BFOptLow && bf <= prefs.BFOptHigh:
		score = 100
	case bf > prefs.BFOptHigh:
		score = clamp(100.0-(bf-prefs.BFOptHigh)*6.0, 10, 100)
	default:
		score = clamp(100.0-(prefs.BFOptLow-bf)*8.0, 20, 100)
	}
	score = math.Round(score)

	// Optional latest waist circumference from check-ins
	waist := 0.0
	for i := len(snap.checkins) - 1; i >= 0; i-- {
		if snap.checkins[i].LocalDate <= asOfStr && snap.checkins[i].WaistIn > 0 {
			waist = snap.checkins[i].WaistIn
			break
		}
	}

	card.HasData = true
	card.Score = score
	if latest.LeanMassLb > 0 {
		card.PrimaryRaw = fmt.Sprintf("%.1f%% BF • %.1f lb lean", bf, latest.LeanMassLb)
	} else {
		card.PrimaryRaw = fmt.Sprintf("%.1f%% Body Fat", bf)
	}
	if waist > 0 {
		card.SecondaryRaw = fmt.Sprintf("Waist %.1f in • Target %.0f–%.0f%%", waist, prefs.BFOptLow, prefs.BFOptHigh)
	} else {
		card.SecondaryRaw = fmt.Sprintf("Optimal band %.0f–%.0f%% (%s)", prefs.BFOptLow, prefs.BFOptHigh, latest.LocalDate)
	}

	card.Breakdown = []ScoreIngredient{
		{
			Label:     "Body Fat Percentage",
			RawValue:  fmt.Sprintf("%.1f%%", bf),
			Points:    score,
			MaxPoints: 100,
			WeightPct: 100,
			Note:      fmt.Sprintf("Target athletic band %.0f–%.0f%%", prefs.BFOptLow, prefs.BFOptHigh),
			MetricKey: "body_fat",
		},
	}
	if waist > 0 {
		card.Breakdown = append(card.Breakdown, ScoreIngredient{
			Label:     "Waist Tape (Objective Cross-Check)",
			RawValue:  fmt.Sprintf("%.1f in", waist),
			Points:    0,
			MaxPoints: 0,
			WeightPct: 0,
			Note:      "Tracks visceral fat trend without smart-scale BIA hydration noise",
			MetricKey: "body_fat",
		})
	}
	return card
}

func evalScreenTimePillar(snap *rawSnapshot, prefs *store.UserPreferences, asOf time.Time) PillarCard {
	card := PillarCard{
		Key:            "screen_time",
		Label:          "Screen Time",
		ColorToken:     "--m3-coral",
		ScoreModel:     "optimum",
		ScoreModelNote: fmt.Sprintf("Inverted daily budget (≤ %s = 100)", formatHoursMin(prefs.ScreenTimeTargetMin)),
		FormulaVersion: "screentime.budget.v1",
		MetricKey:      "screen_time",
	}

	asOfStr := asOf.Format("2006-01-02")
	weekStartStr := asOf.AddDate(0, 0, -6).Format("2006-01-02")

	sumMin := 0
	cnt := 0
	for _, c := range snap.checkins {
		if c.LocalDate >= weekStartStr && c.LocalDate <= asOfStr && c.ScreenTimeMin > 0 {
			sumMin += c.ScreenTimeMin
			cnt++
		}
	}
	if cnt == 0 {
		// Fall back to latest screen time entry <= asOf
		for i := len(snap.checkins) - 1; i >= 0; i-- {
			if snap.checkins[i].LocalDate <= asOfStr && snap.checkins[i].ScreenTimeMin > 0 {
				sumMin = snap.checkins[i].ScreenTimeMin
				cnt = 1
				break
			}
		}
	}
	if cnt == 0 {
		card.PrimaryRaw = "Log daily screen time"
		return card
	}

	avgMin := float64(sumMin) / float64(cnt)
	target := float64(maxInt(30, prefs.ScreenTimeTargetMin))
	over := math.Max(0, avgMin-target)
	score := math.Round(clamp(100.0-(over/240.0)*100.0, 0, 100))

	card.HasData = true
	card.Score = score
	card.PrimaryRaw = fmt.Sprintf("%s / day", formatHoursMin(int(math.Round(avgMin))))
	card.SecondaryRaw = fmt.Sprintf("Target ≤ %s (%d-day avg)", formatHoursMin(int(target)), cnt)
	card.Breakdown = []ScoreIngredient{
		{
			Label:     "Daily Non-Work Screen Time",
			RawValue:  formatHoursMin(int(math.Round(avgMin))),
			Points:    score,
			MaxPoints: 100,
			WeightPct: 100,
			Note:      fmt.Sprintf("Target ≤ %s (100 pts); loses ~25 pts per extra hour over budget", formatHoursMin(int(target))),
			MetricKey: "screen_time",
		},
	}
	return card
}

func formatHoursMin(mins int) string {
	if mins <= 0 {
		return "0m"
	}
	h := mins / 60
	m := mins % 60
	if h == 0 {
		return fmt.Sprintf("%dm", m)
	}
	return fmt.Sprintf("%dh %02dm", h, m)
}

// buildPillarTrend dynamically computes historical 0-100 pillar scores on demand using the CURRENT formula & user_preferences!
func (e *Engine) buildPillarTrend(ctx context.Context, userID, pillarKey, horizon string, refDate time.Time) (*TrendPayload, error) {
	prefs, err := e.repo.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}
	snap, err := e.loadRawSnapshot(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Collect meaningful evaluation dates from raw events (plus weekly anchor points across window)
	dateSet := map[string]bool{refDate.Format("2006-01-02"): true}
	switch pillarKey {
	case "strength":
		for _, st := range snap.sets {
			if !st.IsWarmup {
				dateSet[st.LocalDate] = true
			}
		}
	case "cardio":
		for _, r := range snap.runs {
			dateSet[r.LocalDate] = true
		}
		for _, d := range snap.dailies {
			if d.VO2GH > 0 || d.AZMMinutes > 0 {
				dateSet[d.LocalDate] = true
			}
		}
	case "sleep":
		for _, sl := range snap.sleeps {
			dateSet[sl.LocalDate] = true
		}
	case "flexibility":
		for _, c := range snap.checkins {
			if c.MobilityMin > 0 {
				dateSet[c.LocalDate] = true
			}
		}
		for _, mt := range snap.mobTests {
			dateSet[mt.LocalDate] = true
		}
	case "screen_time":
		for _, c := range snap.checkins {
			if c.ScreenTimeMin > 0 {
				dateSet[c.LocalDate] = true
			}
		}
	case "weight", "body_fat":
		for _, b := range snap.body {
			dateSet[b.LocalDate] = true
		}
	default:
		return nil, fmt.Errorf("unknown pillar %q", pillarKey)
	}

	dates := make([]string, 0, len(dateSet))
	for d := range dateSet {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	var samples []rawSample
	var latestCard PillarCard
	for _, ds := range dates {
		dt, err := time.Parse("2006-01-02", ds)
		if err != nil || dt.After(refDate) {
			continue
		}
		c := evaluatePillar(pillarKey, snap, prefs, dt)
		if c.HasData {
			samples = append(samples, rawSample{Date: dt, Value: c.Score})
			latestCard = c
		}
	}
	if latestCard.Key == "" {
		latestCard = evaluatePillar(pillarKey, snap, prefs, refDate)
	}

	gapThresh := 21
	if pillarKey == "sleep" || pillarKey == "screen_time" {
		gapThresh = 7
	}
	modelLbl := "Optimum"
	if latestCard.ScoreModel == "percentile" {
		modelLbl = "Percentile"
	}
	return bucketizeAndAnalyze(bucketConfig{
		Key:           "pillar:" + pillarKey,
		Category:      "pillar",
		Label:         latestCard.Label + " Score",
		Title:         fmt.Sprintf("%s Composite (%s • %s)", latestCard.Label, modelLbl, latestCard.FormulaVersion),
		Unit:          "pts",
		ColorToken:    latestCard.ColorToken,
		Horizon:       horizon,
		RefDate:       refDate,
		Samples:       samples,
		GapDaysThresh: gapThresh,
		AggregateMax:  pillarKey == "strength" || pillarKey == "cardio",
	}), nil
}
