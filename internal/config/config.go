package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr              string
	DBPath            string
	Timezone          string
	OwnerSecret       string
	TailscaleAuth     bool
	TrustedUserHeader string

	GoogleClientID      string
	GoogleClientSecret  string
	GoogleRedirectURL   string
	GoogleHealthBaseURL string
	GoogleSyncInterval  time.Duration
	GoogleWriteWorkouts bool

	GarminPersonalAPIKey string
	GarminBaseURL        string
	GarminSyncInterval   time.Duration
}

func Load() Config {
	return Config{
		Addr:              envOr("AUTOFIT_ADDR", ":8080"),
		DBPath:            envOr("AUTOFIT_DB_PATH", "./data/local/autofit.db"),
		Timezone:          envOr("AUTOFIT_TIMEZONE", "America/Los_Angeles"),
		OwnerSecret:       strings.TrimSpace(os.Getenv("AUTOFIT_OWNER_SECRET")),
		TailscaleAuth:     envBool("AUTOFIT_TAILSCALE_AUTH", true),
		TrustedUserHeader: envOr("AUTOFIT_TRUSTED_USER_HEADER", "Tailscale-User-Login"),

		GoogleClientID:      strings.TrimSpace(os.Getenv("GOOGLE_HEALTH_CLIENT_ID")),
		GoogleClientSecret:  strings.TrimSpace(os.Getenv("GOOGLE_HEALTH_CLIENT_SECRET")),
		GoogleRedirectURL:   envOr("GOOGLE_HEALTH_REDIRECT_URL", "http://localhost:8080/api/v1/integrations/google-health/callback"),
		GoogleHealthBaseURL: envOr("GOOGLE_HEALTH_BASE_URL", "https://health.googleapis.com/v4"),
		GoogleSyncInterval:  envDuration("GOOGLE_HEALTH_SYNC_INTERVAL", 15*time.Minute),
		GoogleWriteWorkouts: envBool("GOOGLE_HEALTH_WRITE_WORKOUTS", false),

		GarminPersonalAPIKey: strings.TrimSpace(os.Getenv("GARMIN_PERSONAL_API_KEY")),
		GarminBaseURL:        envOr("GARMIN_BASE_URL", "https://apis.garmin.com/personal/v1"),
		GarminSyncInterval:   envDuration("GARMIN_SYNC_INTERVAL", 30*time.Minute),
	}
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		return fallback
	}
	return d
}
