import type { BootstrapPayload, PillarCardDTO } from '../api/types';
import { renderScoreHorseshoeSVG } from '../components/GappedRing';
import { renderTodayViewHTML } from './TodayView';

export function renderOverviewViewHTML(
  data: BootstrapPayload,
  expandedPillars: Record<string, boolean>,
  stepMode: '24h' | '7d'
): string {
  const ov = data.overview;
  if (!ov) {
    return renderTodayViewHTML(data, stepMode);
  }

  const enabledPillars = ov.pillars.filter((p) => p.enabled);
  const focusPillars = enabledPillars.filter((p) => p.role === 'focus');
  const maintPillars = enabledPillars.filter((p) => p.role !== 'focus');
  const hiddenCount = ov.pillars.length - enabledPillars.length;
  const showIntraday = !!ov.preferences?.feature_flags?.tool_wearable_intraday;

  const focusNames = focusPillars.map((p) => p.label).join(' + ') || 'Pick 1–2 Focus Pillars';

  return `
    <div id="view-overview" style="display: flex; flex-direction: column; gap: 14px;">
      <!-- Beat 1: Calm Active Phase Banner -->
      <section class="m3-hero" style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px;">
          <div style="display: flex; flex-direction: column; gap: 4px; max-width: 640px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-on-teal); opacity: 0.82;">
                ACTIVE PHASE • SINCE ${esc(ov.phase.start_date)}
              </span>
              <span class="tabular" style="font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; background: var(--m3-hero-pill); color: var(--m3-on-teal);">
                ${ov.on_track_count} / ${ov.enabled_count} on track
              </span>
            </div>
            <h2 style="margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--m3-on-teal);">
              ${esc(ov.phase.name)}
            </h2>
            <div style="font-size: 13px; color: var(--m3-on-teal); opacity: 0.88;">
              Focusing on <strong>${esc(focusNames)}</strong>${
                maintPillars.length > 0
                  ? ` while holding <strong>${esc(maintPillars.map((p) => p.label).join(', '))}</strong> at baseline.`
                  : '.'
              }
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
            <button type="button" id="btn-hero-checkin" class="m3-btn-fill" style="padding: 8px 15px;">
              + Check-In
            </button>
            <button type="button" id="btn-hero-lift" data-switch-tab="lift" class="m3-pill" style="background: var(--m3-hero-pill); color: var(--m3-on-teal);">
              + Log Lift
            </button>
            <button type="button" id="btn-hero-customize" class="m3-pill" style="background: var(--m3-hero-pill); color: var(--m3-on-teal);">
              ⚙ Phase &amp; Flags
            </button>
          </div>
        </div>
      </section>

      <!-- Beat 2: Active Focus Pillars (1-2 Large Glass-Box Cards) -->
      ${
        focusPillars.length > 0
          ? `
          <section style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-teal);">
                PRIMARY FOCUS (${focusPillars.length}) — MEANINGFUL PROGRESSION
              </span>
              <span style="font-size: 11px; color: var(--m3-ink-2);">
                Computed live from raw logs • tap "Under the Hood" for exact math
              </span>
            </div>
            <div class="pillar-grid-focus">
              ${focusPillars.map((p) => renderPillarCardHTML(p, !!expandedPillars[p.key], true)).join('')}
            </div>
          </section>
        `
          : ''
      }

      <!-- Beat 3: Maintenance Baseline Guardrails -->
      ${
        maintPillars.length > 0
          ? `
          <section style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-ink-2);">
                MAINTENANCE BASELINE (${maintPillars.length}) — HOLD ABOVE FLOOR
              </span>
              <span style="font-size: 11px; color: var(--m3-ink-2);">
                Alerts only if drifting below guardrail
              </span>
            </div>
            <div class="pillar-grid-maint">
              ${maintPillars.map((p) => renderPillarCardHTML(p, !!expandedPillars[p.key], false)).join('')}
            </div>
          </section>
        `
          : ''
      }

      <!-- Calm Feature-Flag Expand Footer -->
      <div class="m3-card" style="padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
        <div style="color: var(--m3-ink-2);">
          Showing <strong>${enabledPillars.length} of ${ov.pillars.length}</strong> life pillars
          ${hiddenCount > 0 ? ` • ${hiddenCount} feature-flagged off to keep your view calm` : ' • All pillars active'}
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <button type="button" id="btn-footer-customize" class="m3-btn-tonal" style="padding: 5px 11px;">
            ⚙ Manage Pillars &amp; Formulas
          </button>
        </div>
      </div>

      ${
        showIntraday
          ? `
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-ink-2); padding: 0 4px;">
              DAILY WEARABLE INTRADAY (FEATURE-FLAGGED)
            </div>
            ${renderTodayViewHTML(data, stepMode)}
          </div>
        `
          : ''
      }
    </div>
  `;
}

function renderPillarCardHTML(p: PillarCardDTO, expanded: boolean, isFocus: boolean): string {
  const colorVar = `var(${p.color_token || '--m3-teal'})`;
  const trackVar = trackTokenFor(p.color_token);
  const badgeStyle = statusBadgeStyle(p.status);
  const modelPill = p.score_model === 'percentile' ? 'Percentile' : 'Optimum';
  const pctFill = p.has_data ? Math.max(4, Math.min(100, Math.round(p.score))) : 0;
  const markerPos = Math.max(5, Math.min(98, Math.round(p.target_or_floor || 75)));

  return `
    <article
      class="m3-card"
      data-pillar-card="${esc(p.key)}"
      style="padding: ${isFocus ? '17px 18px' : '15px 16px'}; display: flex; flex-direction: column; gap: 11px; border: 1.5px solid ${p.status === 'slipping' ? 'var(--m3-coral)' : isFocus ? 'var(--m3-hairline)' : 'transparent'};"
    >
      <!-- Top Row: Name + Model Tag + Status Pill -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <strong style="font-size: ${isFocus ? '16px' : '15px'}; letter-spacing: -0.01em;">${esc(p.label)}</strong>
          <span
            style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: var(--m3-surface-dim); color: var(--m3-ink-2);"
            title="${esc(p.score_model_note)}"
          >${modelPill}</span>
        </div>

        <span class="tabular" style="font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; ${badgeStyle}">
          ${esc(p.status_label)}
        </span>
      </div>

      <!-- Core Stat Row: 0-100 Gauge + Primary Raw Metric Right Beside It -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="flex-shrink: 0;">
          ${renderScoreHorseshoeSVG(p.has_data ? p.score : 0, colorVar, trackVar)}
        </div>

        <div style="min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px;">
          <div class="tabular" style="font-size: ${isFocus ? '16px' : '14.5px'}; font-weight: 800; line-height: 1.25; color: var(--m3-ink);">
            ${esc(p.primary_raw)}
          </div>
          ${
            p.secondary_raw
              ? `<div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">${esc(p.secondary_raw)}</div>`
              : ''
          }
          <div class="tabular" style="font-size: 11.5px; font-weight: 700; color: ${p.delta_30d > 0 ? 'var(--m3-teal)' : p.delta_30d < 0 ? 'var(--m3-coral)' : 'var(--m3-ink-2)'};">
            ${esc(p.delta_text)}
          </div>
        </div>
      </div>

      <!-- Objective Target / Maintenance Floor Guardrail Bar -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2);" class="tabular">
          <span>${p.has_data ? `${Math.round(p.score)} / 100` : 'No data'}</span>
          <span>${isFocus ? `Phase Target: ${Math.round(p.target_or_floor)}` : `Maintenance Floor: ${Math.round(p.target_or_floor)}`}</span>
        </div>
        <div style="position: relative; height: 7px; border-radius: 999px; background: var(--m3-surface-dim); overflow: visible;">
          <div style="width: ${pctFill}%; height: 100%; border-radius: 999px; background: ${colorVar}; transition: width 220ms ease;"></div>
          <div
            title="${isFocus ? 'Phase Target' : 'Maintenance Floor'}: ${Math.round(p.target_or_floor)}"
            style="position: absolute; top: -2px; left: ${markerPos}%; width: 2.5px; height: 11px; border-radius: 2px; background: var(--m3-ink); opacity: 0.55;"
          ></div>
        </div>
      </div>

      <!-- Seamless Actions: Under the Hood + 4y Chart -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 2px;">
        <button
          type="button"
          class="m3-pill"
          data-toggle-hood="${esc(p.key)}"
          style="padding: 5px 11px; font-size: 11.5px;"
        >
          ${expanded ? 'Hide Raw Math ▴' : 'Under the Hood ▾'}
        </button>

        <button
          type="button"
          class="m3-btn-tonal"
          data-open-metric="${esc(p.metric_key)}"
          style="padding: 5px 11px; font-size: 11.5px;"
        >
          4y Trend ›
        </button>
      </div>

      <!-- Expandable Glass-Box Breakdown -->
      ${
        expanded
          ? `
          <div style="border-top: 1px solid var(--m3-hairline); padding-top: 10px; display: flex; flex-direction: column; gap: 7px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--m3-ink-2); flex-wrap: wrap;">
              <span>${esc(p.score_model_note)}</span>
              <code style="font-size: 10.5px; background: var(--m3-surface-dim); padding: 1px 6px; border-radius: 6px;">${esc(p.formula_version)}</code>
            </div>

            ${
              p.breakdown && p.breakdown.length > 0
                ? p.breakdown
                    .map(
                      (ing) => `
                  <div
                    class="${ing.metric_key ? 'clickable-tile' : ''}"
                    ${ing.metric_key ? `data-open-metric="${esc(ing.metric_key)}"` : ''}
                    style="background: var(--m3-surface-dim); border-radius: 14px; padding: 8px 11px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
                  >
                    <div style="min-width: 0;">
                      <div style="font-size: 12px; font-weight: 700;">
                        ${esc(ing.label)}
                        ${ing.weight_pct > 0 ? `<span style="font-size: 10.5px; color: var(--m3-ink-2); font-weight: 600;"> (${ing.weight_pct}%)</span>` : ''}
                      </div>
                      ${
                        ing.note
                          ? `<div style="font-size: 11px; color: var(--m3-ink-2); margin-top: 1px;">${esc(ing.note)}</div>`
                          : ''
                      }
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                      <div class="tabular" style="font-size: 12.5px; font-weight: 800;">${esc(ing.raw_value)}</div>
                      ${
                        ing.max_points > 0
                          ? `<div class="tabular" style="font-size: 10.5px; color: var(--m3-teal); font-weight: 700;">${ing.points} / ${ing.max_points} pts</div>`
                          : `<div style="font-size: 10.5px; color: var(--m3-ink-2);">Context</div>`
                      }
                    </div>
                  </div>
                `
                    )
                    .join('')
                : `<div style="font-size: 12px; color: var(--m3-ink-2);">Log an entry via <strong>+ Check-In</strong> to populate this formula.</div>`
            }
          </div>
        `
          : ''
      }
    </article>
  `;
}

function trackTokenFor(colorToken: string): string {
  switch (colorToken) {
    case '--m3-blue':
      return 'var(--m3-blue-track)';
    case '--m3-amber':
      return 'var(--m3-amber-track)';
    case '--m3-coral':
      return 'var(--m3-coral-track)';
    default:
      return 'var(--m3-teal-track)';
  }
}

function statusBadgeStyle(status: PillarCardDTO['status']): string {
  switch (status) {
    case 'focus_improving':
    case 'improving':
    case 'holding':
      return 'background: var(--m3-teal-tint); color: var(--m3-on-teal);';
    case 'focus_steady':
      return 'background: var(--m3-amber-tint); color: var(--m3-on-amber);';
    case 'slipping':
      return 'background: hsla(12, 82%, 56%, 0.16); color: var(--m3-coral);';
    default:
      return 'background: var(--m3-surface-dim); color: var(--m3-ink-2);';
  }
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
