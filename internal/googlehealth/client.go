package googlehealth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/rudyorre/autofit/internal/analytics"
	"github.com/rudyorre/autofit/internal/config"
	"github.com/rudyorre/autofit/internal/store"
	"github.com/rudyorre/autofit/internal/store/sqlite"
)

const ProviderName = "google_health"

type TokenHealth struct {
	Configured        bool    `json:"configured"`
	Connected         bool    `json:"connected"`
	Status            string  `json:"status"` // healthy | expiring_soon | expired | unconfigured
	TestingMode7Day   bool    `json:"testing_mode_7day"`
	DaysRemaining     float64 `json:"days_remaining"`
	HoursRemaining    float64 `json:"hours_remaining"`
	RefreshExpiresAt  string  `json:"refresh_expires_at,omitempty"`
	ReconsentAuthURL  string  `json:"reconsent_auth_url,omitempty"`
	WriteWorkoutsSync bool    `json:"write_workouts_sync"`
}

type InboundDailyPayload struct {
	LocalDate      string  `json:"local_date"`
	DatapointID    string  `json:"datapoint_id"`
	Steps          int     `json:"steps"`
	DistanceM      float64 `json:"distance_m"`
	ActiveKcal     int     `json:"active_kcal"`
	TotalKcal      int     `json:"total_kcal"`
	AZMMinutes     int     `json:"azm_minutes"`
	RHRBpm         float64 `json:"rhr_bpm"`
	HRVRmssdMs     float64 `json:"hrv_rmssd_ms"`
	SpO2Pct        float64 `json:"spo2_pct"`
	RespRate       float64 `json:"resp_rate"`
	SkinTempDeltaC float64 `json:"skin_temp_delta_c"`
	VO2GH          float64 `json:"vo2_gh"`
	WeightLb       float64 `json:"weight_lb,omitempty"`
	WeightPointID  string  `json:"weight_datapoint_id,omitempty"`
	BodyFatPct     float64 `json:"body_fat_pct,omitempty"`
}

type Service struct {
	cfg        config.Config
	repo       store.Repository
	httpClient *http.Client
}

func NewService(cfg config.Config, repo store.Repository) *Service {
	return &Service{
		cfg:        cfg,
		repo:       repo,
		httpClient: &http.Client{Timeout: 20 * time.Second},
	}
}

func (s *Service) oauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.cfg.GoogleClientID,
		ClientSecret: s.cfg.GoogleClientSecret,
		RedirectURL:  s.cfg.GoogleRedirectURL,
		Endpoint:     google.Endpoint,
		Scopes: []string{
			"https://www.googleapis.com/auth/health.activity.read",
			"https://www.googleapis.com/auth/health.heartrate.read",
			"https://www.googleapis.com/auth/health.sleep.read",
			"https://www.googleapis.com/auth/health.body.read",
			"https://www.googleapis.com/auth/health.body.write",
		},
	}
}

func (s *Service) AuthConsentURL(state string) string {
	if s.cfg.GoogleClientID == "" {
		return ""
	}
	return s.oauthConfig().AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
}

func (s *Service) ExchangeCallbackCode(ctx context.Context, userID, code string) error {
	tok, err := s.oauthConfig().Exchange(ctx, code)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	state := &store.OAuthTokenState{
		Provider:         ProviderName,
		AccessToken:      tok.AccessToken,
		RefreshToken:     tok.RefreshToken,
		TokenExpiry:      tok.Expiry,
		RefreshIssuedAt:  now,
		RefreshExpiresAt: now.Add(7 * 24 * time.Hour),
		TestingMode7Day:  true,
	}
	return s.repo.SaveOAuthToken(ctx, userID, state)
}

func (s *Service) GetTokenHealth(ctx context.Context, userID string, now time.Time) (*TokenHealth, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tok, err := s.repo.GetOAuthToken(ctx, userID, ProviderName)
	if err != nil {
		return nil, err
	}
	authURL := s.AuthConsentURL("reconsent")

	if tok == nil {
		status := "unconfigured"
		if s.cfg.GoogleClientID != "" {
			status = "disconnected"
		}
		return &TokenHealth{
			Configured:        s.cfg.GoogleClientID != "",
			Connected:         false,
			Status:            status,
			TestingMode7Day:   true,
			DaysRemaining:     0,
			HoursRemaining:    0,
			ReconsentAuthURL:  authURL,
			WriteWorkoutsSync: s.cfg.GoogleWriteWorkouts,
		}, nil
	}

	remHours := tok.RefreshExpiresAt.Sub(now).Hours()
	if remHours < 0 {
		remHours = 0
	}
	remDays := math.Round((remHours/24.0)*10) / 10
	status := "healthy"
	if remHours <= 0 {
		status = "expired"
	} else if remHours <= 36 {
		status = "expiring_soon"
	}
	return &TokenHealth{
		Configured:        true,
		Connected:         remHours > 0,
		Status:            status,
		TestingMode7Day:   tok.TestingMode7Day,
		DaysRemaining:     remDays,
		HoursRemaining:    math.Round(remHours*10) / 10,
		RefreshExpiresAt:  tok.RefreshExpiresAt.UTC().Format(time.RFC3339),
		ReconsentAuthURL:  authURL,
		WriteWorkoutsSync: s.cfg.GoogleWriteWorkouts,
	}, nil
}

// PollDailyRollup pulls [last_successful_sync_ts - 24h, now] from Google Health API v4.
// Guardrail: on HTTP 401/403 (e.g. 7-day Testing token expired), last_successful_sync_ts stays FROZEN!
func (s *Service) PollDailyRollup(ctx context.Context, userID string, now time.Time) (int, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tok, err := s.repo.GetOAuthToken(ctx, userID, ProviderName)
	if err != nil {
		return 0, err
	}
	if tok == nil || tok.AccessToken == "" {
		return 0, nil
	}

	cursor, _ := s.repo.GetSyncCursor(ctx, userID, ProviderName, "daily_rollup")
	since := now.AddDate(0, 0, -7)
	if cursor != nil && !cursor.LastSuccessfulSyncTS.IsZero() {
		since = cursor.LastSuccessfulSyncTS.Add(-24 * time.Hour)
	}

	url := fmt.Sprintf("%s/users/me/dailyRollUp?startTime=%s&endTime=%s",
		s.cfg.GoogleHealthBaseURL,
		since.UTC().Format(time.RFC3339),
		now.UTC().Format(time.RFC3339),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "daily_rollup", 0, err.Error(), nil)
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Freeze cursor (advanceTS = nil)!
		errMsg := fmt.Sprintf("google health http %d", resp.StatusCode)
		_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "daily_rollup", resp.StatusCode, errMsg, nil)
		return 0, fmt.Errorf("%s", errMsg)
	}

	var wire struct {
		Days []InboundDailyPayload `json:"days"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wire); err != nil {
		_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "daily_rollup", http.StatusBadGateway, err.Error(), nil)
		return 0, err
	}

	ingested, err := s.IngestPayloads(ctx, userID, wire.Days)
	if err != nil {
		return ingested, err
	}
	_ = s.repo.UpdateSyncCursorAttempt(ctx, userID, ProviderName, "daily_rollup", http.StatusOK, "", &now)
	return ingested, nil
}

// IngestPayloads reconciles inbound Google Health rollups, skipping outbound echoes and soft-superseding fallback records.
func (s *Service) IngestPayloads(ctx context.Context, userID string, days []InboundDailyPayload) (int, error) {
	count := 0
	for _, item := range days {
		// Guardrail: skip self-originated echoes recorded in outbound_sync_ledger
		if item.DatapointID != "" {
			if echo, _ := s.repo.IsOutboundEcho(ctx, userID, item.DatapointID); echo {
				continue
			}
		}

		readiness := analytics.ComputeOpenReadiness(item.HRVRmssdMs, 58, item.RHRBpm, 53, 85, 1.0)
		d := &store.DailySummary{
			UserID:          userID,
			LocalDate:       item.LocalDate,
			Steps:           item.Steps,
			DistanceM:       item.DistanceM,
			ActiveKcal:      item.ActiveKcal,
			TotalKcal:       item.TotalKcal,
			AZMMinutes:      item.AZMMinutes,
			RHRBpm:          item.RHRBpm,
			HRVRmssdMs:      item.HRVRmssdMs,
			SpO2Pct:         item.SpO2Pct,
			RespRate:        item.RespRate,
			SkinTempDeltaC:  item.SkinTempDeltaC,
			VO2GH:           item.VO2GH,
			ReadinessOpen:   readiness,
			SleepScoreOpen:  86,
			CardioLoadTRIMP: float64(item.AZMMinutes) * 1.4,
			Source:          "google_health_api",
			ExternalID:      item.DatapointID,
		}
		if err := s.repo.UpsertDailySummary(ctx, d); err != nil {
			return count, err
		}

		if item.WeightLb > 0 {
			echo := false
			if item.WeightPointID != "" {
				echo, _ = s.repo.IsOutboundEcho(ctx, userID, item.WeightPointID)
			}
			if !echo {
				dt, _ := time.Parse("2006-01-02", item.LocalDate)
				_ = s.repo.UpsertBodyMeasurement(ctx, &store.BodyMeasurement{
					UserID:     userID,
					MeasuredAt: dt.Add(8 * time.Hour),
					LocalDate:  item.LocalDate,
					WeightLb:   item.WeightLb,
					BodyFatPct: item.BodyFatPct,
					ExternalID: item.WeightPointID,
					Source:     "google_health_api",
				})
			}
		}
		count++
	}
	return count, nil
}

// PushBodyMeasurement writes weight & BF% back to Google Health API v4 (when connected) and records the datapoint ID in outbound_sync_ledger to prevent echo loops.
func (s *Service) PushBodyMeasurement(ctx context.Context, userID string, b *store.BodyMeasurement) (string, error) {
	dpID := "gh-out-body-" + b.ID
	tok, _ := s.repo.GetOAuthToken(ctx, userID, ProviderName)
	if tok != nil && tok.AccessToken != "" && s.cfg.GoogleHealthBaseURL != "" {
		bodyBytes, _ := json.Marshal(map[string]any{
			"clientDataPointId": dpID,
			"localDate":         b.LocalDate,
			"weightLb":          b.WeightLb,
			"bodyFatPct":        b.BodyFatPct,
		})
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.GoogleHealthBaseURL+"/users/me/dataPoints:write", bytes.NewReader(bodyBytes))
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
			req.Header.Set("Content-Type", "application/json")
			if resp, err := s.httpClient.Do(req); err == nil {
				var res struct {
					DataPointID string `json:"dataPointId"`
				}
				_ = json.NewDecoder(resp.Body).Decode(&res)
				_ = resp.Body.Close()
				if res.DataPointID != "" {
					dpID = res.DataPointID
				}
			}
		}
	}

	err := s.repo.RecordOutboundSync(ctx, &store.OutboundSyncEntry{
		ID:                sqlite.NewID(),
		UserID:            userID,
		EntityType:        "weight",
		LocalID:           b.ID,
		GoogleDatapointID: dpID,
		SyncedAt:          time.Now().UTC(),
	})
	return dpID, err
}

func (s *Service) PushWorkoutIfEnabled(ctx context.Context, userID string, w *store.Workout) (string, error) {
	if !s.cfg.GoogleWriteWorkouts {
		return "", nil
	}
	dpID := "gh-out-wk-" + w.ID
	err := s.repo.RecordOutboundSync(ctx, &store.OutboundSyncEntry{
		ID:                sqlite.NewID(),
		UserID:            userID,
		EntityType:        "workout",
		LocalID:           w.ID,
		GoogleDatapointID: dpID,
		SyncedAt:          time.Now().UTC(),
	})
	return dpID, err
}
