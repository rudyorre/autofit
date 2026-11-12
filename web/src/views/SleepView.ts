import type { BootstrapPayload } from '../api/types';
import { renderSleepStagesDonutSVG } from '../components/GappedRing';

export function renderSleepViewHTML(data: BootstrapPayload): string {
  const sl = data.sleep || {
    local_date: data.selected_date,
    efficiency_pct: 92,
    deep_min: 98,
    rem_min: 108,
    light_min: 248,
    awake_min: 28,
    nadir_hr_bpm: 47,
    nadir_time: '03:40 AM',
    bedtime_label: '11:08 PM – 6:52 AM',
    sleep_score_open: 88,
  };

  const day = data.week_strip[data.selected_index] || data.week_strip[data.week_strip.length - 1];
  const score = day?.sleep_score || sl.sleep_score_open || 88;
  const totalAsleep = (sl.deep_min || 96) + (sl.rem_min || 106) + (sl.light_min || 245);
  const restorativeMin = (sl.deep_min || 96) + (sl.rem_min || 106);
  const restorativePct = Math.round((restorativeMin / Math.max(1, totalAsleep)) * 100);

  const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

  return `
    <div id="view-sleep" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Sleep Hero + Stages Donut -->
      <section class="m3-seam">
        <div class="m3-seam-top clickable-tile" data-open-metric="sleep" style="padding: 18px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: var(--m3-blue); letter-spacing: 0.04em;">
              SLEEP ARCHITECTURE • ${esc(sl.bedtime_label || '11:10 PM – 6:55 AM')}
            </span>
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <span class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em;">${fmtMin(totalAsleep)}</span>
              <span class="badge-trend tabular" style="background: var(--m3-blue-tint); color: var(--m3-on-blue);">Score ${Math.round(score)}</span>
            </div>
            <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">
              Restorative (Deep + REM): <strong>${fmtMin(restorativeMin)} (${restorativePct}%)</strong> • Open Score: ${Math.round(sl.sleep_score_open || 87)}
            </div>
          </div>

          ${renderSleepStagesDonutSVG(
            sl.deep_min || 96,
            sl.rem_min || 106,
            sl.light_min || 245,
            sl.awake_min || 26,
            sl.efficiency_pct || 92
          )}
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-blue); font-weight: 800;">● Deep</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${fmtMin(sl.deep_min || 96)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">● REM</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${fmtMin(sl.rem_min || 106)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-amber); font-weight: 800;">● Light</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${fmtMin(sl.light_min || 245)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-coral); font-weight: 800;">● Awake</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${sl.awake_min || 26}m</div>
          </div>
        </div>
      </section>

      <!-- Bedtime Consistency | Sleeping HR Dip Pair -->
      <div class="m3-pair">
        <div class="m3-pair-l" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Bedtime Window</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">${esc(sl.bedtime_label || '11:08 PM – 6:52 AM')}</div>
          <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">Within ±22 min of 14d median</div>
        </div>
        <div class="m3-pair-r clickable-tile" data-open-metric="rhr" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Sleeping HR Nadir</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">
            ${Math.round(sl.nadir_hr_bpm || 47)} bpm <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">@ ${esc(sl.nadir_time || '03:40 AM')}</span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">Hammock recovery curve</div>
        </div>
      </div>

      <!-- 14-Day Sleep Duration Capsule Chart -->
      <div class="m3-card" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 13px;">14-Day Sleep Duration vs 7.75h Target</strong>
          <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">Dashed line = 7.75h target</span>
        </div>
        <div style="width: 100%; height: 126px;">
          <canvas id="sleep14dCanvas" style="width: 100%; height: 100%;"></canvas>
        </div>
      </div>
    </div>
  `;
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
