package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const (
	DefaultUserID = "owner"
	CookieName    = "autofit_session"
)

type ctxKey string

const userIDKey ctxKey = "autofit_user_id"

type Manager struct {
	ownerSecret       string
	tailscaleAuth     bool
	trustedUserHeader string
}

func NewManager(ownerSecret string, tailscaleAuth bool, trustedUserHeader string) *Manager {
	if trustedUserHeader == "" {
		trustedUserHeader = "Tailscale-User-Login"
	}
	return &Manager{
		ownerSecret:       ownerSecret,
		tailscaleAuth:     tailscaleAuth,
		trustedUserHeader: trustedUserHeader,
	}
}

func UserIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(userIDKey).(string); ok && v != "" {
		return v
	}
	return DefaultUserID
}

func (m *Manager) RequirePassphrase() bool {
	return m.ownerSecret != ""
}

func (m *Manager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Always allow PWA manifest, service worker, icons, auth endpoints, and OAuth callbacks.
		p := r.URL.Path
		if !strings.HasPrefix(p, "/api/") ||
			p == "/api/v1/auth/login" ||
			p == "/api/v1/auth/logout" ||
			p == "/api/v1/auth/status" ||
			strings.HasPrefix(p, "/api/v1/integrations/google-health/callback") {
			ctx := context.WithValue(r.Context(), userIDKey, DefaultUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Zero-config homelab/local mode when no passphrase is set.
		if m.ownerSecret == "" {
			ctx := context.WithValue(r.Context(), userIDKey, DefaultUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Optional Tailscale Serve / trusted reverse proxy header bypass.
		if m.tailscaleAuth && strings.TrimSpace(r.Header.Get(m.trustedUserHeader)) != "" {
			ctx := context.WithValue(r.Context(), userIDKey, DefaultUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Bearer header or signed session cookie.
		if tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "); tok != "" && tok != r.Header.Get("Authorization") {
			if subtle.ConstantTimeCompare([]byte(tok), []byte(m.ownerSecret)) == 1 {
				ctx := context.WithValue(r.Context(), userIDKey, DefaultUserID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		if c, err := r.Cookie(CookieName); err == nil && m.verifyToken(c.Value) {
			ctx := context.WithValue(r.Context(), userIDKey, DefaultUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":         "unauthorized",
			"auth_required": true,
		})
	})
}

func (m *Manager) HandleStatus(w http.ResponseWriter, r *http.Request) {
	authenticated := m.ownerSecret == ""
	via := "open_local"
	if m.tailscaleAuth && strings.TrimSpace(r.Header.Get(m.trustedUserHeader)) != "" {
		authenticated = true
		via = "tailscale"
	} else if c, err := r.Cookie(CookieName); err == nil && m.verifyToken(c.Value) {
		authenticated = true
		via = "cookie"
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"authenticated":      authenticated,
		"require_passphrase": m.ownerSecret != "",
		"user_id":            DefaultUserID,
		"via":                via,
	})
}

func (m *Manager) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Secret string `json:"secret"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if m.ownerSecret != "" && subtle.ConstantTimeCompare([]byte(req.Secret), []byte(m.ownerSecret)) != 1 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "invalid secret"})
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    m.signToken(DefaultUserID),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 90,
		Expires:  time.Now().Add(90 * 24 * time.Hour),
	})
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"authenticated": true, "user_id": DefaultUserID})
}

func (m *Manager) HandleLogout(w http.ResponseWriter, _ *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"authenticated": false})
}

func (m *Manager) signToken(userID string) string {
	mac := hmac.New(sha256.New, []byte(m.ownerSecret))
	mac.Write([]byte(userID))
	return userID + "." + hex.EncodeToString(mac.Sum(nil))
}

func (m *Manager) verifyToken(val string) bool {
	if m.ownerSecret == "" {
		return true
	}
	parts := strings.SplitN(val, ".", 2)
	if len(parts) != 2 {
		return false
	}
	expected := m.signToken(parts[0])
	return subtle.ConstantTimeCompare([]byte(val), []byte(expected)) == 1
}
