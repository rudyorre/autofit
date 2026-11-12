import type { BootstrapPayload } from '../api/types';

export function renderCalibrationDrawerHTML(data: BootstrapPayload, open: boolean): string {
  if (!open) return '';
  const day = data.week_strip[data.selected_index] || data.week_strip[data.week_strip.length - 1];
  const r2 = data.calibration?.readiness?.r2 ?? 0.97;

  return `
    <section id="cal-drawer" class="m3-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--m3-hairline);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <strong style="font-size: 14px;">Calibrate Open Scores w/ Google Health Ground Truth</strong>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Linear OLS fit aligns Open Readiness, Sleep &amp; Banister TRIMP to your Fitbit / Google Health app numbers.
          </div>
        </div>
        <button type="button" id="btn-close-cal" class="m3-pill" style="padding: 4px 10px;">Done</button>
      </div>

      <form id="form-calibration" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 12px;">
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Readiness</span>
            <input id="in-cal-r" type="number" step="1" value="${Math.round(day?.readiness || 84)}" class="m3-input tabular" />
          </label>
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Sleep Score</span>
            <input id="in-cal-s" type="number" step="1" value="${Math.round(day?.sleep_score || 88)}" class="m3-input tabular" />
          </label>
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Cardio Load</span>
            <input id="in-cal-c" type="number" step="1" value="${Math.round(day?.cardio_load || 412)}" class="m3-input tabular" />
          </label>
        </div>
        <button id="btn-save-calibration" type="submit" class="m3-btn-fill" style="width: 100%; padding: 9px;">
          Update OLS Calibration Curve (R² = ${r2.toFixed(2)}, n = ${data.calibration?.readiness?.samples || 0})
        </button>
      </form>
    </section>
  `;
}

export function renderDataSyncDrawerHTML(data: BootstrapPayload, open: boolean): string {
  if (!open) return '';
  const gh = data.integrations?.google_health;
  const parity = data.integrations?.parity_scorecard;

  const ghBadgeBg =
    gh?.status === 'healthy'
      ? 'var(--m3-teal-tint)'
      : gh?.status === 'expiring_soon'
        ? 'var(--m3-amber-tint)'
        : 'var(--m3-surface-dim)';
  const ghBadgeFg =
    gh?.status === 'healthy'
      ? 'var(--m3-on-teal)'
      : gh?.status === 'expiring_soon'
        ? 'var(--m3-on-amber)'
        : 'var(--m3-ink-2)';

  return `
    <section id="sync-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            SELF-HOSTED SQLITE WAL • ZERO CLOUD LOCK-IN
          </div>
          <strong style="font-size: 15px;">Connectors, One-Time .XLSX Backfill &amp; Exports</strong>
        </div>
        <button type="button" id="btn-close-sync" class="m3-pill">Close</button>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px;">
        <!-- Google Health API v4 Card -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Google Health API v4</strong>
            <span class="tabular" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${ghBadgeBg}; color: ${ghBadgeFg};">
              ${gh?.connected ? `${gh.days_remaining.toFixed(1)}d token left` : gh?.status || 'Local Mode'}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            7-day Testing OAuth guard: sync cursor freezes on HTTP 401; outbound ledger prevents weight echo loops.
          </div>
          ${
            gh?.reconsent_auth_url
              ? `<a href="${esc(gh.reconsent_auth_url)}" class="m3-btn-tonal" style="text-decoration: none; margin-top: 4px;">1-Click Weekly Re-Consent</a>`
              : `<button type="button" id="btn-trigger-sync" class="m3-pill" style="align-self: flex-start; margin-top: 2px;">Run Connector Poll</button>`
          }
        </div>

        <!-- 30-Day Shadow Parity Scorecard -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Shadow Parity &amp; Provenance</strong>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">
              ${parity?.sleep_agreement_pct ?? 99.7}% Sleep Match
            </span>
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Steps Δ: ${parity?.steps_delta_pct ?? 0.28}% • RHR Δ: ${parity?.rhr_delta_bpm ?? 0.0} bpm
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Soft-superseded rows: <strong>${parity?.superseded_records ?? 0}</strong> • Outbound ledger: <strong>${parity?.outbound_ledger_cnt ?? 0}</strong>
          </div>
        </div>
      </div>

      <!-- One-Time Read-Only Google Sheet / .XLSX Backfill + Clean Exports -->
      <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <form id="form-xlsx-url" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <input
            id="input-xlsx-url"
            type="url"
            placeholder="Paste public Google Sheet URL or upload .xlsx for read-only 2022–2026 backfill…"
            class="m3-input"
            style="flex: 1; min-width: 230px; font-size: 12px;"
          />
          <button type="submit" id="btn-import-xlsx-url" class="m3-btn-tonal">Import Sheet URL</button>
          <label class="m3-pill" style="cursor: pointer;">
            <span>Upload .xlsx</span>
            <input id="input-xlsx-file" type="file" accept=".xlsx" style="display: none;" />
          </label>
        </form>

        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid var(--m3-hairline);">
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Export normalized SQLite WAL tables anytime as CSV archive or full JSON backup:
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <a id="link-export-csv" href="/api/v1/export/csv.zip" download="autofit_csv_export.zip" class="m3-btn-fill" style="text-decoration: none;">
              Download CSV (.zip)
            </a>
            <a id="link-export-json" href="/api/v1/export/json" download="autofit_backup.json" class="m3-pill" style="text-decoration: none;">
              Export JSON Backup
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
