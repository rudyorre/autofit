package api

import (
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/rudyorre/autofit/internal/analytics"
	"github.com/rudyorre/autofit/internal/auth"
	"github.com/rudyorre/autofit/internal/store"
)

func (s *Server) handleUpdatePreferences(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	cur, err := s.repo.GetUserPreferences(ctx, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	var req store.UserPreferences
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json: " + err.Error()})
		return
	}
	req.UserID = userID
	if req.Sex == "" {
		req.Sex = cur.Sex
	}
	if req.Age == 0 {
		req.Age = cur.Age
	}
	if req.BFOptLow <= 0 {
		req.BFOptLow = cur.BFOptLow
	}
	if req.BFOptHigh <= 0 {
		req.BFOptHigh = cur.BFOptHigh
	}
	if req.WeightTargetLb <= 0 {
		req.WeightTargetLb = cur.WeightTargetLb
	}
	if req.ScreenTimeTargetMin <= 0 {
		req.ScreenTimeTargetMin = cur.ScreenTimeTargetMin
	}
	if req.MobilityWeeklyTargetMin <= 0 {
		req.MobilityWeeklyTargetMin = cur.MobilityWeeklyTargetMin
	}
	if req.FormulaWeights == nil {
		req.FormulaWeights = cur.FormulaWeights
	}

	if err := s.repo.UpsertUserPreferences(ctx, &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	overview, _ := s.engine.BuildPillarDashboard(ctx, userID, time.Now().UTC())
	writeJSON(w, http.StatusOK, map[string]any{
		"preferences": req,
		"overview":    overview,
	})
}

func (s *Server) handleUpdateActivePhase(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	cur, err := s.repo.GetActiveTrainingPhase(ctx, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	var req store.TrainingPhase
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json: " + err.Error()})
		return
	}
	if req.ID == "" {
		req.ID = cur.ID
	}
	req.UserID = userID
	req.IsActive = true
	if strings.TrimSpace(req.Name) == "" {
		req.Name = cur.Name
	}
	if req.StartDate == "" {
		req.StartDate = cur.StartDate
	}
	if len(req.FocusPillars) == 0 {
		req.FocusPillars = cur.FocusPillars
	}
	// Cap active focus pillars to 2 to preserve the Focus + Maintenance mental model
	if len(req.FocusPillars) > 2 {
		req.FocusPillars = req.FocusPillars[:2]
	}
	if len(req.Targets) == 0 {
		req.Targets = cur.Targets
	}
	if len(req.Floors) == 0 {
		req.Floors = cur.Floors
	}

	if err := s.repo.UpsertTrainingPhase(ctx, &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	overview, _ := s.engine.BuildPillarDashboard(ctx, userID, time.Now().UTC())
	writeJSON(w, http.StatusOK, map[string]any{
		"phase":    req,
		"overview": overview,
	})
}

type mobilityTestInput struct {
	TestSlug string  `json:"test_slug"`
	ValueNum float64 `json:"value_num"`
	Unit     string  `json:"unit"`
}

type unifiedCheckinReq struct {
	LocalDate          string              `json:"local_date"`
	WeightLb           float64             `json:"weight_lb"`
	BodyFatPct         float64             `json:"body_fat_pct"`
	WaistIn            float64             `json:"waist_in"`
	ScreenTimeMin      int                 `json:"screen_time_min"`
	MobilityMin        int                 `json:"mobility_min"`
	SleepHours         float64             `json:"sleep_hours"`
	SleepEfficiencyPct float64             `json:"sleep_efficiency_pct"`
	CardioMin          float64             `json:"cardio_min"`
	CardioDistanceMi   float64             `json:"cardio_distance_mi"`
	CardioAvgHR        int                 `json:"cardio_avg_hr"`
	MobilityTests      []mobilityTestInput `json:"mobility_tests"`
	Notes              string              `json:"notes"`
	Source             string              `json:"source"`
}

// handleLogCheckin provides a single unified fast-input endpoint (also suitable for iOS Shortcuts / Android webhooks!)
// for any combination of daily or weekly raw inputs across all 7 pillars.
func (s *Server) handleLogCheckin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	var req unifiedCheckinReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json: " + err.Error()})
		return
	}
	localDate := strings.TrimSpace(req.LocalDate)
	if localDate == "" {
		localDate = time.Now().UTC().Format("2006-01-02")
	}
	dt, err := time.Parse("2006-01-02", localDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "local_date must be YYYY-MM-DD"})
		return
	}
	source := strings.TrimSpace(req.Source)
	if source == "" {
		source = "manual_checkin"
	}

	logged := []string{}

	// 1. Daily check-in row (screen time, mobility minutes, waist tape)
	if req.ScreenTimeMin > 0 || req.MobilityMin > 0 || req.WaistIn > 0 || strings.TrimSpace(req.Notes) != "" {
		if err := s.repo.UpsertDailyCheckin(ctx, &store.DailyCheckin{
			UserID:        userID,
			LocalDate:     localDate,
			ScreenTimeMin: req.ScreenTimeMin,
			MobilityMin:   req.MobilityMin,
			WaistIn:       req.WaistIn,
			Notes:         strings.TrimSpace(req.Notes),
			Source:        source,
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		if req.ScreenTimeMin > 0 {
			logged = append(logged, "screen time")
		}
		if req.MobilityMin > 0 {
			logged = append(logged, "mobility")
		}
		if req.WaistIn > 0 {
			logged = append(logged, "waist")
		}
	}

	// 2. Functional Joint ROM Mobility Benchmarks
	for _, mt := range req.MobilityTests {
		if strings.TrimSpace(mt.TestSlug) == "" {
			continue
		}
		unit := mt.Unit
		if unit == "" {
			switch mt.TestSlug {
			case "ankle_ktw_cm":
				unit = "cm"
			case "sit_reach_in":
				unit = "in"
			case "shoulder_flex_deg":
				unit = "deg"
			default:
				unit = "/5"
			}
		}
		if err := s.repo.UpsertMobilityTest(ctx, &store.MobilityTest{
			UserID:    userID,
			LocalDate: localDate,
			TestSlug:  mt.TestSlug,
			ValueNum:  mt.ValueNum,
			Unit:      unit,
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
	}
	if len(req.MobilityTests) > 0 {
		logged = append(logged, "ROM tests")
	}

	// 3. Body Weight & Body Fat %
	if req.WeightLb > 0 || req.BodyFatPct > 0 {
		wLb := req.WeightLb
		if wLb <= 0 {
			// Carry latest weight if user logged BF% alone
			bodyList, _ := s.repo.ListBodyMeasurements(ctx, userID)
			if len(bodyList) > 0 {
				wLb = bodyList[len(bodyList)-1].WeightLb
			}
		}
		if wLb > 0 {
			lean := 0.0
			if req.BodyFatPct > 0 {
				lean = math.Round(wLb*(1.0-req.BodyFatPct/100.0)*10) / 10
			}
			bm := &store.BodyMeasurement{
				UserID:     userID,
				MeasuredAt: dt.Add(8 * time.Hour),
				LocalDate:  localDate,
				WeightLb:   wLb,
				BodyFatPct: req.BodyFatPct,
				LeanMassLb: lean,
				Source:     source,
			}
			if err := s.repo.UpsertBodyMeasurement(ctx, bm); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
				return
			}
			_ = s.repo.RecomputeBodyEWMA(ctx, userID)
			logged = append(logged, "body")
		}
	}

	// 4. Optional Quick Sleep Session Entry (if not auto-synced from wearable)
	if req.SleepHours > 0 {
		totalMin := int(math.Round(req.SleepHours * 60.0))
		eff := req.SleepEfficiencyPct
		if eff <= 0 {
			eff = 90.0
		}
		deepMin := int(math.Round(float64(totalMin) * 0.19))
		remMin := int(math.Round(float64(totalMin) * 0.22))
		lightMin := totalMin - deepMin - remMin
		awakeMin := int(math.Round(float64(totalMin)*(100.0/math.Max(60.0, eff)-1.0)))
		openScore := analytics.ComputeOpenSleepScore(deepMin, remMin, lightMin, awakeMin, eff)
		startTS := dt.Add(-1 * time.Hour) // 23:00 previous evening default
		endTS := startTS.Add(time.Duration(totalMin+awakeMin) * time.Minute)

		if err := s.repo.UpsertSleepSession(ctx, &store.SleepSession{
			UserID:         userID,
			LocalDate:      localDate,
			StartTS:        startTS,
			EndTS:          endTS,
			EfficiencyPct:  eff,
			DeepMin:        deepMin,
			REMMin:         remMin,
			LightMin:       lightMin,
			AwakeMin:       awakeMin,
			BedtimeLabel:   "11:00 PM",
			SleepScoreOpen: openScore,
			Source:         source,
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		logged = append(logged, "sleep")
	}

	// 5. Optional Quick Cardio / Run Entry (when not uploading a Garmin .FIT file)
	if req.CardioMin > 0 {
		distM := req.CardioDistanceMi * 1609.344
		durS := req.CardioMin * 60.0
		vdot := 0.0
		if distM >= 1000 && durS >= 180 {
			vdot = analytics.ComputeOpenVDOT(distM, durS, 0)
		}
		avgHR := req.CardioAvgHR
		if avgHR <= 0 {
			avgHR = 148
		}
		trimp := analytics.ComputeBanisterTRIMP(req.CardioMin, avgHR, 52, 192)
		z2Pace := 0.0
		if req.CardioDistanceMi > 0 {
			z2Pace = durS / req.CardioDistanceMi
		}
		if err := s.repo.UpsertCardioActivity(ctx, &store.CardioActivity{
			UserID:            userID,
			StartedAt:         dt.Add(17 * time.Hour),
			LocalDate:         localDate,
			Title:             "Cardio Session (Quick Check-In)",
			Sport:             "running",
			DistanceM:         math.Round(distM),
			DurationS:         math.Round(durS),
			AvgHR:             avgHR,
			MaxHR:             avgHR + 14,
			AvgCadence:        176,
			VDOTOpen:          vdot,
			Zone2PaceSecPerMi: math.Round(z2Pace),
			TRIMP:             trimp,
			Source:            source,
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		logged = append(logged, "cardio")
	}

	overview, _ := s.engine.BuildPillarDashboard(ctx, userID, dt)
	writeJSON(w, http.StatusOK, map[string]any{
		"local_date": localDate,
		"logged":     logged,
		"overview":   overview,
	})
}
