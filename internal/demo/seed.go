package demo

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/rudyorre/autofit/internal/analytics"
	"github.com/rudyorre/autofit/internal/garmin"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

type SeedReport struct {
	AnchorDate       string `json:"anchor_date"`
	WorkoutsPreserved int   `json:"workouts_preserved"`
	WorkoutsSeeded   int    `json:"workouts_seeded"`
	DailySummaries   int    `json:"daily_summaries"`
	SleepSessions    int    `json:"sleep_sessions"`
	RunsSeeded       int    `json:"runs_seeded"`
	BodyMeasurements int    `json:"body_measurements"`
	LabPanels        int    `json:"lab_panels"`
}

func Seed(ctx context.Context, repo store.Repository, userID string, anchor time.Time) (*SeedReport, error) {
	if userID == "" {
		userID = store.DefaultUserID
	}
	if anchor.IsZero() {
		anchor = time.Now().UTC()
	}
	anchorDay := time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 0, 0, 0, 0, time.UTC)

	if err := repo.EnsureSeedCatalog(ctx, userID); err != nil {
		return nil, err
	}

	rep := &SeedReport{AnchorDate: anchorDay.Format("2006-01-02")}

	// 1. Multi-year bi-monthly wearable, sleep & body baselines (Feb 2022 -> Anchor - 14d), with explicit Aug 2025 travel gap!
	rhrTrajectory := []float64{58, 57, 56, 55, 55, 54, 54, 54, 53, 53, 53, 56, 57, 55, 54, 53, 52, 52, 52, 51, 51, 0, 53, 52, 52, 51, 51, 51}
	hrvTrajectory := []float64{49, 50, 52, 53, 54, 54, 55, 55, 56, 57, 56, 48, 50, 54, 57, 59, 60, 61, 61, 62, 62, 0, 58, 60, 62, 63, 63, 64}
	stepsTrajectory := []int{7450, 7800, 8200, 8500, 8100, 7600, 7500, 7600, 7700, 8600, 8900, 6200, 6100, 8400, 9100, 9600, 9800, 9400, 9700, 10100, 10300, 0, 9500, 9900, 10050, 10200, 10350, 10120}
	sleepHrsTrajectory := []float64{7.2, 7.3, 7.4, 7.3, 7.1, 6.9, 6.8, 6.9, 7.0, 7.3, 7.4, 7.1, 7.2, 7.4, 7.5, 7.6, 7.6, 7.5, 7.6, 7.7, 7.7, 0, 7.4, 7.6, 7.7, 7.7, 7.8, 7.77}
	vo2Trajectory := []float64{45.8, 46.4, 47.1, 47.8, 48.4, 48.8, 48.9, 49.0, 48.9, 49.2, 49.5, 0, 0, 47.2, 48.5, 49.6, 50.2, 50.8, 51.2, 51.5, 51.6, 0, 50.4, 51.1, 51.7, 52.0, 52.2, 52.4}
	weightTrajectory := []float64{166.5, 168.0, 170.2, 171.8, 173.5, 174.2, 174.4, 174.5, 175.8, 177.2, 178.6, 0, 179.0, 178.2, 176.8, 175.4, 174.8, 175.0, 174.6, 174.2, 173.9, 0, 175.1, 174.5, 174.1, 173.9, 173.7, 173.6}
	bfTrajectory := []float64{17.4, 17.2, 17.0, 16.9, 16.8, 16.8, 16.7, 16.7, 16.9, 17.1, 17.3, 0, 17.5, 17.1, 16.6, 16.1, 15.8, 15.7, 15.5, 15.3, 15.1, 0, 15.4, 15.2, 15.0, 14.9, 14.8, 14.8}

	startMonth := time.Date(2022, 2, 10, 0, 0, 0, 0, time.UTC)
	for i := 0; i < len(rhrTrajectory); i++ {
		baseDt := startMonth.AddDate(0, i*2, 0)
		if !baseDt.Before(anchorDay.AddDate(0, 0, -14)) {
			break
		}
		// Seed 4 sample days per active bi-monthly bucket so consistency strip reflects density
		if rhrTrajectory[i] > 0 {
			for sampleOffset := 0; sampleOffset < 4; sampleOffset++ {
				dt := baseDt.AddDate(0, 0, sampleOffset*9)
				if !dt.Before(anchorDay.AddDate(0, 0, -14)) {
					break
				}
				dStr := dt.Format("2006-01-02")
				sleepMin := int(math.Round(sleepHrsTrajectory[i] * 60))
				deepM := int(math.Round(float64(sleepMin) * 0.21))
				remM := int(math.Round(float64(sleepMin) * 0.23))
				lightM := sleepMin - deepM - remM
				sScore := analytics.ComputeOpenSleepScore(deepM, remM, lightM, 30, 90)
				rScore := analytics.ComputeOpenReadiness(hrvTrajectory[i], 57, rhrTrajectory[i], 54, sScore, 1.0)

				_ = repo.UpsertDailySummary(ctx, &store.DailySummary{
					ID:              "seed-daily-" + dStr,
					UserID:          userID,
					LocalDate:       dStr,
					Steps:           stepsTrajectory[i] + (sampleOffset-1)*240,
					DistanceM:       float64(stepsTrajectory[i]) * 0.78,
					ActiveKcal:      540 + sampleOffset*35,
					TotalKcal:       2390 + sampleOffset*35,
					AZMMinutes:      44 + sampleOffset*5,
					RHRBpm:          rhrTrajectory[i],
					HRVRmssdMs:      hrvTrajectory[i],
					SpO2Pct:         97.2,
					RespRate:        14.6,
					VO2GH:           vo2Trajectory[i],
					ReadinessOpen:   rScore,
					SleepScoreOpen:  sScore,
					CardioLoadTRIMP: 365 + float64(i*2),
					Source:          "google_health_api",
				})
				rep.DailySummaries++

				_ = repo.UpsertSleepSession(ctx, &store.SleepSession{
					ID:             "seed-sleep-" + dStr,
					UserID:         userID,
					LocalDate:      dStr,
					StartTS:        dt.Add(-45 * time.Minute),
					EndTS:          dt.Add(time.Duration(sleepMin-15) * time.Minute),
					EfficiencyPct:  90.5,
					DeepMin:        deepM,
					REMMin:         remM,
					LightMin:       lightM,
					AwakeMin:       29,
					NadirHRBpm:     rhrTrajectory[i] - 2,
					NadirTime:      "3:40 AM",
					BedtimeLabel:   "11:18 PM – 7:02 AM",
					SleepScoreOpen: sScore,
					Source:         "google_health_api",
				})
				rep.SleepSessions++
			}
		}

		if weightTrajectory[i] > 0 {
			dStr := baseDt.Format("2006-01-02")
			_ = repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
				ID:         "seed-body-" + dStr,
				UserID:     userID,
				MeasuredAt: baseDt.Add(8 * time.Hour),
				LocalDate:  dStr,
				WeightLb:   weightTrajectory[i],
				BodyFatPct: bfTrajectory[i],
				Source:     "google_health_api",
			})
			rep.BodyMeasurements++
		}

		if vo2Trajectory[i] > 0 && i%2 == 0 {
			dStr := baseDt.Format("2006-01-02")
			paceSec := 545.0 - (vo2Trajectory[i]-45.8)*11.5 // Faster pace as VDOT rises!
			distMi := 4.0 + float64(i%3)
			distM := distMi * 1609.344
			durS := distMi * paceSec
			ef, z2Pace := analytics.ComputeZone2Metrics(distM, durS, 32, 151)
			_ = repo.UpsertCardioActivity(ctx, &store.CardioActivity{
				ID:                "seed-run-" + dStr,
				UserID:            userID,
				StartedAt:         baseDt.Add(7 * time.Hour),
				LocalDate:         dStr,
				Title:             "Garmin Aerobic Run (.FIT)",
				Sport:             "running",
				DistanceM:         math.Round(distM*10) / 10,
				DurationS:         math.Round(durS*10) / 10,
				AvgHR:             151,
				MaxHR:             171,
				AvgCadence:        178,
				ElevationGainM:    32,
				VDOTOpen:          vo2Trajectory[i],
				Zone2Efficiency:   ef,
				Zone2PaceSecPerMi: z2Pace,
				TRIMP:             analytics.ComputeBanisterTRIMP(durS/60.0, 151, 52, 190),
				Source:            "garmin_fit",
			})
			rep.RunsSeeded++
		}
	}

	// 2. High-resolution last 14 days up to AnchorDate (powering 7-Day Ring Strip, Hourly Capsule Bars, Intraday HR & Sleep Donut!)
	recentSteps := []int{9620, 10180, 8840, 11210, 9450, 10650, 8920, 10420, 8310, 12840, 7650, 10910, 10240, 9420}
	recentAZM := []int{44, 52, 36, 66, 45, 58, 39, 48, 38, 74, 22, 54, 51, 62}
	recentRHR := []float64{52, 52, 51, 51, 52, 51, 52, 51, 52, 50, 50, 51, 51, 51}
	recentHRV := []float64{61, 62, 60, 63, 61, 62, 60, 62, 59, 65, 66, 63, 62, 64}
	recentSleepMin := []int{452, 460, 444, 472, 455, 462, 448, 450, 432, 490, 498, 458, 445, 466}
	recentLoad := []float64{388, 394, 391, 405, 398, 404, 395, 390, 396, 425, 402, 408, 405, 412}

	for offset := 0; offset < 14; offset++ {
		dt := anchorDay.AddDate(0, 0, -(13 - offset))
		dStr := dt.Format("2006-01-02")
		steps := recentSteps[offset]
		sMin := recentSleepMin[offset]
		deepM := 98
		remM := 112
		if sMin < 450 {
			deepM = 84
			remM = 98
		}
		lightM := sMin - deepM - remM
		sScore := analytics.ComputeOpenSleepScore(deepM, remM, lightM, 32, 91.0)
		rScore := analytics.ComputeOpenReadiness(recentHRV[offset], 59, recentRHR[offset], 53, sScore, 1.02)

		_ = repo.UpsertDailySummary(ctx, &store.DailySummary{
			ID:              "seed-daily-" + dStr,
			UserID:          userID,
			LocalDate:       dStr,
			Steps:           steps,
			DistanceM:       math.Round(float64(steps)*0.788*10) / 10,
			ActiveKcal:      int(math.Round(float64(steps) * 0.068)),
			TotalKcal:       1840 + int(math.Round(float64(steps)*0.068)),
			AZMMinutes:      recentAZM[offset],
			RHRBpm:          recentRHR[offset],
			HRVRmssdMs:      recentHRV[offset],
			SpO2Pct:         97.4,
			RespRate:        14.4,
			SkinTempDeltaC:  0.1,
			VO2GH:           52.4,
			ReadinessOpen:   rScore,
			SleepScoreOpen:  sScore,
			CardioLoadTRIMP: recentLoad[offset],
			BatteryPct:      92,
			Source:          "google_health_api",
		})
		rep.DailySummaries++

		_ = repo.UpsertSleepSession(ctx, &store.SleepSession{
			ID:             "seed-sleep-" + dStr,
			UserID:         userID,
			LocalDate:      dStr,
			StartTS:        dt.Add(-42 * time.Minute),
			EndTS:          dt.Add(time.Duration(sMin-10) * time.Minute),
			EfficiencyPct:  91.0,
			DeepMin:        deepM,
			REMMin:         remM,
			LightMin:       lightM,
			AwakeMin:       32,
			NadirHRBpm:     49,
			NadirTime:      "3:40 AM",
			BedtimeLabel:   "11:18 PM – 7:04 AM",
			SleepScoreOpen: sScore,
			Stages: []store.SleepStageSegment{
				{Stage: "light", StartMin: 0, Duration: 38},
				{Stage: "deep", StartMin: 38, Duration: 54},
				{Stage: "rem", StartMin: 92, Duration: 42},
				{Stage: "awake", StartMin: 134, Duration: 14},
				{Stage: "light", StartMin: 148, Duration: 96},
				{Stage: "deep", StartMin: 244, Duration: 44},
				{Stage: "rem", StartMin: 288, Duration: 70},
				{Stage: "awake", StartMin: 358, Duration: 18},
				{Stage: "light", StartMin: 376, Duration: maxInt(20, lightM-134)},
			},
			Source: "google_health_api",
		})
		rep.SleepSessions++

		// Hourly steps & intraday HR wave
		scale := float64(steps) / 9420.0
		baseHourly := []float64{0, 0, 0, 0, 0, 70, 520, 4850, 640, 310, 290, 420, 840, 350, 240, 190, 340, 510, 180, 40, 0, 0, 0, 0}
		scaledHourly := make([]float64, 24)
		for h := 0; h < 24; h++ {
			scaledHourly[h] = math.Round(baseHourly[h] * scale)
		}
		_ = repo.UpsertIntradayMetric(ctx, &store.IntradayMetric{
			ID:        "seed-hrsteps-" + dStr,
			UserID:    userID,
			LocalDate: dStr,
			Metric:    "hourly_steps",
			Samples:   scaledHourly,
			Source:    "google_health_api",
		})
		_ = repo.UpsertIntradayMetric(ctx, &store.IntradayMetric{
			ID:        "seed-hrwave-" + dStr,
			UserID:    userID,
			LocalDate: dStr,
			Metric:    "intraday_hr",
			Samples:   []float64{52, 50, 49, 49, 51, 58, 72, 154, 84, 68, 64, 66, 74, 65, 62, 61, 66, 78, 64, 58, 55, 54, 53, 51},
			Source:    "google_health_api",
		})
	}

	// Latest weigh-in on anchor date
	_ = repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
		ID:         "seed-body-" + anchorDay.Format("2006-01-02"),
		UserID:     userID,
		MeasuredAt: anchorDay.Add(7*time.Hour + 30*time.Minute),
		LocalDate:  anchorDay.Format("2006-01-02"),
		WeightLb:   173.6,
		BodyFatPct: 14.8,
		Source:     "google_health_api",
	})
	rep.BodyMeasurements++

	// 3. Encode & decode a genuine Garmin .FIT Morning Tempo Run on AnchorDate (6.22 mi • 6 splits • VDOT 52.4)
	fitBytes, err := garmin.BuildSampleRunFIT(
		anchorDay.Add(7*time.Hour),
		[]float64{472, 441, 428, 425, 429, 454}, // 7:52, 7:21, 7:08, 7:05, 7:09, 7:34
		[]int{142, 154, 159, 162, 164, 155},
	)
	if err == nil {
		if fitAct, decErr := garmin.DecodeFITBytes(userID, "Morning Tempo Run (.FIT)", fitBytes); decErr == nil {
			fitAct.DistanceM = 10010.1 // 6.22 mi including cooldown
			fitAct.VDOTOpen = 52.4
			fitAct.Zone2PaceSecPerMi = 494 // 8:14/mi @ 141 bpm
			fitAct.TRIMP = 118
			_ = repo.UpsertCardioActivity(ctx, fitAct)
			rep.RunsSeeded++
		}
	}

	// 4. Longitudinal FHIR R4 Clinical Lab Panels (2022 -> 2026)
	labDraws := []struct {
		date                         string
		apob, a1c, crp, ldl, fer, vd float64
	}{
		{"2022-03-15", 98, 5.4, 1.1, 97, 64, 27},
		{"2022-11-10", 94, 5.4, 0.9, 92, 55, 32},
		{"2023-07-18", 91, 5.3, 0.8, 88, 41, 35},
		{"2024-04-22", 86, 5.2, 0.7, 82, 68, 41},
		{"2025-02-14", 81, 5.2, 0.5, 75, 84, 45},
		{anchorDay.AddDate(0, 0, -18).Format("2006-01-02"), 74, 5.1, 0.4, 68, 92, 48},
	}
	for _, ld := range labDraws {
		dt, _ := time.Parse("2006-01-02", ld.date)
		panel := &store.LabPanel{
			ID:          "seed-labs-" + ld.date,
			UserID:      userID,
			CollectedAt: dt.Add(8 * time.Hour),
			LocalDate:   ld.date,
			Source:      "shlink",
			Provider:    "Function Health / Quest FHIR R4",
			Observations: []store.LabObservation{
				{LOINCCode: "1884-6", BiomarkerSlug: "apob", BiomarkerName: "ApoB", ValueNum: ld.apob, Unit: "mg/dL", RefLow: 40, RefHigh: 100, OptimalLow: 40, OptimalHigh: 80},
				{LOINCCode: "4548-4", BiomarkerSlug: "hba1c", BiomarkerName: "HbA1c", ValueNum: ld.a1c, Unit: "%", RefLow: 4.0, RefHigh: 5.6, OptimalLow: 4.5, OptimalHigh: 5.3},
				{LOINCCode: "30522-7", BiomarkerSlug: "hs-crp", BiomarkerName: "hs-CRP", ValueNum: ld.crp, Unit: "mg/L", RefLow: 0, RefHigh: 3.0, OptimalLow: 0, OptimalHigh: 1.0},
				{LOINCCode: "13457-7", BiomarkerSlug: "ldl-c", BiomarkerName: "LDL-C", ValueNum: ld.ldl, Unit: "mg/dL", RefLow: 0, RefHigh: 99, OptimalLow: 30, OptimalHigh: 80},
				{LOINCCode: "2276-4", BiomarkerSlug: "ferritin", BiomarkerName: "Ferritin", ValueNum: ld.fer, Unit: "ng/mL", RefLow: 30, RefHigh: 400, OptimalLow: 60, OptimalHigh: 180},
				{LOINCCode: "1989-3", BiomarkerSlug: "vitamin-d", BiomarkerName: "Vitamin D (25-OH)", ValueNum: ld.vd, Unit: "ng/mL", RefLow: 30, RefHigh: 100, OptimalLow: 40, OptimalHigh: 70},
			},
		}
		if err := repo.UpsertLabPanel(ctx, panel); err == nil {
			rep.LabPanels++
		}
	}

	// 5. Seed 30-day Shadow Parity Scorecard audits + Calibration pairs
	for i := 0; i < 6; i++ {
		dStr := anchorDay.AddDate(0, 0, -i*4).Format("2006-01-02")
		_ = repo.RecordParityAudit(ctx, &store.ParityAudit{
			ID:                   "seed-parity-" + dStr,
			UserID:               userID,
			LocalDate:            dStr,
			SleepAgreementPct:    99.7,
			SleepDurationDeltaM:  1.0,
			RHRDeltaBpm:          0.0,
			StepsDeltaPct:        0.28,
			PrimarySource:        "google_health_api",
			FallbackSourceBundle: "com.fitbit.FitbitMobile",
		})
	}
	for i, ghR := range []float64{82, 85, 88, 84} {
		dStr := anchorDay.AddDate(0, 0, -i).Format("2006-01-02")
		_ = repo.UpsertScoreCalibration(ctx, &store.ScoreCalibration{
			UserID:         userID,
			LocalDate:      dStr,
			OpenReadiness:  ghR - 1,
			GHReadiness:    ghR,
			OpenSleepScore: 87,
			GHSleepScore:   88,
			OpenCardioLoad: 406,
			GHCardioLoad:   412,
		})
	}

	// 6. Preserve imported .xlsx workouts if present; only seed synthetic workouts if DB currently has 0 workouts!
	existingWorkouts, _ := repo.CountWorkouts(ctx, userID)
	if existingWorkouts > 0 {
		rep.WorkoutsPreserved = existingWorkouts
		return rep, nil
	}

	rep.WorkoutsSeeded = seedFallbackDemoWorkouts(ctx, repo, userID, startMonth, anchorDay)
	return rep, nil
}

func seedFallbackDemoWorkouts(ctx context.Context, repo store.Repository, userID string, startMonth, anchorDay time.Time) int {
	benchCurve := []float64{95, 105, 115, 125, 130, 135, 135, 135, 135, 140, 145, 0, 0, 115, 130, 140, 145, 150, 155, 155, 155, 0, 140, 150, 155, 155, 160, 160}
	squatCurve := []float64{135, 145, 155, 165, 175, 185, 185, 185, 185, 190, 195, 0, 0, 155, 175, 185, 195, 200, 205, 205, 210, 0, 185, 195, 205, 210, 215, 215}
	rowHandCurve := []float64{30, 32.5, 35, 37.5, 40, 40, 42.5, 42.5, 42.5, 45, 45, 0, 0, 37.5, 42.5, 45, 47.5, 47.5, 50, 50, 50, 0, 45, 47.5, 50, 50, 52.5, 52.5}

	seeded := 0
	for i := 0; i < len(benchCurve); i++ {
		if benchCurve[i] == 0 {
			continue
		}
		dt := startMonth.AddDate(0, i*2, 2)
		if dt.After(anchorDay) {
			dt = anchorDay.AddDate(0, 0, -1)
		}
		dStr := dt.Format("2006-01-02")

		// Push workout
		inclineW := math.Max(75, benchCurve[i]-25)
		tricepW := math.Round(32.5 + float64(i)*1.2)
		pushWk := &store.Workout{
			ID:        fmt.Sprintf("demo-push-%d", i),
			UserID:    userID,
			StartedAt: dt.Add(18 * time.Hour),
			LocalDate: dStr,
			SplitID:   "block-4-push",
			Title:     "Block 4 • Push",
			Source:    "autofit_pwa",
			Sets:      append(makeSets("ex-bench-press", "olympic_bar", "plates_per_side", 45, (benchCurve[i]-45)/2, benchCurve[i], 4, 10), append(makeSets("ex-incline-bench-press", "olympic_bar", "plates_per_side", 45, (inclineW-45)/2, inclineW, 4, 10), makeSets("ex-tricep-pulldown", "cable", "stack_total", 0, tricepW, tricepW, 4, 10)...)...),
		}
		if err := repo.UpsertWorkout(ctx, pushWk); err == nil {
			seeded++
		}

		// Occasional Smith Machine Bench session so AltSeries equipment separation is visible
		if i == 7 || i == 15 || i == 23 {
			smDt := dt.AddDate(0, 0, 12)
			if !smDt.After(anchorDay) {
				smW := benchCurve[i] + 5
				_ = repo.UpsertWorkout(ctx, &store.Workout{
					ID:        fmt.Sprintf("demo-smith-%d", i),
					UserID:    userID,
					StartedAt: smDt.Add(18 * time.Hour),
					LocalDate: smDt.Format("2006-01-02"),
					SplitID:   "block-4-push",
					Title:     "Block 4 • Push (Smith)",
					Source:    "autofit_pwa",
					Sets:      makeSets("ex-bench-press", "smith", "plates_per_side", 20, (smW-20)/2, smW, 4, 10),
				})
				seeded++
			}
		}

		// Legs & Pull workouts
		legDt := dt.AddDate(0, 0, 3)
		if !legDt.After(anchorDay) {
			_ = repo.UpsertWorkout(ctx, &store.Workout{
				ID:        fmt.Sprintf("demo-legs-%d", i),
				UserID:    userID,
				StartedAt: legDt.Add(18 * time.Hour),
				LocalDate: legDt.Format("2006-01-02"),
				SplitID:   "block-3-shoulders-legs",
				Title:     "Block 3 • Shoulders & Legs",
				Source:    "autofit_pwa",
				Sets:      append(makeSets("ex-squat", "olympic_bar", "plates_per_side", 45, (squatCurve[i]-45)/2, squatCurve[i], 4, 8), makeSets("ex-leg-press-sled", "sled", "plates_per_side", 125, 80+float64(i)*1.5, 125+2*(80+float64(i)*1.5), 4, 10)...),
			})
			seeded++
		}

		pullDt := dt.AddDate(0, 0, 5)
		if !pullDt.After(anchorDay) {
			_ = repo.UpsertWorkout(ctx, &store.Workout{
				ID:        fmt.Sprintf("demo-pull-%d", i),
				UserID:    userID,
				StartedAt: pullDt.Add(18 * time.Hour),
				LocalDate: pullDt.Format("2006-01-02"),
				SplitID:   "block-5-pull",
				Title:     "Block 5 • Pull",
				Source:    "autofit_pwa",
				Sets:      append(makeSets("ex-dumbbell-row", "dumbbell_pair", "per_hand", 0, rowHandCurve[i], rowHandCurve[i]*2, 4, 10), makeSets("ex-lat-pulldown-wide", "cable", "stack_total", 0, 85+float64(i)*2, 85+float64(i)*2, 4, 10)...),
			})
			seeded++
		}
	}
	return seeded
}

func makeSets(exID, equip, loadMode string, tare, perSide, total float64, count, reps int) []store.WorkoutSet {
	out := make([]store.WorkoutSet, 0, count)
	for s := 1; s <= count; s++ {
		out = append(out, store.WorkoutSet{
			ID:              sqlite.NewID(),
			ExerciseID:      exID,
			SetIndex:        s,
			Equipment:       equip,
			TareLb:          tare,
			LoadMode:        loadMode,
			PerSideOrHandLb: perSide,
			TotalWeightLb:   total,
			Reps:            reps,
			E1RMLb:          sqlite.ComputeE1RM(total, reps),
		})
	}
	return out
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
