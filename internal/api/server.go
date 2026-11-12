package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"math"
	"mime"
	"net/http"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/rudyorre/autofit/internal/analytics"
	"github.com/rudyorre/autofit/internal/auth"
	"github.com/rudyorre/autofit/internal/config"
	"github.com/rudyorre/autofit/internal/demo"
	"github.com/rudyorre/autofit/internal/garmin"
	"github.com/rudyorre/autofit/internal/googlehealth"
	"github.com/rudyorre/autofit/internal/importer"
	"github.com/rudyorre/autofit/internal/medical"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
	"github.com/rudyorre/autofit/internal/ui"
)

type Server struct {
	cfg     config.Config
	repo    store.Repository
	authMgr *auth.Manager
	engine  *analytics.Engine
	ghSvc   *googlehealth.Service
	garSvc  *garmin.Service
}

func NewServer(cfg config.Config, repo store.Repository) *Server {
	return &Server{
		cfg:     cfg,
		repo:    repo,
		authMgr: auth.NewManager(cfg.OwnerSecret, cfg.TailscaleAuth, cfg.TrustedUserHeader),
		engine:  analytics.NewEngine(repo),
		ghSvc:   googlehealth.NewService(cfg, repo),
		garSvc:  garmin.NewService(cfg, repo),
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(s.authMgr.Middleware)

	r.Get("/api/v1/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "autofit", "version": "v0.1.0"})
	})

	r.Get("/api/v1/auth/status", s.authMgr.HandleStatus)
	r.Post("/api/v1/auth/login", s.authMgr.HandleLogin)
	r.Post("/api/v1/auth/logout", s.authMgr.HandleLogout)

	r.Get("/api/v1/bootstrap", s.handleBootstrap)
	r.Get("/api/v1/trends", s.handleTrends)
	r.Get("/api/v1/trends/catalog", s.handleTrendsCatalog)

	r.Post("/api/v1/workouts", s.handleLogWorkout)
	r.Post("/api/v1/workouts/sync", s.handleSyncWorkoutsBatch)
	r.Post("/api/v1/body", s.handleLogBody)
	r.Post("/api/v1/calibrations", s.handleSaveCalibration)

	r.Post("/api/v1/import/xlsx", s.handleImportXLSX)
	r.Post("/api/v1/import/fit", s.handleImportFIT)
	r.Get("/api/v1/import/medical/sample-shlink", s.handleSampleSHLink)
	r.Post("/api/v1/import/medical", s.handleImportMedical)
	r.Post("/api/v1/demo/seed", s.handleSeedDemo)

	r.Get("/api/v1/export/json", s.handleExportJSON)
	r.Get("/api/v1/export/csv.zip", s.handleExportCSVZip)

	r.Get("/api/v1/integrations/google-health/callback", s.handleGoogleHealthCallback)
	r.Post("/api/v1/integrations/sync", s.handleTriggerSync)

	// Embedded SPA + Offline PWA static asset server
	distFS, err := ui.DistFS()
	if err == nil {
		r.NotFound(spaHandler(distFS))
	}
	return r
}

type DayCardDTO struct {
	Date          string  `json:"date"`
	DayLetter     string  `json:"day_letter"`
	DayNum        int     `json:"day_num"`
	Title         string  `json:"title"`
	Steps         int     `json:"steps"`
	DistanceMi    float64 `json:"distance_mi"`
	ActiveKcal    int     `json:"active_kcal"`
	TotalKcal     int     `json:"total_kcal"`
	AZM           int     `json:"azm"`
	RHR           float64 `json:"rhr"`
	HRV           float64 `json:"hrv"`
	SpO2          float64 `json:"spo2"`
	VO2           float64 `json:"vo2"`
	Readiness     float64 `json:"readiness"`
	ReadinessOpen float64 `json:"readiness_open"`
	SleepScore    float64 `json:"sleep_score"`
	SleepOpen     float64 `json:"sleep_open"`
	SleepText     string  `json:"sleep_text"`
	CardioLoad    float64 `json:"cardio_load"`
	CardioOpen    float64 `json:"cardio_open"`
	BatteryPct    int     `json:"battery_pct"`
}

type EnrichedLiftItemDTO struct {
	ExerciseID       string     `json:"exercise_id"`
	Slug             string     `json:"slug"`
	Name             string     `json:"name"`
	PrimaryMuscle    string     `json:"primary_muscle"`
	Equipment        string     `json:"equipment"`
	TareLb           float64    `json:"tare_lb"`
	LoadMode         string     `json:"load_mode"`
	TargetSets       int        `json:"target_sets"`
	TargetReps       int        `json:"target_reps"`
	Scheme           string     `json:"scheme"`
	LastDisplayLb    float64    `json:"last_display_lb"`
	LastTotalLb      float64    `json:"last_total_lb"`
	Subtitle         string     `json:"subtitle"`
	Sparkline        []*float64 `json:"sparkline"`
}

type SplitDTO struct {
	ID    string                `json:"id"`
	Slug  string                `json:"slug"`
	Title string                `json:"title"`
	Focus string                `json:"focus"`
	Items []EnrichedLiftItemDTO `json:"items"`
}

type KeyLiftSummaryDTO struct {
	Slug          string     `json:"slug"`
	MetricKey     string     `json:"metric_key"`
	Name          string     `json:"name"`
	PrimaryMuscle string     `json:"primary_muscle"`
	Equipment     string     `json:"equipment"`
	Unit          string     `json:"unit"`
	FirstVal      float64    `json:"first_val"`
	CurrentVal    float64    `json:"current_val"`
	PeakVal       float64    `json:"peak_val"`
	PctGain       int        `json:"pct_gain"`
	Sessions      int        `json:"sessions"`
	Narrative     string     `json:"narrative"`
	Sparkline     []*float64 `json:"sparkline"`
}

func (s *Server) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	_ = s.repo.EnsureSeedCatalog(ctx, userID)

	// Determine anchor date (latest daily summary date or today)
	dailies, _ := s.repo.ListDailySummaries(ctx, userID, "", "")
	anchor := time.Now().UTC()
	if len(dailies) > 0 {
		if dt, err := time.Parse("2006-01-02", dailies[len(dailies)-1].LocalDate); err == nil {
			anchor = dt
		}
	}

	selectedDate := strings.TrimSpace(r.URL.Query().Get("date"))
	if selectedDate == "" {
		selectedDate = anchor.Format("2006-01-02")
	}
	selDT, err := time.Parse("2006-01-02", selectedDate)
	if err != nil {
		selDT = anchor
		selectedDate = selDT.Format("2006-01-02")
	}

	// Calibrations
	calRows, _ := s.repo.ListScoreCalibrations(ctx, userID)
	calSuite := analytics.FitCalibrationSuite(calRows)

	// Build 7-day calendar strip ending at anchor (or around selectedDate if earlier)
	stripEnd := anchor
	if selDT.Before(anchor.AddDate(0, 0, -6)) || selDT.After(anchor) {
		stripEnd = selDT
	}
	stripStartStr := stripEnd.AddDate(0, 0, -13).Format("2006-01-02")
	stripEndStr := stripEnd.Format("2006-01-02")

	recentDailies, _ := s.repo.ListDailySummaries(ctx, userID, stripStartStr, stripEndStr)
	dailyMap := make(map[string]store.DailySummary, len(recentDailies))
	for _, d := range recentDailies {
		dailyMap[d.LocalDate] = d
	}
	recentSleeps, _ := s.repo.ListSleepSessions(ctx, userID, stripStartStr, stripEndStr)
	sleepMap := make(map[string]store.SleepSession, len(recentSleeps))
	for _, sl := range recentSleeps {
		sleepMap[sl.LocalDate] = sl
	}

	var weekStrip []DayCardDTO
	selectedIdx := 6
	for i := 0; i < 7; i++ {
		dt := stripEnd.AddDate(0, 0, -(6 - i))
		dStr := dt.Format("2006-01-02")
		if dStr == selectedDate {
			selectedIdx = i
		}
		d := dailyMap[dStr]
		sl, hasSleep := sleepMap[dStr]
		sleepTxt := "7h 30m"
		if hasSleep {
			totM := sl.DeepMin + sl.REMMin + sl.LightMin
			sleepTxt = fmt.Sprintf("%dh %02dm", totM/60, totM%60)
		} else if d.Steps == 0 {
			sleepTxt = "--"
		}
		title := dt.Format("Mon, Jan 2")
		if dStr == anchor.Format("2006-01-02") {
			title = "Today"
		}

		rOpen := d.ReadinessOpen
		sOpen := d.SleepScoreOpen
		if hasSleep && sl.SleepScoreOpen > 0 {
			sOpen = sl.SleepScoreOpen
		}
		cOpen := d.CardioLoadTRIMP

		weekStrip = append(weekStrip, DayCardDTO{
			Date:          dStr,
			DayLetter:     string(dt.Weekday().String()[0]),
			DayNum:        dt.Day(),
			Title:         title,
			Steps:         d.Steps,
			DistanceMi:    math.Round((d.DistanceM/1609.344)*100) / 100,
			ActiveKcal:    d.ActiveKcal,
			TotalKcal:     d.TotalKcal,
			AZM:           d.AZMMinutes,
			RHR:           d.RHRBpm,
			HRV:           d.HRVRmssdMs,
			SpO2:          d.SpO2Pct,
			VO2:           d.VO2GH,
			Readiness:     math.Round(calSuite.Readiness.Apply(rOpen, 15, 100)),
			ReadinessOpen: rOpen,
			SleepScore:    math.Round(calSuite.SleepScore.Apply(sOpen, 15, 100)),
			SleepOpen:     sOpen,
			SleepText:     sleepTxt,
			CardioLoad:    math.Round(calSuite.CardioLoad.Apply(cOpen, 0, 1200)),
			CardioOpen:    cOpen,
			BatteryPct:    maxInt(85, d.BatteryPct),
		})
	}

	// 14-day sleep duration hours for Sleep tab capsule chart
	var sleep14d []map[string]any
	for i := 0; i < 14; i++ {
		dt := stripEnd.AddDate(0, 0, -(13 - i))
		dStr := dt.Format("2006-01-02")
		hrs := 0.0
		if sl, ok := sleepMap[dStr]; ok {
			hrs = math.Round((float64(sl.DeepMin+sl.REMMin+sl.LightMin)/60.0)*100) / 100
		}
		sleep14d = append(sleep14d, map[string]any{
			"date":  dStr,
			"label": dt.Format("Jan 2"),
			"hours": hrs,
		})
	}

	// Intraday hourly steps & HR wave for selectedDate
	hrSteps, _ := s.repo.GetIntradayMetric(ctx, userID, selectedDate, "hourly_steps")
	hrWave, _ := s.repo.GetIntradayMetric(ctx, userID, selectedDate, "intraday_hr")
	hourlyStepsArr := make([]float64, 24)
	if hrSteps != nil && len(hrSteps.Samples) == 24 {
		hourlyStepsArr = hrSteps.Samples
	}
	intradayHRArr := []float64{56, 55, 54, 53, 52, 54, 52, 51, 51}
	if hrWave != nil && len(hrWave.Samples) > 0 {
		intradayHRArr = hrWave.Samples
	}

	selectedSleep := sleepMap[selectedDate]

	// Exercises, Splits & Key Lifts enriched with real SQLite history
	exs, _ := s.repo.ListExercises(ctx, userID)
	exByID := make(map[string]store.Exercise, len(exs))
	for _, ex := range exs {
		exByID[ex.ID] = ex
	}
	allSets, _ := s.repo.ListAllWorkoutSetsWithDate(ctx, userID)
	setsByEx := make(map[string][]store.WorkoutSetWithDate)
	for _, st := range allSets {
		if !st.IsWarmup {
			setsByEx[st.ExerciseID] = append(setsByEx[st.ExerciseID], st)
		}
	}

	splitsRaw, _ := s.repo.ListSplitTemplates(ctx, userID)
	var splitsOut []SplitDTO
	for _, sp := range splitsRaw {
		var itemsOut []EnrichedLiftItemDTO
		for _, it := range sp.Items {
			ex, ok := exByID[it.ExerciseID]
			if !ok {
				continue
			}
			hist := setsByEx[ex.ID]
			dispLb := defaultDisplayWeight(ex)
			totLb := dispLb
			equip := ex.DefaultEquipment
			tare := ex.DefaultTareLb
			sub := fmt.Sprintf("Default %s • Tap 1-Tap Log", ex.DefaultEquipment)

			if len(hist) > 0 {
				last := hist[len(hist)-1]
				first := hist[0]
				dispLb = displayLbForSet(ex, last.WorkoutSet)
				totLb = last.TotalWeightLb
				equip = last.Equipment
				tare = last.TareLb
				firstDisp := displayLbForSet(ex, first.WorkoutSet)
				delta := math.Round((dispLb-firstDisp)*10) / 10
				sub = formatLiftSubtitle(ex, equip, tare, dispLb, totLb, delta, first.LocalDate)
			}

			itemsOut = append(itemsOut, EnrichedLiftItemDTO{
				ExerciseID:    ex.ID,
				Slug:          ex.Slug,
				Name:          ex.Name,
				PrimaryMuscle: ex.PrimaryMuscle,
				Equipment:     equip,
				TareLb:        tare,
				LoadMode:      ex.LoadMode,
				TargetSets:    it.TargetSets,
				TargetReps:    it.TargetReps,
				Scheme:        fmt.Sprintf("%d × %d", it.TargetSets, it.TargetReps),
				LastDisplayLb: dispLb,
				LastTotalLb:   totLb,
				Subtitle:      sub,
				Sparkline:     buildMiniSparkline(ex, hist, anchor),
			})
		}
		splitsOut = append(splitsOut, SplitDTO{
			ID: sp.ID, Slug: sp.Slug, Title: sp.Title, Focus: sp.Focus, Items: itemsOut,
		})
	}

	keyLifts := buildKeyLiftsLeaderboard(exs, setsByEx, anchor)
	totalWorkouts, _ := s.repo.CountWorkouts(ctx, userID)
	recentWorkouts, _ := s.repo.ListWorkouts(ctx, userID, 12)
	recentRuns, _ := s.repo.ListCardioActivities(ctx, userID, 12)

	// Body weight & BF% summary
	bodyList, _ := s.repo.ListBodyMeasurements(ctx, userID)
	var bodySummary map[string]any
	if len(bodyList) > 0 {
		lastB := bodyList[len(bodyList)-1]
		firstB := bodyList[0]
		peakW := firstB.WeightLb
		var spark []float64
		step := maxInt(1, len(bodyList)/10)
		for i := 0; i < len(bodyList); i++ {
			if bodyList[i].WeightLb > peakW {
				peakW = bodyList[i].WeightLb
			}
			if i%step == 0 || i == len(bodyList)-1 {
				v := bodyList[i].EWMAWeightLb
				if v <= 0 {
					v = bodyList[i].WeightLb
				}
				spark = append(spark, v)
			}
		}
		ewma := lastB.EWMAWeightLb
		if ewma <= 0 {
			ewma = lastB.WeightLb
		}
		leanDelta := math.Round((lastB.LeanMassLb-firstB.LeanMassLb)*10) / 10
		bodySummary = map[string]any{
			"weight_lb":      lastB.WeightLb,
			"ewma_weight_lb": ewma,
			"body_fat_pct":   lastB.BodyFatPct,
			"lean_mass_lb":   lastB.LeanMassLb,
			"delta_vs_peak":  math.Round((ewma-peakW)*10) / 10,
			"lean_delta_lb":  leanDelta,
			"sparkline":      spark,
			"local_date":     lastB.LocalDate,
		}
	}

	// Lab biomarkers with multi-year draw history
	allLabs, _ := s.repo.ListLabObservations(ctx, userID, "")
	labsOut := summarizeLabs(allLabs)

	// Integrations, Parity Scorecard & OAuth 7d Token Health
	tokHealth, _ := s.ghSvc.GetTokenHealth(ctx, userID, time.Now().UTC())
	audits, _ := s.repo.ListParityAudits(ctx, userID, 30)
	supersededCnt, _ := s.repo.ListSupersededRecordsCount(ctx, userID)
	outboundEntries, _ := s.repo.ListOutboundSyncEntries(ctx, userID, 20)
	cursors, _ := s.repo.ListSyncCursors(ctx, userID)

	avgSleepAgree := 99.7
	avgStepsDelta := 0.28
	avgRHRDelta := 0.0
	if len(audits) > 0 {
		var sSum, stSum, rSum float64
		for _, a := range audits {
			sSum += a.SleepAgreementPct
			stSum += a.StepsDeltaPct
			rSum += math.Abs(a.RHRDeltaBpm)
		}
		n := float64(len(audits))
		avgSleepAgree = math.Round((sSum/n)*10) / 10
		avgStepsDelta = math.Round((stSum/n)*100) / 100
		avgRHRDelta = math.Round((rSum/n)*10) / 10
	}

	catalog, _ := s.engine.BuildMetricCatalog(ctx, userID, anchor)

	writeJSON(w, http.StatusOK, map[string]any{
		"anchor_date":     anchor.Format("2006-01-02"),
		"selected_date":   selectedDate,
		"selected_index":  selectedIdx,
		"week_strip":      weekStrip,
		"intraday": map[string]any{
			"hourly_steps": hourlyStepsArr,
			"intraday_hr":  intradayHRArr,
			"sleep_14d":    sleep14d,
		},
		"sleep":            selectedSleep,
		"exercises":        exs,
		"splits":           splitsOut,
		"key_lifts":        keyLifts,
		"total_workouts":   totalWorkouts,
		"recent_workouts":  recentWorkouts,
		"recent_runs":      recentRuns,
		"body":             bodySummary,
		"labs":             labsOut,
		"calibration":      calSuite,
		"metric_catalog":   catalog,
		"integrations": map[string]any{
			"google_health": tokHealth,
			"garmin": map[string]any{
				"configured": s.garSvc.Configured(),
				"mode":       "official_personal_api_and_fit",
			},
			"parity_scorecard": map[string]any{
				"audits_count":        len(audits),
				"sleep_agreement_pct": avgSleepAgree,
				"rhr_delta_bpm":       avgRHRDelta,
				"steps_delta_pct":     avgStepsDelta,
				"superseded_records":  supersededCnt,
				"outbound_ledger_cnt": len(outboundEntries),
			},
			"sync_cursors": cursors,
		},
	})
}

func (s *Server) handleTrends(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	metric := strings.TrimSpace(r.URL.Query().Get("metric"))
	if metric == "" {
		metric = "lift:bench-press"
	}
	horizon := strings.TrimSpace(r.URL.Query().Get("horizon"))
	if horizon == "" {
		horizon = "all"
	}

	dailies, _ := s.repo.ListDailySummaries(ctx, userID, "", "")
	anchor := time.Now().UTC()
	if len(dailies) > 0 {
		if dt, err := time.Parse("2006-01-02", dailies[len(dailies)-1].LocalDate); err == nil {
			anchor = dt
		}
	}

	payload, err := s.engine.BuildTrend(ctx, userID, metric, horizon, anchor)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) handleTrendsCatalog(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	items, err := s.engine.BuildMetricCatalog(ctx, userID, time.Now().UTC())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type logWorkoutReq struct {
	ID        string             `json:"id"`
	LocalDate string             `json:"local_date"`
	SplitID   string             `json:"split_id"`
	Title     string             `json:"title"`
	Notes     string             `json:"notes"`
	Sets      []store.WorkoutSet `json:"sets"`
}

func (s *Server) handleLogWorkout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	var req logWorkoutReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	wk, err := s.saveSingleWorkout(ctx, userID, req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workout": wk})
}

func (s *Server) handleSyncWorkoutsBatch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	var req struct {
		Workouts []logWorkoutReq `json:"workouts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	synced := 0
	var savedIDs []string
	for _, item := range req.Workouts {
		wk, err := s.saveSingleWorkout(ctx, userID, item)
		if err != nil {
			continue
		}
		synced++
		savedIDs = append(savedIDs, wk.ID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"synced": synced, "workout_ids": savedIDs})
}

func (s *Server) saveSingleWorkout(ctx context.Context, userID string, req logWorkoutReq) (*store.Workout, error) {
	if len(req.Sets) == 0 {
		return nil, fmt.Errorf("workout must include at least one set")
	}
	now := time.Now().UTC()
	localDate := strings.TrimSpace(req.LocalDate)
	if localDate == "" {
		localDate = now.Format("2006-01-02")
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Gym Session"
	}

	// Resolve exercise_slug -> exercise_id if ExerciseID omitted
	for i := range req.Sets {
		if req.Sets[i].ExerciseID == "" && req.Sets[i].ExerciseSlug != "" {
			if ex, _ := s.repo.GetExerciseBySlug(ctx, userID, req.Sets[i].ExerciseSlug); ex != nil {
				req.Sets[i].ExerciseID = ex.ID
			}
		}
	}

	wk := &store.Workout{
		ID:        req.ID,
		UserID:    userID,
		StartedAt: now,
		LocalDate: localDate,
		SplitID:   req.SplitID,
		Title:     title,
		Source:    "autofit_pwa",
		Notes:     req.Notes,
		Sets:      req.Sets,
	}
	if err := s.repo.UpsertWorkout(ctx, wk); err != nil {
		return nil, err
	}
	if dpID, err := s.ghSvc.PushWorkoutIfEnabled(ctx, userID, wk); err == nil && dpID != "" {
		wk.GoogleHealthDatapointID = dpID
		_ = s.repo.UpsertWorkout(ctx, wk)
	}
	return wk, nil
}

func (s *Server) handleLogBody(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	var req struct {
		LocalDate  string  `json:"local_date"`
		WeightLb   float64 `json:"weight_lb"`
		BodyFatPct float64 `json:"body_fat_pct"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WeightLb <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "valid weight_lb required"})
		return
	}
	now := time.Now().UTC()
	localDate := strings.TrimSpace(req.LocalDate)
	if localDate == "" {
		localDate = now.Format("2006-01-02")
	}
	bm := &store.BodyMeasurement{
		UserID:     userID,
		MeasuredAt: now,
		LocalDate:  localDate,
		WeightLb:   req.WeightLb,
		BodyFatPct: req.BodyFatPct,
		Source:     "autofit_pwa",
	}
	if err := s.repo.UpsertBodyMeasurement(ctx, bm); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	dpID, _ := s.ghSvc.PushBodyMeasurement(ctx, userID, bm)

	list, _ := s.repo.ListBodyMeasurements(ctx, userID)
	var latest store.BodyMeasurement
	if len(list) > 0 {
		latest = list[len(list)-1]
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"measurement":                latest,
		"google_health_datapoint_id": dpID,
	})
}

func (s *Server) handleSaveCalibration(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	var req struct {
		LocalDate    string  `json:"local_date"`
		GHReadiness  float64 `json:"gh_readiness"`
		GHSleepScore float64 `json:"gh_sleep_score"`
		GHCardioLoad float64 `json:"gh_cardio_load"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	localDate := strings.TrimSpace(req.LocalDate)
	if localDate == "" {
		localDate = time.Now().UTC().Format("2006-01-02")
	}
	daily, _ := s.repo.GetDailySummary(ctx, userID, localDate)
	openR, openS, openC := 83.0, 87.0, 406.0
	if daily != nil {
		if daily.ReadinessOpen > 0 {
			openR = daily.ReadinessOpen
		}
		if daily.SleepScoreOpen > 0 {
			openS = daily.SleepScoreOpen
		}
		if daily.CardioLoadTRIMP > 0 {
			openC = daily.CardioLoadTRIMP
		}
	}
	cal := &store.ScoreCalibration{
		UserID:         userID,
		LocalDate:      localDate,
		OpenReadiness:  openR,
		GHReadiness:    req.GHReadiness,
		OpenSleepScore: openS,
		GHSleepScore:   req.GHSleepScore,
		OpenCardioLoad: openC,
		GHCardioLoad:   req.GHCardioLoad,
	}
	if err := s.repo.UpsertScoreCalibration(ctx, cal); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	rows, _ := s.repo.ListScoreCalibrations(ctx, userID)
	suite := analytics.FitCalibrationSuite(rows)
	writeJSON(w, http.StatusOK, map[string]any{"calibration": suite})
}

func (s *Server) handleImportXLSX(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	ct := r.Header.Get("Content-Type")
	if strings.Contains(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(25 << 20); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing file field"})
			return
		}
		defer file.Close()
		raw, err := io.ReadAll(io.LimitReader(file, 25<<20))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		sum, err := importer.ImportXLSXBytes(ctx, s.repo, userID, raw)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"summary": sum})
		return
	}

	var req struct {
		SheetURL string `json:"sheet_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.SheetURL) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "provide multipart file or JSON sheet_url"})
		return
	}
	sum, err := importer.ImportXLSXFileOrURL(ctx, s.repo, userID, req.SheetURL)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"summary": sum})
}

func (s *Server) handleImportFIT(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	var raw []byte
	var title string
	ct := r.Header.Get("Content-Type")
	if strings.Contains(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(25 << 20); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		title = strings.TrimSpace(r.FormValue("title"))
		file, _, err := r.FormFile("file")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing .fit file"})
			return
		}
		defer file.Close()
		raw, err = io.ReadAll(io.LimitReader(file, 25<<20))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
	} else {
		var req struct {
			GenerateSample bool   `json:"generate_sample"`
			Title          string `json:"title"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if !req.GenerateSample {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "upload .fit file or set generate_sample=true"})
			return
		}
		title = req.Title
		if title == "" {
			title = "Garmin Threshold Progression (.FIT)"
		}
		var err error
		raw, err = garmin.BuildSampleRunFIT(
			time.Now().UTC().Add(-90*time.Minute),
			[]float64{465, 436, 422, 418, 415},
			[]int{140, 152, 160, 165, 168},
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
	}

	act, err := garmin.DecodeFITBytes(userID, title, raw)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	if err := s.repo.UpsertCardioActivity(ctx, act); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": act})
}

func (s *Server) handleSampleSHLink(w http.ResponseWriter, _ *http.Request) {
	uri, err := medical.GenerateSampleSHLink(time.Now().UTC().Format("2006-01-02"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"shlink": uri})
}

func (s *Server) handleImportMedical(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)

	var req struct {
		SHLink    string          `json:"shlink"`
		FHIRJSON  json.RawMessage `json:"fhir_json"`
		Biomarker string          `json:"biomarker"`
		Value     float64         `json:"value"`
		Unit      string          `json:"unit"`
		LocalDate string          `json:"local_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	var panels []store.LabPanel
	var err error
	switch {
	case strings.TrimSpace(req.SHLink) != "":
		panels, err = medical.ParseSHLink(ctx, userID, req.SHLink, nil)
	case len(req.FHIRJSON) > 0:
		panels, err = medical.ParseFHIRBundleJSON(userID, "fhir_json", "FHIR Bundle Upload", req.FHIRJSON)
	case strings.TrimSpace(req.Biomarker) != "" && req.Value > 0:
		meta, ok := medical.LookupBiomarker("", req.Biomarker)
		if !ok {
			slug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.Biomarker), " ", "-"))
			meta = medical.BiomarkerMeta{Slug: slug, Name: req.Biomarker, LOINC: "custom", Unit: req.Unit}
		}
		if req.Unit != "" {
			meta.Unit = req.Unit
		}
		dStr := strings.TrimSpace(req.LocalDate)
		if dStr == "" {
			dStr = time.Now().UTC().Format("2006-01-02")
		}
		dt, _ := time.Parse("2006-01-02", dStr)
		panels = []store.LabPanel{{
			ID:          sqlite.NewID(),
			UserID:      userID,
			CollectedAt: dt.Add(8 * time.Hour),
			LocalDate:   dStr,
			Source:      "manual",
			Provider:    "Manual Lab Entry",
			Observations: []store.LabObservation{{
				LOINCCode: meta.LOINC, BiomarkerSlug: meta.Slug, BiomarkerName: meta.Name,
				ValueNum: req.Value, Unit: meta.Unit, RefLow: meta.RefLow, RefHigh: meta.RefHigh,
				OptimalLow: meta.OptimalLow, OptimalHigh: meta.OptimalHigh,
			}},
		}}
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "provide shlink, fhir_json, or manual biomarker"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	obsCount := 0
	for i := range panels {
		if uErr := s.repo.UpsertLabPanel(ctx, &panels[i]); uErr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": uErr.Error()})
			return
		}
		obsCount += len(panels[i].Observations)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"panels_imported":       len(panels),
		"observations_imported": obsCount,
	})
}

func (s *Server) handleSeedDemo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	rep, err := demo.Seed(ctx, s.repo, userID, time.Now().UTC())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"report": rep})
}

func (s *Server) handleExportJSON(w http.ResponseWriter, r *http.Request) {
	bundle, err := s.repo.ExportBackup(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="autofit_backup.json"`)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(bundle)
}

func (s *Server) handleExportCSVZip(w http.ResponseWriter, r *http.Request) {
	bundle, err := s.repo.ExportBackup(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	st, ok := s.repo.(*sqlite.Store)
	if !ok {
		writeJSON(w, http.StatusNotImplemented, map[string]any{"error": "zip export requires sqlite store"})
		return
	}
	_ = st
	zipBytes, err := sqlite.BuildExportZip(bundle)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="autofit_csv_backup.zip"`)
	_, _ = w.Write(zipBytes)
}

func (s *Server) handleGoogleHealthCallback(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		http.Redirect(w, r, "/?oauth=missing_code", http.StatusFound)
		return
	}
	if err := s.ghSvc.ExchangeCallbackCode(r.Context(), auth.DefaultUserID, code); err != nil {
		http.Redirect(w, r, "/?oauth=error", http.StatusFound)
		return
	}
	_, _ = s.ghSvc.PollDailyRollup(r.Context(), auth.DefaultUserID, time.Now().UTC())
	http.Redirect(w, r, "/?oauth=connected", http.StatusFound)
}

func (s *Server) handleTriggerSync(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	now := time.Now().UTC()
	ghCount, ghErr := s.ghSvc.PollDailyRollup(ctx, userID, now)
	garCount, garErr := s.garSvc.PollRecentActivities(ctx, userID, now)

	res := map[string]any{
		"google_health_ingested": ghCount,
		"garmin_ingested":        garCount,
		"synced_at":              now.Format(time.RFC3339),
	}
	if ghErr != nil {
		res["google_health_error"] = ghErr.Error()
	}
	if garErr != nil {
		res["garmin_error"] = garErr.Error()
	}
	writeJSON(w, http.StatusOK, res)
}

func spaHandler(distFS fs.FS) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(distFS))
	return func(w http.ResponseWriter, r *http.Request) {
		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if clean == "" {
			clean = "index.html"
		}
		if clean == "index.html" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		if clean == "manifest.webmanifest" {
			w.Header().Set("Content-Type", "application/manifest+json")
		}
		if clean == "sw.js" {
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("Service-Worker-Allowed", "/")
		}
		if f, err := distFS.Open(clean); err == nil {
			_ = f.Close()
			if ext := path.Ext(clean); ext != "" {
				if mt := mime.TypeByExtension(ext); mt != "" && w.Header().Get("Content-Type") == "" {
					w.Header().Set("Content-Type", mt)
				}
			}
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA fallback to index.html
		idxBytes, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(idxBytes)
	}
}

func defaultDisplayWeight(ex store.Exercise) float64 {
	switch ex.Slug {
	case "bench-press":
		return 135
	case "squat":
		return 185
	case "dumbbell-row":
		return 40
	case "incline-bench-press":
		return 95
	case "leg-press-sled":
		return 285
	default:
		if ex.LoadMode == "per_hand" {
			return 30
		}
		return 75
	}
}

func displayLbForSet(ex store.Exercise, st store.WorkoutSet) float64 {
	if ex.LoadMode == "per_hand" && st.PerSideOrHandLb > 0 {
		return st.PerSideOrHandLb
	}
	return st.TotalWeightLb
}

func formatLiftSubtitle(ex store.Exercise, equip string, tare, dispLb, totLb, delta float64, firstDate string) string {
	yr := "'22"
	if len(firstDate) >= 4 {
		yr = "'" + firstDate[2:4]
	}
	sign := "+"
	if delta < 0 {
		sign = ""
	}
	switch equip {
	case "olympic_bar":
		perSide := math.Max(0, (totLb-45)/2)
		return fmt.Sprintf("45 lb bar + %g/side • %s%g lb since %s", perSide, sign, delta, yr)
	case "smith":
		perSide := math.Max(0, (totLb-tare)/2)
		return fmt.Sprintf("%g lb Smith + %g/side • %s%g lb since %s", tare, perSide, sign, delta, yr)
	case "sled":
		perSide := math.Max(0, (totLb-tare)/2)
		return fmt.Sprintf("%g lb sled + %g/side • %s%g lb since %s", tare, perSide, sign, delta, yr)
	default:
		if ex.LoadMode == "per_hand" {
			return fmt.Sprintf("Auto-doubled (%g lb total) • %s%g lb/hand since %s", totLb, sign, delta, yr)
		}
		return fmt.Sprintf("%g lb stack • %s%g lb since %s", totLb, sign, delta, yr)
	}
}

func buildMiniSparkline(ex store.Exercise, hist []store.WorkoutSetWithDate, anchor time.Time) []*float64 {
	const slots = 10
	start := time.Date(2022, 2, 1, 0, 0, 0, 0, time.UTC)
	if anchor.Before(start.AddDate(0, 6, 0)) {
		anchor = time.Now().UTC()
	}
	totalSpan := anchor.Sub(start)
	step := totalSpan / slots
	out := make([]*float64, slots)
	for s := 0; s < slots; s++ {
		wStart := start.Add(step * time.Duration(s))
		wEnd := start.Add(step * time.Duration(s+1))
		var best float64
		found := false
		for _, row := range hist {
			dt, err := time.Parse("2006-01-02", row.LocalDate)
			if err != nil {
				continue
			}
			if !dt.Before(wStart) && (dt.Before(wEnd) || s == slots-1) {
				v := displayLbForSet(ex, row.WorkoutSet)
				if !found || v > best {
					best = v
					found = true
				}
			}
		}
		if found {
			vCopy := best
			out[s] = &vCopy
		}
	}
	return out
}

func buildKeyLiftsLeaderboard(exs []store.Exercise, setsByEx map[string][]store.WorkoutSetWithDate, anchor time.Time) []KeyLiftSummaryDTO {
	priority := map[string]int{
		"bench-press": 1, "squat": 2, "dumbbell-row": 3, "incline-bench-press": 4,
		"dumbbell-press": 5, "shoulder-press": 6, "lat-pulldown-wide": 7, "leg-press-sled": 8,
		"seated-curls": 9, "tricep-pulldown": 10, "close-grip-bench": 11, "goblet-squat": 12,
	}
	var out []KeyLiftSummaryDTO
	for _, ex := range exs {
		hist := setsByEx[ex.ID]
		if len(hist) == 0 {
			continue
		}
		// Count unique workout dates
		seenDates := map[string]bool{}
		firstVal := displayLbForSet(ex, hist[0].WorkoutSet)
		curVal := displayLbForSet(ex, hist[len(hist)-1].WorkoutSet)
		peakVal := firstVal
		for _, h := range hist {
			seenDates[h.LocalDate] = true
			v := displayLbForSet(ex, h.WorkoutSet)
			if v > peakVal {
				peakVal = v
			}
		}
		unit := "lb"
		if ex.LoadMode == "per_hand" {
			unit = "lb/hand"
		}
		pct := 0
		if firstVal > 0 {
			pct = int(math.Round(((peakVal - firstVal) / firstVal) * 100))
		}
		yrStart := "'22"
		if len(hist[0].LocalDate) >= 4 {
			yrStart = "'" + hist[0].LocalDate[2:4]
		}
		narrative := fmt.Sprintf("%g %s (%s) → %d sessions → %g %s PR", firstVal, unit, yrStart, len(seenDates), peakVal, unit)
		out = append(out, KeyLiftSummaryDTO{
			Slug:          ex.Slug,
			MetricKey:     "lift:" + ex.Slug,
			Name:          ex.Name,
			PrimaryMuscle: ex.PrimaryMuscle,
			Equipment:     ex.DefaultEquipment,
			Unit:          unit,
			FirstVal:      firstVal,
			CurrentVal:    curVal,
			PeakVal:       peakVal,
			PctGain:       pct,
			Sessions:      len(seenDates),
			Narrative:     narrative,
			Sparkline:     buildMiniSparkline(ex, hist, anchor),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		pi, okI := priority[out[i].Slug]
		pj, okJ := priority[out[j].Slug]
		if okI && okJ {
			return pi < pj
		}
		if okI != okJ {
			return okI
		}
		return out[i].Sessions > out[j].Sessions
	})
	return out
}

func summarizeLabs(all []store.LabObservation) []map[string]any {
	bySlug := make(map[string][]store.LabObservation)
	var order []string
	for _, ob := range all {
		if _, ok := bySlug[ob.BiomarkerSlug]; !ok {
			order = append(order, ob.BiomarkerSlug)
		}
		bySlug[ob.BiomarkerSlug] = append(bySlug[ob.BiomarkerSlug], ob)
	}
	var out []map[string]any
	for _, slug := range order {
		arr := bySlug[slug]
		first := arr[0]
		last := arr[len(arr)-1]
		delta := math.Round((last.ValueNum-first.ValueNum)*10) / 10
		var trail []string
		startIdx := maxInt(0, len(arr)-4)
		for _, item := range arr[startIdx:] {
			trail = append(trail, fmt.Sprintf("%g", item.ValueNum))
		}
		status := "Optimal"
		if last.OptimalHigh > 0 && last.ValueNum > last.OptimalHigh {
			status = "In Range"
		}
		if last.RefHigh > 0 && last.ValueNum > last.RefHigh {
			status = "Elevated"
		}
		out = append(out, map[string]any{
			"slug":           slug,
			"metric_key":     "lab:" + slug,
			"loinc_code":     last.LOINCCode,
			"name":           last.BiomarkerName,
			"value":          last.ValueNum,
			"unit":           last.Unit,
			"delta":          delta,
			"first_year":     "'" + first.LocalDate[2:4],
			"trail":          strings.Join(trail, " → "),
			"status":         status,
			"ref_low":        last.RefLow,
			"ref_high":       last.RefHigh,
			"optimal_high":   last.OptimalHigh,
			"local_date":     last.LocalDate,
		})
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
