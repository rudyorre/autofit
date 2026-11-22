import type { BootstrapPayload, FeatureFlagsDTO } from '../api/types';

export function renderCheckInDrawerHTML(
  data: BootstrapPayload,
  open: boolean,
  showAllInputs: boolean
): string {
  if (!open || !data.overview) return '';

  const flags = data.overview.preferences.feature_flags;
  const chk = data.overview.today_checkin;
  const rom = data.overview.latest_mobility_tests || {};
  const body = data.body;

  const screenHrs = chk?.screen_time_min ? Math.floor(chk.screen_time_min / 60) : '';
  const screenMins = chk?.screen_time_min ? chk.screen_time_min % 60 : '';

  const showCardio = showAllInputs || flags.pillar_cardio;
  const showSleep = showAllInputs || flags.pillar_sleep;
  const showBody = showAllInputs || flags.pillar_weight || flags.pillar_body_fat;
  const showScreen = showAllInputs || flags.pillar_screen_time;
  const showFlex = showAllInputs || flags.pillar_flexibility;

  return `
    <section id="checkin-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            UNIFIED FAST CHECK-IN • ONLY FILL WHAT CHANGED
          </div>
          <strong style="font-size: 15px;">Log Raw Inputs (${esc(data.selected_date)})</strong>
        </div>

        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <button type="button" id="btn-toggle-all-checkin" class="m3-pill" style="padding: 5px 10px;">
            ${showAllInputs ? 'Active Pillars Only' : 'Show All 7 Inputs'}
          </button>
          <button type="button" data-switch-tab="lift" class="m3-btn-tonal" style="padding: 5px 10px;">
            + Log Lift Sets →
          </button>
          <button type="button" id="btn-close-checkin" class="m3-pill" style="padding: 5px 10px;">✕</button>
        </div>
      </div>

      <form id="form-unified-checkin" class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
          <!-- Date selector -->
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 11.5px; font-weight: 700; color: var(--m3-ink-2);">Check-In Date</label>
            <input id="in-chk-date" type="date" value="${esc(data.selected_date)}" class="m3-input tabular" />
            <div style="font-size: 10.5px; color: var(--m3-ink-2);">
              Blank fields are skipped (won't overwrite existing entries).
            </div>
          </div>

          ${
            showCardio
              ? `
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-amber);">Cardio Session (Quick Log)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Min</span>
                  <input id="in-chk-cardio-min" type="number" step="1" placeholder="32" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Miles</span>
                  <input id="in-chk-cardio-mi" type="number" step="0.1" placeholder="4.0" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Avg HR</span>
                  <input id="in-chk-cardio-hr" type="number" step="1" placeholder="148" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Auto-computes VDOT &amp; Zone 2 pace (or upload .FIT in Fitness).</div>
            </div>
          `
              : ''
          }

          ${
            showSleep
              ? `
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-blue);">Sleep (Manual Override)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Hours Asleep</span>
                  <input id="in-chk-sleep-hrs" type="number" step="0.1" placeholder="7.6" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Efficiency %</span>
                  <input id="in-chk-sleep-eff" type="number" step="1" placeholder="91" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Leave blank when synced from wearable.</div>
            </div>
          `
              : ''
          }

          ${
            showBody
              ? `
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-teal);">Weight, Body Fat &amp; Waist</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Weight lb</span>
                  <input id="in-chk-weight" type="number" step="0.1" placeholder="${body?.weight_lb ? body.weight_lb.toFixed(1) : '165.0'}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">BF %</span>
                  <input id="in-chk-bf" type="number" step="0.1" placeholder="${body?.body_fat_pct ? body.body_fat_pct.toFixed(1) : '15.0'}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Waist in</span>
                  <input id="in-chk-waist" type="number" step="0.1" placeholder="${chk?.waist_in || '31.5'}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
            </div>
          `
              : ''
          }

          ${
            showScreen
              ? `
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-coral);">Daily Screen Time (Phone / Leisure)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Hours</span>
                  <input id="in-chk-screen-h" type="number" step="1" min="0" max="16" placeholder="${screenHrs !== '' ? screenHrs : '2'}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Minutes</span>
                  <input id="in-chk-screen-m" type="number" step="1" min="0" max="59" placeholder="${screenMins !== '' ? screenMins : '15'}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Also accepts iOS Shortcut / webhook POST to <code>/api/v1/checkins</code>.</div>
            </div>
          `
              : ''
          }

          ${
            showFlex
              ? `
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-teal);">Flexibility &amp; ROM Benchmarks</strong>
              <label>
                <span style="font-size: 10.5px; color: var(--m3-ink-2);">Mobility / Stretching Today (min)</span>
                <input id="in-chk-mob-min" type="number" step="5" placeholder="${chk?.mobility_min || '15'}" class="m3-input tabular" style="padding: 6px 8px;" />
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 2px;">
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Ankle KTW (cm, ≥10)</span>
                  <input id="in-rom-ankle" type="number" step="0.5" placeholder="${rom.ankle_ktw_cm ?? ''}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Sit &amp; Reach (in, ≥+2)</span>
                  <input id="in-rom-reach" type="number" step="0.5" placeholder="${rom.sit_reach_in ?? ''}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Overhead (deg, ≥175)</span>
                  <input id="in-rom-shoulder" type="number" step="1" placeholder="${rom.shoulder_flex_deg ?? ''}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Deep Squat (1–5)</span>
                  <input id="in-rom-squat" type="number" step="0.5" min="1" max="5" placeholder="${rom.deep_squat_score ?? ''}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
          <button type="submit" id="btn-save-checkin" class="m3-btn-fill" style="padding: 9px 18px;">
            Save Check-In &amp; Recompute Scores
          </button>
        </div>
      </form>
    </section>
  `;
}

const PILLAR_FLAG_META: Array<{ flagKey: keyof FeatureFlagsDTO; pillarKey: string; label: string }> = [
  { flagKey: 'pillar_strength', pillarKey: 'strength', label: 'Strength' },
  { flagKey: 'pillar_cardio', pillarKey: 'cardio', label: 'Cardio' },
  { flagKey: 'pillar_sleep', pillarKey: 'sleep', label: 'Sleep' },
  { flagKey: 'pillar_weight', pillarKey: 'weight', label: 'Weight' },
  { flagKey: 'pillar_body_fat', pillarKey: 'body_fat', label: 'Body Fat' },
  { flagKey: 'pillar_flexibility', pillarKey: 'flexibility', label: 'Flexibility' },
  { flagKey: 'pillar_screen_time', pillarKey: 'screen_time', label: 'Screen Time' },
];

const EXTRA_FLAG_META: Array<{ flagKey: keyof FeatureFlagsDTO; label: string; desc: string }> = [
  { flagKey: 'view_health_labs', label: 'Clinical Labs & FHIR Tab', desc: 'Show Health tab with ApoB/HbA1c & shlink:/' },
  { flagKey: 'tool_ols_calibration', label: 'Fitbit OLS Tune', desc: 'Show Google Health score calibration drawer' },
  { flagKey: 'tool_wearable_intraday', label: 'Intraday Wearable Cards', desc: 'Show Steps/AZM/HRV/SpO2 intraday view on Overview' },
];

export function renderCustomizeDrawerHTML(data: BootstrapPayload, open: boolean): string {
  if (!open || !data.overview) return '';

  const prefs = data.overview.preferences;
  const flags = prefs.feature_flags;
  const phase = data.overview.phase;
  const focusSet = new Set(phase.focus_pillars || []);

  return `
    <section id="customize-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 15px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            FEATURE FLAGS • PHASE FOCUS • ON-DEMAND FORMULAS
          </div>
          <strong style="font-size: 15px;">Customize Dashboard &amp; Active Phase</strong>
        </div>
        <button type="button" id="btn-close-customize" class="m3-pill">Done</button>
      </div>

      <!-- 1. Instant Feature Flags -->
      <div class="m3-seam-mid" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div>
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 6px;">Visible Life Pillars (Feature Flags)</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${PILLAR_FLAG_META.map(
              (item) => `
              <button
                type="button"
                class="m3-chip"
                data-toggle-flag="${item.flagKey}"
                data-sel="${flags[item.flagKey] ? 'true' : 'false'}"
              >${flags[item.flagKey] ? '✓ ' : '+ '}${item.label}</button>
            `
            ).join('')}
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 6px;">Optional Views &amp; Tools</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${EXTRA_FLAG_META.map(
              (item) => `
              <button
                type="button"
                class="m3-chip"
                data-toggle-flag="${item.flagKey}"
                data-sel="${flags[item.flagKey] ? 'true' : 'false'}"
                title="${esc(item.desc)}"
              >${flags[item.flagKey] ? '✓ ' : '+ '}${item.label}</button>
            `
            ).join('')}
          </div>
        </div>
      </div>

      <!-- 2. Active Phase Editor -->
      <div class="m3-seam-mid" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 9px;">
        <div style="font-size: 12px; font-weight: 800;">Active Focus Phase (Pick 1–2 Focus Pillars; Others Hold Baseline)</div>
        <form id="form-phase-editor" style="display: flex; flex-direction: column; gap: 9px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Phase Name</span>
              <input id="in-phase-name" type="text" value="${esc(phase.name)}" class="m3-input" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Start Date</span>
              <input id="in-phase-start" type="date" value="${esc(phase.start_date)}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Maintenance Floor (0–100)</span>
              <input id="in-phase-floor" type="number" min="30" max="95" value="${Math.round(phase.floors?.sleep ?? 75)}" class="m3-input tabular" />
            </label>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Focus Pillars (max 2):</span>
            ${PILLAR_FLAG_META.filter((m) => flags[m.flagKey])
              .map(
                (m) => `
              <button
                type="button"
                class="m3-chip"
                data-toggle-focus="${m.pillarKey}"
                data-sel="${focusSet.has(m.pillarKey) ? 'true' : 'false'}"
              >${focusSet.has(m.pillarKey) ? '★ ' : ''}${m.label}</button>
            `
              )
              .join('')}
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" id="btn-save-phase" class="m3-btn-tonal">Save Active Phase</button>
          </div>
        </form>
      </div>

      <!-- 3. Compute-on-Demand Formula Cohort & Targets -->
      <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 9px;">
        <div>
          <div style="font-size: 12px; font-weight: 800;">Formula Cohort &amp; Optimal Targets</div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Composite 0–100 scores are computed purely on demand from raw tables—updating any target recalculates your full history immediately.
          </div>
        </div>

        <form id="form-formula-prefs" style="display: flex; flex-direction: column; gap: 9px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 8px;">
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Cohort Sex</span>
              <select id="in-pref-sex" class="m3-input">
                <option value="male" ${prefs.sex === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${prefs.sex === 'female' ? 'selected' : ''}>Female</option>
              </select>
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Age</span>
              <input id="in-pref-age" type="number" min="16" max="90" value="${prefs.age}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Target Weight (lb)</span>
              <input id="in-pref-weight" type="number" step="0.5" value="${prefs.weight_target_lb}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">BF Optimal % (Lo–Hi)</span>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <input id="in-pref-bflo" type="number" step="0.5" value="${prefs.bf_opt_low}" class="m3-input tabular" style="padding: 8px 6px;" />
                <input id="in-pref-bfhi" type="number" step="0.5" value="${prefs.bf_opt_high}" class="m3-input tabular" style="padding: 8px 6px;" />
              </div>
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Screen Target (min/d)</span>
              <input id="in-pref-screen" type="number" step="15" value="${prefs.screen_time_target_min}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Mobility Target (m/wk)</span>
              <input id="in-pref-mob" type="number" step="10" value="${prefs.mobility_weekly_target_min}" class="m3-input tabular" />
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" id="btn-save-prefs" class="m3-btn-fill">Update Formulas &amp; Recalculate</button>
          </div>
        </form>
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
