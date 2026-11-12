import type { BootstrapPayload } from '../api/types';
import { buildSparklineSVG } from '../components/CapsuleChart';

export function renderFitnessViewHTML(data: BootstrapPayload, liftQuery: string): string {
  const q = liftQuery.trim().toLowerCase();
  const filteredLifts = (data.key_lifts || []).filter(
    (item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.primary_muscle.toLowerCase().includes(q) ||
      item.equipment.toLowerCase().includes(q)
  );

  const latestRun = data.recent_runs?.[0];
  const z2Pace = latestRun?.zone2_pace_sec_per_mi
    ? `${Math.floor(latestRun.zone2_pace_sec_per_mi / 60)}:${String(Math.round(latestRun.zone2_pace_sec_per_mi % 60)).padStart(2, '0')}/mi`
    : '8:14/mi';

  const zones = latestRun?.hr_zones_minutes || { z1: 3, z2: 14, z3: 9, z4: 5, z5: 1 };
  const totalZoneMin = Math.max(1, (zones.z1 || 0) + (zones.z2 || 0) + (zones.z3 || 0) + (zones.z4 || 0) + (zones.z5 || 0));

  return `
    <div id="view-fitness" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Key Lifts Progression Leaderboard (2022–2026 SQLite Backfill + PWA Sets) -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              SQLITE STRENGTH PROGRESSION • ${data.key_lifts?.length || 0} TRACKED LIFTS
            </div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 1px;">
              2022–2026 Key Lifts Leaderboard
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <input
              id="input-filter-lifts"
              type="search"
              value="${esc(liftQuery)}"
              placeholder="Filter muscle or lift…"
              class="m3-input"
              style="width: 185px; padding: 6px 12px; font-size: 12px;"
              aria-label="Filter tracked lifts"
            />
            <button type="button" id="btn-fitness-go-lift" data-switch-tab="lift" class="m3-btn-fill">+ Log Workout</button>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 8px 12px 12px 12px; display: flex; flex-direction: column; gap: 6px;">
          ${filteredLifts
            .slice(0, 24)
            .map(
              (item) => `
              <div
                class="clickable-tile"
                data-open-metric="${esc(item.metric_key)}"
                style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
              >
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong style="font-size: 14px;">${esc(item.name)}</strong>
                    <span style="font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--m3-surface); color: var(--m3-ink-2); font-weight: 600;">
                      ${esc(item.primary_muscle)} • ${esc(formatEquipLabel(item.equipment))}
                    </span>
                  </div>
                  <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${esc(item.narrative)} (${item.sessions} sessions)
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                  ${buildSparklineSVG(item.sparkline || [], 'var(--m3-teal)', 74, 24)}
                  <div style="text-align: right; min-width: 78px;">
                    <div class="tabular" style="font-size: 15px; font-weight: 800;">
                      ${item.current_val.toFixed(item.current_val % 1 === 0 ? 0 : 1)} ${esc(item.unit)}
                    </div>
                    <div class="tabular" style="font-size: 11px; font-weight: 700; color: ${item.pct_gain >= 0 ? 'var(--m3-teal)' : 'var(--m3-coral)'};">
                      ${item.pct_gain >= 0 ? '+' : ''}${item.pct_gain}% vs '22
                    </div>
                  </div>
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      </section>

      <!-- Garmin .FIT Running Analytics: VDOT + Zone 2 Efficiency Pair -->
      <div class="m3-pair">
        <div class="m3-pair-l clickable-tile" data-open-metric="vo2" style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 700;">Running VDOT (VO2)</span>
            <span style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">4y ›</span>
          </div>
          <div class="tabular" style="font-size: 26px; font-weight: 800;">
            ${latestRun ? latestRun.vdot_open.toFixed(1) : '49.4'} <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">mL/kg</span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Daniels-Gilbert grade-adjusted from Garmin .FIT
          </div>
        </div>

        <div class="m3-pair-r" style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 700;">Zone 2 Aerobic Pace</span>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              EF ${latestRun ? latestRun.zone2_efficiency.toFixed(2) : '1.41'}
            </span>
          </div>
          <div class="tabular" style="font-size: 26px; font-weight: 800;">
            ${z2Pace}
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Normalized @ 141 bpm • Cadence ${latestRun?.avg_cadence || 180} spm
          </div>
        </div>
      </div>

      <!-- Binary Garmin .FIT Decoder & Mile Splits Card -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-amber);">MUKTIHARI/FIT BINARY TELEMETRY</div>
            <div style="font-size: 15px; font-weight: 800;">
              ${esc(latestRun?.title || 'Garmin Tempo Run (.FIT)')}
              <span class="tabular" style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">
                • ${latestRun?.local_date || ''}
              </span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <label class="m3-pill" style="cursor: pointer;">
              <span>Upload .FIT</span>
              <input id="input-fit-upload" type="file" accept=".fit" style="display: none;" />
            </label>
            <button type="button" id="btn-sample-fit" class="m3-btn-tonal">Decode Sample .FIT</button>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
          <div class="m3-carousel" style="gap: 8px;">
            ${(latestRun?.splits || [])
              .map(
                (sp) => `
                <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px 13px; min-width: 116px;">
                  <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Mile ${sp.mile}</div>
                  <div class="tabular" style="font-size: 17px; font-weight: 800; margin-top: 2px;">${esc(sp.pace_formatted)}</div>
                  <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${sp.avg_hr} bpm • ${sp.avg_cadence || 180} spm
                  </div>
                </div>
              `
              )
              .join('') || '<div style="font-size: 12px; color: var(--m3-ink-2);">Click "Decode Sample .FIT" or upload a Garmin .FIT file to inspect mile splits.</div>'}
          </div>

          <!-- 5-Zone HR Distribution -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">
              <span>Heart Rate Zones (1Hz .FIT Record Stream)</span>
              <span class="tabular">Z2: ${zones.z2 || 0}m • Z3: ${zones.z3 || 0}m • Z4: ${zones.z4 || 0}m</span>
            </div>
            <div style="display: flex; gap: 3px; height: 10px; border-radius: 999px; overflow: hidden;">
              <div style="flex: ${Math.max(1, ((zones.z1 || 0) / totalZoneMin) * 100)}; background: var(--m3-surface-hi);" title="Z1"></div>
              <div style="flex: ${Math.max(2, ((zones.z2 || 0) / totalZoneMin) * 100)}; background: var(--m3-teal);" title="Z2 Aerobic"></div>
              <div style="flex: ${Math.max(1, ((zones.z3 || 0) / totalZoneMin) * 100)}; background: var(--m3-blue);" title="Z3 Tempo"></div>
              <div style="flex: ${Math.max(1, ((zones.z4 || 0) / totalZoneMin) * 100)}; background: var(--m3-amber);" title="Z4 Threshold"></div>
              <div style="flex: ${Math.max(0.5, ((zones.z5 || 0) / totalZoneMin) * 100)}; background: var(--m3-coral);" title="Z5 Anaerobic"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function formatEquipLabel(eq: string): string {
  switch (eq) {
    case 'olympic_bar':
      return '45 lb Barbell';
    case 'smith':
      return 'Smith Machine';
    case 'dumbbell_pair':
      return '2× Dumbbells';
    case 'sled':
      return 'Leg Press Sled';
    case 'cable':
      return 'Cable Stack';
    case 'machine':
      return 'Machine';
    default:
      return eq || 'Standard';
  }
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
