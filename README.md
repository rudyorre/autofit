# Autofit (`v0`)

**Autofit** is a self-hosted, single-binary personal fitness, longitudinal strength, cardio telemetry, wearable recovery, and clinical biomarker system with a **Google Health Material 3 Expressive** web app and installable **Offline Mobile PWA**.

- **Zero Cloud Lock-In:** Pure-Go static binary (`CGO_ENABLED=0`) + embedded SQLite in `WAL` mode + embedded Vite/TypeScript SPA (`go:embed`).
- **Gap-Honest Multi-Year Analytics (`2022–2026+`):** Explicit `No Data` hiatus bands (`null` segments—never fake linear bridges across months away), flat-slope `Plateau` callouts, and equipment-aware series separation (`45 lb` Olympic bar vs `20 lb` / `15 lb` Smith machine vs `125 lb` / `118 lb` leg press sled vs `2×` per-hand dumbbells).
- **Zero-Friction Gym PWA:** Installable on iOS/Android home screens with an `IndexedDB` offline workout queue, 6 pre-seeded hybrid split templates, inline 4-year sparklines, and a built-in Plate & Tare Calculator.
- **Deterministic Connectors & Open Scores:**
  - **Google Health API v4** (`dailyRollUp`, sleep stages, HRV, RHR, SpO2, weight write-back with outbound echo ledger, 7-day Testing OAuth countdown & frozen cursor on `401`, and bundle-scoped soft-superseding provenance).
  - **Garmin Connect Personal API + Binary `.FIT` Decoder** (`muktihari/fit` 1Hz HR zones, mile splits, Daniels-Gilbert grade-adjusted `VDOT`, Zone 2 efficiency factor, and Banister `TRIMP`).
  - **HL7 `SMART Health Links` (`shlink:/`) + FHIR R4 LOINC** (`dir` + `A256GCM` + `DEF` JWE decryption for `ApoB`, `HbA1c`, `hs-CRP`, `LDL-C`, `Ferritin`, `Vitamin D`, etc.).
  - **Open Score Calibration:** Linear OLS fit ($R^2$) aligning open Readiness, Sleep, and TRIMP formulas against Google Health ground truth.

---

## Quick Start

### 1. Build from Source

```bash
# 1. Build Material 3 Expressive Web App & Offline PWA into internal/ui/dist
cd web && npm install && npm run build && cd ..

# 2. Compile single static Go binary (zero CGO required)
CGO_ENABLED=0 go build -ldflags="-s -w" -o autofit ./cmd/autofit
```

### 2. Backfill Legacy Workout `.xlsx` / Google Sheet & Seed Demo Telemetry

```bash
# Optional one-time read-only backfill of a 2022–2026 workout spreadsheet (.xlsx path or public Google Sheet URL)
./autofit import-xlsx ./workout_2022_2026.xlsx

# Seed rich multi-year wearables, sleep stages, binary .FIT runs, EWMA weight & FHIR R4 labs (preserves imported workouts)
./autofit seed-demo

# Launch web server & API on :8080
./autofit serve -addr :8080 -db ./data/local/autofit.db
```

### 3. Export Clean CSV Archive or JSON Backup Anytime

```bash
./autofit export-csv -db ./data/local/autofit.db ./exports
```

Or click **`⇄ Sync & CSV` → `Download CSV (.zip)`** directly in the web UI (`GET /api/v1/export/csv.zip`).

---

## Homelab Deployment (Docker Compose + Tailscale Ready)

```bash
cp .env.example .env
docker compose up -d --build
```

When exposed over Tailscale Serve, set `AUTOFIT_TAILSCALE_AUTH=true` to authenticate automatically via `Tailscale-User-Login`, or set `AUTOFIT_OWNER_SECRET` for single-owner HMAC cookie auth.

---

## Repository Layout

```text
autofit/
├── cmd/autofit/main.go               # Single-binary CLI: serve, import-xlsx, seed-demo, export-csv
├── data/exercises/catalog.json       # 44 canonical exercises + aliases + 6 hybrid split templates
├── internal/
│   ├── analytics/                    # Longitudinal regime/gap/plateau engine + Open Scores & OLS calibration
│   ├── api/                          # Chi REST router + SPA/PWA static asset server
│   ├── auth/                         # Tailscale header + HMAC owner cookie middleware
│   ├── demo/                         # Multi-year deterministic synthetic wearables, .FIT & FHIR seed
│   ├── garmin/                       # Garmin Personal API poller + muktihari/fit binary decoder/encoder
│   ├── googlehealth/                 # Google Health API v4 OAuth2, frozen-401 cursor & echo deduplicator
│   ├── importer/                     # Formula-aware read-only .xlsx backfill (=45+2*45, Smith, Sled, 2*DB)
│   ├── medical/                      # HL7 SMART Health Links (shlink:/ JWE A256GCM) -> FHIR R4 LOINC
│   ├── store/                        # Repository interface + pure-Go SQLite WAL & soft-superseding store
│   └── ui/                           # go:embed static bundle for web/ build output
└── web/                              # Vite + TypeScript + Vanilla CSS Material 3 Expressive SPA & Offline PWA
```

## Safe Schema Evolution (Once Live Data Is Populated)

1. **Numbered Forward-Only Migrations (`internal/store/sqlite/migrations/`):**
   - Never edit `001_init.sql` once real workouts/vitals live in `autofit.db`. Add numbered additive files (`002_add_rpe_notes.sql`, `003_nutrition.sql`, etc.).
   - On startup, `sqlite.Open()` checks `schema_migrations`, automatically creates an atomic online snapshot (`autofit.db.bak-<timestamp>-pre-002_...`) via `VACUUM INTO` before applying any new migration, and runs each migration inside a transaction.
2. **Online Atomic Backups (`VACUUM INTO`) + Human-Readable CSV/JSON Exports:**
   - Run `./autofit backup -db ./data/local/autofit.db` anytime (safe even while `autofit serve` is actively serving requests in `WAL` mode) plus `./autofit export-csv` for portable CSV/JSON backups.
3. **Test Against a Cloned DB Before Deploying:**
   - Copy/snapshot production `autofit.db` to `./data/local/staging.db`, boot the candidate binary against `-db ./data/local/staging.db`, and verify migrations and longitudinal trends before restarting your homelab container.

## Running Tests

```bash
CGO_ENABLED=0 go test -v ./...
```

## License

[MIT](./LICENSE)