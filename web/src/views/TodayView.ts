import type { BootstrapPayload, DayCardDTO } from '../api/types';
import { buildSparklineSVG } from '../components/CapsuleChart';
import { renderConcentricHeroRingsSVG, renderScoreHorseshoeSVG } from '../components/GappedRing';

export function renderTodayViewHTML(data: BootstrapPayload, stepMode: '24h' | '7d'): string {
  const day: DayCardDTO = data.week_strip[data.selected_index] || data.week_strip[data.week_strip.length - 1] || {
    date: data.selected_date,
    day_letter: 'T',
    day_num: 1,
    title: 'Today',
    steps: 0,
    distance_mi: 0,
    active_kcal: 0,
    total_kcal: 0,
    azm: 0,
    rhr: 51,
    hrv: 62,
    spo2: 98,
    vo2: 49,
    readiness: 84,
    readiness_open: 83,
    sleep_score: 88,
    sleep_open: 87,
    sleep_text: '7h 45m',
    cardio_load: 412,
    cardio_open: 406,
    battery_pct: 92,
  };

  const stepsGoal = 10000;
  const azmGoal = 45;
  const latestRun = data.recent_runs?.[0];
  const latestWorkout = data.recent_workouts?.[0];
  const body = data.body;

  const rStatus = day.readiness >= 80 ? 'Optimal Recovery' : day.readiness >= 65 ? 'Steady Baseline' : 'Prioritize Rest';
  const sStatus = day.sleep_score >= 82 ? 'Deep Restorative' : 'Solid Continuity';

  return `
    <div id="view-today" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Beat 1: Concentric Hero + Readiness/Sleep 2-Up Pair -->
      <div class="m3-split-12">
        <div class="span-7 m3-hero clickable-tile" data-open-metric="steps" style="padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--m3-on-teal); opacity: 0.85;">
                DAILY MOVEMENT • ${esc(day.title.toUpperCase())}
              </span>
              <div>
                <div class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: var(--m3-on-teal);">
                  ${day.steps.toLocaleString()}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: var(--m3-on-teal); opacity: 0.82;">
                  of ${stepsGoal.toLocaleString()} steps
                </div>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span class="tabular" style="font-size: 20px; font-weight: 800; color: var(--m3-amber);">${day.azm}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--m3-on-teal); opacity: 0.84;">Active Zone Min / ${azmGoal}</span>
              </div>
            </div>

            ${renderConcentricHeroRingsSVG(day.steps / stepsGoal, day.azm / azmGoal)}
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;">
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Distance</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${day.distance_mi.toFixed(2)} mi</div>
            </div>
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Total Energy</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${day.total_kcal.toLocaleString()} kcal</div>
            </div>
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Logged Lifts</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${data.total_workouts} wks</div>
            </div>
          </div>
        </div>

        <div class="span-5 m3-pair" style="align-content: stretch;">
          <div class="m3-pair-l clickable-tile" data-open-metric="readiness" style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Readiness</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${renderScoreHorseshoeSVG(day.readiness, 'var(--m3-teal)', 'var(--m3-teal-track)')}
              <div>
                <div style="font-size: 12px; font-weight: 700;">${rStatus}</div>
                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">Open: ${Math.round(day.readiness_open)} pts</div>
              </div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
              HRV ${Math.round(day.hrv)} ms • RHR ${Math.round(day.rhr)} bpm
            </div>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="sleep" style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Sleep</span>
              <span style="font-size: 11px; color: var(--m3-blue); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${renderScoreHorseshoeSVG(day.sleep_score, 'var(--m3-blue)', 'var(--m3-blue-track)')}
              <div>
                <div class="tabular" style="font-size: 13px; font-weight: 800;">${esc(day.sleep_text)}</div>
                <div style="font-size: 11px; color: var(--m3-ink-2);">${sStatus}</div>
              </div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
              Open Sleep: ${Math.round(day.sleep_open)} • Eff ${Math.round(data.sleep?.efficiency_pct || 92)}%
            </div>
          </div>
        </div>
      </div>

      <!-- Beat 2: Steps Capsule Chart + Cardio Load / RHR 2-Up Pair -->
      <div class="m3-split-12">
        <div class="span-7 m3-card" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 13px; font-weight: 700;">Steps &amp; Hourly Cadence</div>
              <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                ${stepMode === '24h' ? '24h distribution across today' : 'Last 7 days vs 10,000 goal'}
              </div>
            </div>
            <div class="m3-seg">
              <button type="button" id="btn-step-24h" data-step-mode="24h" data-on="${stepMode === '24h' ? 'true' : 'false'}">24h</button>
              <button type="button" id="btn-step-7d" data-step-mode="7d" data-on="${stepMode === '7d' ? 'true' : 'false'}">7d</button>
            </div>
          </div>
          <div style="width: 100%; height: 122px;">
            <canvas id="stepsCapsuleCanvas" style="width: 100%; height: 100%;"></canvas>
          </div>
        </div>

        <div class="span-5 m3-pair">
          <div class="m3-pair-l clickable-tile" data-open-metric="vo2" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Cardio Load</span>
              <span style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">TRIMP</span>
            </div>
            <div>
              <div class="tabular" style="font-size: 24px; font-weight: 800;">${Math.round(day.cardio_load)}</div>
              <div style="font-size: 11px; color: var(--m3-ink-2);">Target sweet spot: 360–460</div>
            </div>
            <div style="height: 8px; border-radius: 999px; background: var(--m3-amber-track); overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100, Math.round((day.cardio_load / 520) * 100))}%; background: var(--m3-amber); border-radius: 999px;"></div>
            </div>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="rhr" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Resting HR</span>
              <span style="font-size: 11px; color: var(--m3-coral); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span class="tabular" style="font-size: 24px; font-weight: 800;">${Math.round(day.rhr)}</span>
              <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">bpm</span>
            </div>
            <div style="width: 100%; height: 36px;">
              <canvas id="rhrMiniWaveCanvas" style="width: 100%; height: 100%;"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Beat 3: Overnight Health Metrics Carousel -->
      <div class="m3-card" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 13px;">Overnight Health Vitals (Fitbit Air → Google Health)</strong>
          <span style="font-size: 11px; color: var(--m3-ink-2);">Tap any metric for 4y curve</span>
        </div>
        <div class="m3-carousel vitals-row">
          <div class="m3-carousel-item clickable-tile" data-open-metric="hrv" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">HRV (RMSSD)</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${Math.round(day.hrv)} ms</div>
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">In personal range</div>
          </div>
          <div class="m3-carousel-item clickable-tile" data-open-metric="rhr" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Sleeping RHR</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${Math.round(day.rhr)} bpm</div>
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">Optimal dip</div>
          </div>
          <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">SpO2</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${(day.spo2 || 98).toFixed(0)}%</div>
            <div style="font-size: 11px; color: var(--m3-ink-2);">96–99% baseline</div>
          </div>
          <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Breathing Rate</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">14.2 brpm</div>
            <div style="font-size: 11px; color: var(--m3-ink-2);">Steady</div>
          </div>
          <div class="m3-carousel-item clickable-tile" data-open-metric="vo2" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Cardio Fitness</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${(day.vo2 || 49.4).toFixed(1)}</div>
            <div style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">mL/kg/min</div>
          </div>
        </div>
      </div>

      <!-- Beat 4: Recent Garmin .FIT Run + Strength Session Seam Stack AND Weight EWMA + Body Comp -->
      <div class="m3-split-12">
        <div class="span-7 m3-seam">
          <div class="m3-seam-top clickable-tile" data-switch-tab="fitness" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-amber);">LATEST GARMIN .FIT RUN</div>
              <div style="font-size: 14px; font-weight: 800; margin-top: 1px;">
                ${esc(latestRun?.title || 'Garmin Aerobic Run (.FIT)')}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${
                  latestRun
                    ? `${(latestRun.distance_m / 1609.344).toFixed(2)} mi • Avg HR ${latestRun.avg_hr} bpm • VDOT ${latestRun.vdot_open.toFixed(1)} • TRIMP ${Math.round(latestRun.trimp)}`
                    : 'Upload or generate a .FIT run in Fitness tab'
                }
              </div>
            </div>
            <span class="m3-pill">Splits ›</span>
          </div>

          <div class="m3-seam-bot clickable-tile" data-switch-tab="lift" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal);">LATEST STRENGTH SESSION</div>
              <div style="font-size: 14px; font-weight: 800; margin-top: 1px;">
                ${esc(latestWorkout?.title || 'Push / Chest & Triceps')}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${
                  latestWorkout
                    ? `${latestWorkout.local_date} • ${latestWorkout.sets?.length || 0} working sets (${esc(latestWorkout.source)})`
                    : 'Tap + Lift to log sets in 1 tap'
                }
              </div>
            </div>
            <span class="m3-btn-tonal">+ Lift</span>
          </div>
        </div>

        <div class="span-5 m3-pair">
          <div class="m3-pair-l" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div class="clickable-tile" data-open-metric="weight" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Weight (EWMA)</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <div>
                <div class="tabular" style="font-size: 22px; font-weight: 800;">
                  ${body ? body.ewma_weight_lb.toFixed(1) : '171.4'} <span style="font-size: 12px; font-weight: 600;">lb</span>
                </div>
                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Scale: ${body ? body.weight_lb.toFixed(1) : '171.6'} lb (${body && body.delta_vs_peak <= 0 ? '' : '+'}${body ? body.delta_vs_peak.toFixed(1) : '-8.4'} vs peak)
                </div>
              </div>
              ${body?.sparkline?.length ? buildSparklineSVG(body.sparkline, 'var(--m3-teal)', 62, 24) : ''}
            </div>
            <form id="form-quick-weight" style="display: flex; gap: 5px; margin-top: 2px;">
              <input
                id="input-quick-weight"
                type="number"
                step="0.1"
                placeholder="${body ? body.weight_lb.toFixed(1) : '171.5'} lb"
                class="m3-input tabular"
                style="padding: 6px 9px; font-size: 12px;"
                aria-label="Quick log weight in pounds"
              />
              <button id="btn-quick-weight-save" type="submit" class="m3-btn-fill" style="padding: 6px 11px;">Log</button>
            </form>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="body_fat" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Body Comp</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div>
              <div class="tabular" style="font-size: 22px; font-weight: 800;">
                ${body?.body_fat_pct ? body.body_fat_pct.toFixed(1) : '13.6'}%
              </div>
              <div style="font-size: 11px; color: var(--m3-ink-2);">Body Fat</div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              Lean Mass: ${body?.lean_mass_lb ? body.lean_mass_lb.toFixed(1) : '148.1'} lb
            </div>
          </div>
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
