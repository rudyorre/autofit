import type { BootstrapPayload } from '../api/types';
import { buildSparklineSVG } from '../components/CapsuleChart';

export function renderHealthViewHTML(data: BootstrapPayload): string {
  const labs = data.labs || [];
  const body = data.body;

  return `
    <div id="view-health" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- HL7 SMART Health Links (shlink:/) & FHIR R4 Importer -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              HL7 SMART HEALTH LINKS • JWE A256GCM → FHIR R4 LOINC
            </div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 1px;">
              Clinical Lab Biomarkers &amp; Medical Records
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button type="button" id="btn-load-sample-shlink" class="m3-btn-tonal">
              Generate Encrypted shlink:/
            </button>
            <label class="m3-pill" style="cursor: pointer;">
              <span>Upload FHIR JSON</span>
              <input id="input-fhir-file" type="file" accept=".json,application/json" style="display: none;" />
            </label>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <form id="form-shlink-import" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input
              id="input-shlink-uri"
              type="text"
              placeholder="Paste HL7 SMART Health Link (shlink:/eyJ...) from Quest / LabCorp / MyChart / Apple Health…"
              class="m3-input tabular"
              style="flex: 1; min-width: 220px;"
              aria-label="SMART Health Link URI"
            />
            <button id="btn-decrypt-shlink" type="submit" class="m3-btn-fill">
              Decrypt &amp; Import
            </button>
          </form>

          <!-- Quick Manual Biomarker Entry -->
          <form id="form-manual-lab" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; padding-top: 4px; border-top: 1px solid var(--m3-hairline);">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Manual Lab:</span>
            <select id="select-manual-biomarker" class="m3-input" style="width: auto; padding: 6px 10px; font-size: 12px;">
              <option value="ApoB">ApoB (mg/dL)</option>
              <option value="HbA1c">HbA1c (%)</option>
              <option value="hs-CRP">hs-CRP (mg/L)</option>
              <option value="LDL-C">LDL-C (mg/dL)</option>
              <option value="Ferritin">Ferritin (ng/mL)</option>
              <option value="Vitamin D (25-OH)">Vitamin D (ng/mL)</option>
            </select>
            <input
              id="input-manual-lab-val"
              type="number"
              step="0.01"
              placeholder="Value"
              class="m3-input tabular"
              style="width: 96px; padding: 6px 10px; font-size: 12px;"
            />
            <button id="btn-save-manual-lab" type="submit" class="m3-pill">Add Observation</button>
          </form>
        </div>
      </section>

      <!-- Biomarker Grid -->
      <div class="lab-grid">
        ${labs
          .map((item) => {
            const isOpt = item.status.toLowerCase().includes('optimal');
            const badgeBg = isOpt ? 'var(--m3-teal-tint)' : 'var(--m3-amber-tint)';
            const badgeFg = isOpt ? 'var(--m3-on-teal)' : 'var(--m3-on-amber)';
            const sparkPts = (item.draws || []).map((d) => d.value);

            return `
              <div
                class="m3-card clickable-tile"
                data-open-metric="${esc(item.metric_key)}"
                style="padding: 14px 15px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 800;">${esc(item.name)}</div>
                    <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">LOINC ${esc(item.loinc_code)}</div>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${badgeBg}; color: ${badgeFg};">
                    ${esc(item.status)}
                  </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div>
                    <span class="tabular" style="font-size: 24px; font-weight: 800;">
                      ${item.latest_value.toFixed(item.latest_value % 1 === 0 ? 0 : 1)}
                    </span>
                    <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">${esc(item.unit)}</span>
                  </div>
                  ${sparkPts.length >= 2 ? buildSparklineSVG(sparkPts, 'var(--m3-teal)', 64, 24) : ''}
                </div>

                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Trail: ${esc(item.history_text)} • Optimal ≤ ${item.optimal_high || item.ref_high}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>

      <!-- Body Composition Longitudinal Summary -->
      <div class="m3-pair">
        <div class="m3-pair-l clickable-tile" data-open-metric="weight" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">EWMA Trend Weight</span>
          <div class="tabular" style="font-size: 24px; font-weight: 800;">
            ${body ? body.ewma_weight_lb.toFixed(1) : '171.4'} lb
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            α = 0.25 exponential smoothing filters daily water noise
          </div>
        </div>
        <div class="m3-pair-r clickable-tile" data-open-metric="body_fat" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Lean Mass Retention</span>
          <div class="tabular" style="font-size: 24px; font-weight: 800;">
            ${body?.lean_mass_lb ? body.lean_mass_lb.toFixed(1) : '148.1'} lb
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
            ${body && body.lean_delta_lb >= 0 ? '+' : ''}${body ? body.lean_delta_lb.toFixed(1) : '+4.2'} lb lean mass since 2022
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
