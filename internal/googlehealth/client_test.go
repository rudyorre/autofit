package googlehealth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/rudyorre/autofit/internal/config"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

func TestGoogleHealthFrozenCursorEchoDedupAndScopedSuperseding(t *testing.T) {
	ctx := context.Background()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer repo.Close()

	// Mock Google Health API v4 server that returns 401 when unauthorized
	return401 := true
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if return401 {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"invalid_token"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"days": [
				{"local_date":"2026-09-01","datapoint_id":"gh-out-echo-1","steps":99999,"rhr_bpm":40},
				{"local_date":"2026-09-02","datapoint_id":"gh-real-day-2","steps":11420,"azm_minutes":58,"rhr_bpm":50,"hrv_rmssd_ms":64,"weight_lb":171.2,"weight_datapoint_id":"gh-wt-2"}
			]
		}`))
	}))
	defer srv.Close()

	cfg := config.Config{
		GoogleClientID:      "test-client-id",
		GoogleClientSecret:  "test-secret",
		GoogleRedirectURL:   "http://localhost:8080/api/v1/integrations/google-health/callback",
		GoogleHealthBaseURL: srv.URL,
	}
	svc := NewService(cfg, repo)

	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	initialSyncTS := now.Add(-12 * time.Hour)
	if err := repo.UpdateSyncCursorAttempt(ctx, store.DefaultUserID, ProviderName, "daily_rollup", 200, "", &initialSyncTS); err != nil {
		t.Fatalf("seed cursor: %v", err)
	}

	// Save Testing mode token with 24h left -> status should be "expiring_soon"
	if err := repo.SaveOAuthToken(ctx, store.DefaultUserID, &store.OAuthTokenState{
		Provider:         ProviderName,
		AccessToken:      "tok-123",
		RefreshToken:     "ref-123",
		TokenExpiry:      now.Add(1 * time.Hour),
		RefreshIssuedAt:  now.Add(-6 * 24 * time.Hour),
		RefreshExpiresAt: now.Add(24 * time.Hour),
		TestingMode7Day:  true,
	}); err != nil {
		t.Fatalf("save token: %v", err)
	}

	th, err := svc.GetTokenHealth(ctx, store.DefaultUserID, now)
	if err != nil || th.Status != "expiring_soon" || !th.TestingMode7Day {
		t.Fatalf("expected expiring_soon 7-day token health, got %+v (err=%v)", th, err)
	}

	// 1. Poll when token returns HTTP 401 -> last_successful_sync_ts MUST remain frozen!
	if _, err := svc.PollDailyRollup(ctx, store.DefaultUserID, now); err == nil {
		t.Fatalf("expected HTTP 401 error")
	}
	curAfter401, _ := repo.GetSyncCursor(ctx, store.DefaultUserID, ProviderName, "daily_rollup")
	if curAfter401 == nil || !curAfter401.LastSuccessfulSyncTS.Equal(initialSyncTS) || curAfter401.LastHTTPStatus != 401 {
		t.Fatalf("expected cursor LastSuccessfulSyncTS to remain frozen at %v, got %+v", initialSyncTS, curAfter401)
	}

	// 2. Seed outbound echo ledger + fallback Apple HealthKit records (one Fitbit bundle, one Withings smart-scale bundle)
	_ = repo.RecordOutboundSync(ctx, &store.OutboundSyncEntry{
		ID:                "out-1",
		UserID:            store.DefaultUserID,
		EntityType:        "daily",
		LocalID:           "local-1",
		GoogleDatapointID: "gh-out-echo-1",
		SyncedAt:          now,
	})
	_ = repo.UpsertDailySummary(ctx, &store.DailySummary{
		UserID:         store.DefaultUserID,
		LocalDate:      "2026-09-02",
		Steps:          11390,
		RHRBpm:         50,
		Source:         "apple_healthkit",
		SourceBundleID: "com.fitbit.FitbitMobile",
	})
	_ = repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
		UserID:         store.DefaultUserID,
		MeasuredAt:     now.Add(-25 * time.Hour),
		LocalDate:      "2026-09-02",
		WeightLb:       171.2,
		Source:         "apple_healthkit",
		SourceBundleID: "com.fitbit.FitbitMobile",
	})
	_ = repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
		UserID:         store.DefaultUserID,
		MeasuredAt:     now.Add(-24 * time.Hour),
		LocalDate:      "2026-09-02",
		WeightLb:       170.8,
		BodyFatPct:     13.4,
		Source:         "apple_healthkit",
		SourceBundleID: "com.withings.wiScaleNG", // Non-Fitbit smart scale must NOT be superseded!
	})

	// 3. Re-poll with HTTP 200
	return401 = false
	ingested, err := svc.PollDailyRollup(ctx, store.DefaultUserID, now)
	if err != nil || ingested != 1 {
		t.Fatalf("expected 1 non-echo day ingested, got %d (err=%v)", ingested, err)
	}

	// Outbound echo day 2026-09-01 must have been skipped
	echoDay, _ := repo.GetDailySummary(ctx, store.DefaultUserID, "2026-09-01")
	if echoDay != nil {
		t.Fatalf("outbound echo datapoint should have been skipped, got %+v", echoDay)
	}

	// Day 2026-09-02 must now be owned by google_health_api, with parity audit recorded and Fitbit fallback superseded
	day2, _ := repo.GetDailySummary(ctx, store.DefaultUserID, "2026-09-02")
	if day2 == nil || day2.Source != "google_health_api" || day2.Steps != 11420 {
		t.Fatalf("expected google_health_api primary summary on 2026-09-02, got %+v", day2)
	}
	audits, _ := repo.ListParityAudits(ctx, store.DefaultUserID, 10)
	if len(audits) == 0 {
		t.Fatalf("expected parity audit row logged when primary supersedes fallback")
	}
	supCnt, _ := repo.ListSupersededRecordsCount(ctx, store.DefaultUserID)
	if supCnt < 2 {
		t.Fatalf("expected superseded daily + Fitbit body records >= 2, got %d", supCnt)
	}

	// Verify non-Fitbit Withings smart-scale weigh-in was preserved!
	bodyRows, _ := repo.ListBodyMeasurements(ctx, store.DefaultUserID)
	foundWithings := false
	for _, b := range bodyRows {
		if b.SourceBundleID == "com.withings.wiScaleNG" && b.SupersededBy == "" {
			foundWithings = true
		}
	}
	if !foundWithings {
		t.Fatalf("expected non-Fitbit smart-scale weigh-in (com.withings.wiScaleNG) to remain active, got %+v", bodyRows)
	}
}
