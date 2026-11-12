import type { BootstrapPayload, EnrichedLiftItemDTO } from '../api/types';
import { buildSparklineSVG } from '../components/CapsuleChart';

export interface LiftLoggerState {
  selectedSplitIdx: number;
  customItems: EnrichedLiftItemDTO[];
  loggedSlugs: Record<string, boolean>;
  expandedSlug: string | null;
  weightOverrides: Record<string, number>;
  repsOverrides: Record<string, number>;
  equipOverrides: Record<string, { equipment: string; tare: number; mode: string }>;
  calcTargetSlug: string | null;
  calcEquipKey: string;
  calcPlatesPerSide: number[];
  restSecondsLeft: number;
  simulateOffline: boolean;
  queuedOfflineCount: number;
}

export const TARE_PRESETS: Record<string, { label: string; equipment: string; tare: number; mode: string }> = {
  olympic_45: { label: '45 lb Barbell', equipment: 'olympic_bar', tare: 45, mode: 'plates_per_side' },
  smith_20: { label: '20 lb Bar / Smith', equipment: 'smith', tare: 20, mode: 'plates_per_side' },
  smith_15: { label: '15 lb Bar / Smith', equipment: 'smith', tare: 15, mode: 'plates_per_side' },
  sled_125: { label: '125 lb Sled', equipment: 'sled', tare: 125, mode: 'plates_per_side' },
  sled_118: { label: '118 lb Sled', equipment: 'sled', tare: 118, mode: 'plates_per_side' },
  dumbbell_2x: { label: '2× Per-Hand DB', equipment: 'dumbbell_pair', tare: 0, mode: 'per_hand' },
};

export function computeCalcWeights(equipKey: string, plates: number[]): { displayLb: number; totalLb: number; formula: string } {
  const preset = TARE_PRESETS[equipKey] || TARE_PRESETS.olympic_45;
  const sideSum = plates.reduce((acc, p) => acc + p, 0);
  if (preset.mode === 'per_hand') {
    const hand = sideSum || 40;
    return {
      displayLb: hand,
      totalLb: hand * 2,
      formula: `=2*${hand}`,
    };
  }
  const total = preset.tare + 2 * sideSum;
  return {
    displayLb: total,
    totalLb: total,
    formula: `=${preset.tare}+2*(${plates.length ? plates.join('+') : '0'})`,
  };
}

export function renderLiftLoggerViewHTML(data: BootstrapPayload, st: LiftLoggerState): string {
  const splits = data.splits || [];
  const activeSplit = splits[st.selectedSplitIdx] || splits[0];
  const items: EnrichedLiftItemDTO[] = [...(activeSplit?.items || []), ...st.customItems];

  const calcTarget = items.find((i) => i.slug === st.calcTargetSlug) || items[0];
  const calcRes = computeCalcWeights(st.calcEquipKey, st.calcPlatesPerSide);

  const restFmt =
    st.restSecondsLeft > 0
      ? `${Math.floor(st.restSecondsLeft / 60)}:${String(st.restSecondsLeft % 60).padStart(2, '0')}`
      : 'Rest Timer';

  return `
    <div id="view-lift" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Top Header: Split Selector + Offline IndexedDB Badge + Rest Timer -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
                1-TAP FAST CARD LOGGER • OFFLINE INDEXEDDB READY
              </div>
              <div style="font-size: 17px; font-weight: 800; margin-top: 1px;">
                ${esc(activeSplit?.title || 'Push / Chest & Triceps')}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <!-- Rest Timer Pills -->
              <div class="m3-seg" role="group" aria-label="Rest Timer">
                <button type="button" id="btn-rest-60" data-rest-sec="60" data-on="false">60s</button>
                <button type="button" id="btn-rest-90" data-rest-sec="90" data-on="${st.restSecondsLeft > 0 ? 'true' : 'false'}">
                  ${st.restSecondsLeft > 0 ? `⏱ ${restFmt}` : '90s'}
                </button>
                <button type="button" id="btn-rest-120" data-rest-sec="120" data-on="false">120s</button>
              </div>

              <!-- Offline Gym Basement Simulator / Queue Flush -->
              <button
                type="button"
                id="btn-toggle-offline-sim"
                class="m3-pill"
                style="background: ${st.simulateOffline ? 'var(--m3-amber-tint)' : 'var(--m3-surface-dim)'}; color: ${st.simulateOffline ? 'var(--m3-on-amber)' : 'var(--m3-ink)'};"
                title="Test basement gym offline mode (queues sets to IndexedDB and auto-syncs when back online)"
              >
                ${st.simulateOffline ? '⚡ Offline Sim ON' : '● Online'}
                ${st.queuedOfflineCount > 0 ? ` (${st.queuedOfflineCount} queued)` : ''}
              </button>
              ${
                st.queuedOfflineCount > 0
                  ? `<button type="button" id="btn-flush-offline" class="m3-btn-tonal">Sync ${st.queuedOfflineCount} Now</button>`
                  : ''
              }
            </div>
          </div>

          <!-- All 6 Hybrid Split Templates Carousel -->
          <div class="m3-carousel" style="gap: 6px;">
            ${splits
              .map(
                (sp, idx) => `
                <button
                  type="button"
                  id="btn-split-${esc(sp.slug)}"
                  class="m3-chip m3-carousel-item"
                  data-split-idx="${idx}"
                  data-sel="${idx === st.selectedSplitIdx ? 'true' : 'false'}"
                >${esc(sp.title)}</button>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- Built-in 1-Tap Bar & Plate Calculator (Replaces =45+2*45 / =20+... / =125+... / =2*47.5!) -->
        <div class="m3-seam-bot" style="padding: 13px 16px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 12px;">Bar &amp; Plate Calculator:</strong>
              <select id="select-calc-target" class="m3-input" style="width: auto; padding: 5px 10px; font-size: 12px;">
                ${items
                  .map(
                    (it) =>
                      `<option value="${esc(it.slug)}" ${it.slug === calcTarget?.slug ? 'selected' : ''}>${esc(it.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tabular" style="font-size: 13px; font-weight: 800; color: var(--m3-teal);">
                ${calcRes.formula} → ${calcRes.totalLb.toFixed(1)} lb total
              </span>
              <button type="button" id="btn-apply-calc" class="m3-btn-tonal" style="padding: 5px 11px;">
                Apply to Card
              </button>
            </div>
          </div>

          <div class="m3-carousel" style="gap: 5px;">
            ${Object.entries(TARE_PRESETS)
              .map(
                ([k, p]) => `
                <button
                  type="button"
                  class="m3-chip m3-carousel-item"
                  data-calc-equip="${k}"
                  data-sel="${st.calcEquipKey === k ? 'true' : 'false'}"
                >${esc(p.label)}</button>
              `
              )
              .join('')}
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Add per side/hand:</span>
            ${[45, 35, 25, 10, 5, 2.5]
              .map(
                (pl) =>
                  `<button type="button" class="m3-pill tabular" data-add-plate="${pl}" style="padding: 4px 10px;">+${pl}</button>`
              )
              .join('')}
            <button type="button" id="btn-clear-plates" class="m3-pill" style="padding: 4px 10px; color: var(--m3-coral);">
              Clear (${st.calcPlatesPerSide.length ? st.calcPlatesPerSide.join('+') : '0'})
            </button>
          </div>
        </div>
      </section>

      <!-- Spacious Exercise Fast Cards -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${items
          .map((item) => {
            const dispVal = st.weightOverrides[item.slug] ?? item.last_display_lb;
            const repsVal = st.repsOverrides[item.slug] ?? item.target_reps;
            const eqOvr = st.equipOverrides[item.slug];
            const equip = eqOvr?.equipment || item.equipment;
            const tare = eqOvr?.tare ?? item.tare_lb;
            const mode = eqOvr?.mode || item.load_mode;
            const isPerHand = mode === 'per_hand' || equip === 'dumbbell_pair';
            const unitLbl = isPerHand ? 'lb/hand' : 'lb';
            const isDone = !!st.loggedSlugs[item.slug];
            const isExpanded = st.expandedSlug === item.slug;

            return `
              <article
                class="m3-card"
                style="padding: 15px 16px; border: 1.5px solid ${isDone ? 'var(--m3-teal)' : 'transparent'}; display: flex; flex-direction: column; gap: 10px;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                      <strong style="font-size: 15px;">${esc(item.name)}</strong>
                      <span class="tabular" style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--m3-surface-dim); font-weight: 700;">
                        ${item.target_sets} × ${repsVal}
                      </span>
                      <button
                        type="button"
                        class="m3-pill"
                        data-open-metric="lift:${esc(item.slug)}"
                        style="padding: 2px 8px; font-size: 11px; color: var(--m3-teal);"
                        title="Open 4-year trajectory for ${esc(item.name)}"
                      >4y ›</button>
                    </div>
                    <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                      ${esc(item.subtitle)}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    ${buildSparklineSVG(item.sparkline || [], 'var(--m3-teal)', 64, 22)}

                    <button
                      type="button"
                      class="m3-pill tabular"
                      data-expand-slug="${esc(item.slug)}"
                      style="padding: 7px 11px; font-size: 13px; font-weight: 800;"
                      title="Adjust weight or reps"
                    >
                      ${dispVal.toFixed(dispVal % 1 === 0 ? 0 : 1)} ${unitLbl} ✎
                    </button>

                    <button
                      type="button"
                      id="btn-1tap-${esc(item.slug)}"
                      data-log-lift="${esc(item.slug)}"
                      class="${isDone ? 'm3-btn-tonal' : 'm3-btn-fill'}"
                      style="min-width: 98px;"
                    >
                      ${isDone ? '✓ Logged' : '1-Tap Log'}
                    </button>
                  </div>
                </div>

                ${
                  isExpanded
                    ? `
                    <div style="padding-top: 10px; border-top: 1px solid var(--m3-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 700;">Working Weight (${unitLbl}):</span>
                        <button type="button" class="m3-pill tabular" data-step-weight="${esc(item.slug)}:-5">-5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${esc(item.slug)}:-2.5">-2.5</button>
                        <input
                          type="number"
                          step="0.5"
                          value="${dispVal}"
                          data-input-weight="${esc(item.slug)}"
                          class="m3-input tabular"
                          style="width: 82px; text-align: center; padding: 6px;"
                        />
                        <button type="button" class="m3-pill tabular" data-step-weight="${esc(item.slug)}:2.5">+2.5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${esc(item.slug)}:5">+5</button>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; font-weight: 700;">Reps:</span>
                        <input
                          type="number"
                          step="1"
                          value="${repsVal}"
                          data-input-reps="${esc(item.slug)}"
                          class="m3-input tabular"
                          style="width: 64px; text-align: center; padding: 6px;"
                        />
                        <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                          ${esc(formatEquipBaseLabel(equip, tare))}
                        </span>
                      </div>
                    </div>
                  `
                    : ''
                }
              </article>
            `;
          })
          .join('')}
      </div>

      <!-- Add Any Exercise From Full 44-Lift Catalog + Finish Session Bar -->
      <div class="m3-card" style="padding: 14px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select id="select-add-exercise" class="m3-input" style="width: auto; min-width: 200px; padding: 7px 11px; font-size: 12px;">
            <option value="">+ Add another exercise from catalog…</option>
            ${(data.exercises || [])
              .map((ex) => `<option value="${esc(ex.slug)}">${esc(ex.name)} (${esc(ex.primary_muscle)})</option>`)
              .join('')}
          </select>
          <button type="button" id="btn-add-custom-exercise" class="m3-pill">Add Card</button>
        </div>

        <button type="button" id="btn-log-entire-split" class="m3-btn-fill" style="padding: 9px 18px;">
          Log Full Split Session (${items.length} Exercises)
        </button>
      </div>
    </div>
  `;
}

function formatEquipBaseLabel(equip: string, baseLb: number): string {
  switch (equip) {
    case 'olympic_bar':
      return `${baseLb || 45} lb Olympic bar`;
    case 'smith':
      return `${baseLb || 20} lb lighter / Smith bar`;
    case 'sled':
      return `${baseLb || 125} lb leg press sled`;
    case 'dumbbell_pair':
      return '2× per-hand dumbbells';
    case 'cable_stack':
      return 'Cable / weight stack';
    case 'bodyweight':
      return 'Bodyweight';
    default:
      return baseLb > 0 ? `${equip} (${baseLb} lb bar/base)` : equip;
  }
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
