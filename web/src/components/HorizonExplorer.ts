import type { MetricCatalogItemDTO, TrendPayload } from '../api/types';

export const HORIZON_OPTIONS = [
  { key: '7d', label: '7D' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: "All ('22–'26)" },
];

export function renderHorizonExplorerHTML(
  trend: TrendPayload | null,
  catalog: MetricCatalogItemDTO[],
  activeHorizon: string,
  showCloseBtn = false
): string {
  const title = trend?.title || 'Bench Press (Working Weight)';
  const current = trend?.current || '--';
  const delta = trend?.delta || 'Loading trajectory…';
  const summary = trend?.summary || '2022–2026 longitudinal density';
  const insight = trend?.insight || 'Tap or drag across any regime to inspect exact dates, gaps, plateaus, and equipment shifts.';
  const activeKey = trend?.key || 'lift:bench-press';
  const hasAltBar = !!(trend?.alt_series?.points?.length);

  const chipsHTML = catalog
    .slice(0, 22)
    .map(
      (item) => `
      <button
        type="button"
        class="m3-chip m3-carousel-item"
        id="chip-metric-${item.key.replace(/[^a-z0-9-]/gi, '-')}"
        data-metric-chip="${item.key}"
        data-sel="${item.key === activeKey ? 'true' : 'false'}"
      >${escapeHtml(item.label)}</button>
    `
    )
    .join('');

  const horizonHTML = HORIZON_OPTIONS.map(
    (h) => `
      <button
        type="button"
        id="btn-hz-${h.key}"
        data-hz-btn="${h.key}"
        data-on="${activeHorizon === h.key ? 'true' : 'false'}"
      >${h.label}</button>
    `
  ).join('');

  const monthly = trend?.monthly_density?.length ? trend.monthly_density : trend?.density || [];
  const monthlyLabels = trend?.monthly_labels?.length ? trend.monthly_labels : trend?.labels || [];
  const densityCells = monthly
    .slice(-56)
    .map((cnt, idx) => {
      const lbl = monthlyLabels[idx] || '';
      let bg = 'var(--m3-surface-dim)';
      if (cnt >= 5) bg = 'var(--m3-teal)';
      else if (cnt >= 3) bg = 'hsla(170, 74%, 38%, 0.68)';
      else if (cnt >= 1) bg = 'hsla(170, 64%, 44%, 0.36)';
      return `<div class="density-cell" title="${escapeHtml(lbl)}: ${cnt} entries" style="background: ${bg};"></div>`;
    })
    .join('');

  return `
    <section id="trend-explorer-card" class="m3-seam" aria-label="Longitudinal Trajectory and Regime Explorer">
      <div class="m3-seam-top" style="padding: 15px 16px 12px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              LONG-TERM PROGRESS • GAPS, PLATEAUS &amp; EQUIPMENT REGIMES
            </div>
            <div id="trend-metric-title" style="font-size: 17px; font-weight: 800; margin-top: 1px;">
              ${escapeHtml(title)}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <div class="m3-seg" role="group" aria-label="Time Horizon">
              ${horizonHTML}
            </div>
            ${
              showCloseBtn
                ? `<button type="button" id="btn-close-explorer" class="m3-pill" style="padding: 5px 10px;">✕ Close</button>`
                : ''
            }
          </div>
        </div>

        <div id="trend-metric-chips" class="m3-carousel" style="gap: 6px;">
          ${chipsHTML}
        </div>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px;">
        <div style="display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
            <span id="trend-current-val" class="tabular" style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
              ${escapeHtml(current)}
            </span>
            <span id="trend-delta-badge" class="badge-trend tabular" style="background: var(--m3-teal-tint); color: var(--m3-on-teal);">
              ${escapeHtml(delta)}
            </span>
          </div>
          <div id="trend-scrub-readout" class="tabular" style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">
            Tap/drag chart to inspect plateaus, gaps &amp; rebounds
          </div>
        </div>

        <div style="width: 100%; height: 204px; position: relative;">
          <canvas id="longTermCanvas" style="width: 100%; height: 100%; cursor: crosshair; touch-action: pan-y;"></canvas>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 8px; font-size: 11px; color: var(--m3-ink-2);">
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 12px; height: 3px; border-radius: 2px; background: var(--m3-teal);"></span>${hasAltBar ? '45 lb Barbell (=45+…)' : 'Primary Trajectory'}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; border: 1px dashed var(--m3-gap-stroke); background: var(--m3-gap-fill); border-radius: 2px;"></span>No-Data Gap
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; background: var(--m3-plateau-fill); border-radius: 2px;"></span>Plateau Zone
          </span>
          ${
            hasAltBar && trend?.alt_series
              ? `<span
                   style="display: inline-flex; align-items: center; gap: 5px; cursor: help;"
                   title="Sessions logged with =15+… or =20+… (lighter / counterbalanced Smith bar) instead of a 45 lb Olympic bar. Plotted separately so they don't create fake dips on your 45 lb barbell line."
                 >
                   <span style="width: 8px; height: 8px; border-radius: 999px; border: 2px solid var(--m3-amber);"></span>${escapeHtml(trend.alt_series.label)}
                 </span>`
              : ''
          }
        </div>
      </div>

      <div class="m3-seam-bot" style="padding: 12px 16px 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
          <span style="font-weight: 700;">Consistency Density ('22 → '26)</span>
          <span class="tabular" style="color: var(--m3-ink-2);">${escapeHtml(summary)}</span>
        </div>
        <div class="density-strip">
          ${densityCells}
        </div>
        <div id="trend-insight-banner" style="background: var(--m3-surface-dim); border-radius: 14px; padding: 9px 12px; font-size: 12px; color: var(--m3-ink); display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--m3-teal); font-weight: 800;">◈</span>
          <span>${escapeHtml(insight)}</span>
        </div>
      </div>
    </section>
  `;
}

export function bindAndDrawHorizonCanvas(
  canvas: HTMLCanvasElement | null,
  readoutEl: HTMLElement | null,
  trend: TrendPayload | null
): void {
  if (!canvas || !trend || !trend.series?.length) return;

  let scrubIdx: number | null = null;

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(260, rect.width || 360);
    const h = Math.max(170, rect.height || 204);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const appEl = document.getElementById('m3-app') || document.documentElement;
    const styles = getComputedStyle(appEl);
    const colPrimary = styles.getPropertyValue(trend.color_token || '--m3-teal').trim() || '#0b7f6b';
    const colInk = styles.getPropertyValue('--m3-ink').trim() || '#11221f';
    const colInk2 = styles.getPropertyValue('--m3-ink-2').trim() || '#556b67';
    const colHairline = styles.getPropertyValue('--m3-hairline').trim() || 'rgba(0,0,0,0.1)';
    const colGapFill = styles.getPropertyValue('--m3-gap-fill').trim() || 'rgba(40,60,55,0.07)';
    const colGapStroke = styles.getPropertyValue('--m3-gap-stroke').trim() || 'rgba(40,60,55,0.25)';
    const colPlateau = styles.getPropertyValue('--m3-plateau-fill').trim() || 'rgba(215,100,20,0.11)';
    const colAmber = styles.getPropertyValue('--m3-amber').trim() || '#d76214';
    const colSurface = styles.getPropertyValue('--m3-surface').trim() || '#ffffff';

    const padL = 36;
    const padR = 14;
    const padT = 18;
    const padB = 24;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const validVals: number[] = [];
    trend.series.forEach((v) => {
      if (v !== null && v !== undefined && !Number.isNaN(v)) validVals.push(v);
    });
    trend.alt_series?.points?.forEach((p) => validVals.push(p.val));
    if (trend.optimal_high && trend.optimal_high > 0) validVals.push(trend.optimal_high);

    if (!validVals.length) return;

    let minV = Math.min(...validVals);
    let maxV = Math.max(...validVals);
    const rawSpan = Math.max(1, maxV - minV);
    minV = Math.max(0, minV - rawSpan * 0.14);
    maxV = maxV + rawSpan * 0.16;
    const span = Math.max(1, maxV - minV);

    const n = trend.series.length;
    const xAt = (idx: number) => padL + (n <= 1 ? plotW / 2 : (idx / (n - 1)) * plotW);
    const yAt = (val: number) => padT + plotH - ((val - minV) / span) * plotH;

    // Horizontal Y gridlines & labels
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 3; g++) {
      const val = minV + (span * g) / 3;
      const y = yAt(val);
      ctx.strokeStyle = colHairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();

      ctx.fillStyle = colInk2;
      ctx.fillText(val >= 100 ? Math.round(val).toString() : val.toFixed(val % 1 === 0 ? 0 : 1), padL - 5, y + 3);
    }

    // Optimal threshold line for FHIR lab biomarkers (e.g. ApoB < 80 mg/dL)
    if (trend.optimal_high && trend.optimal_high > minV && trend.optimal_high < maxV) {
      const oy = yAt(trend.optimal_high);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colPrimary;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(padL, oy);
      ctx.lineTo(w - padR, oy);
      ctx.stroke();
      ctx.fillStyle = colPrimary;
      ctx.textAlign = 'left';
      ctx.fillText(`Optimal ≤ ${trend.optimal_high}`, padL + 4, oy - 4);
      ctx.restore();
    }

    // 1. Explicit No-Data Hiatus Bands (NEVER fake-interpolated!)
    (trend.no_data_gaps || []).forEach((gap) => {
      const x1 = xAt(Math.max(0, gap.start_bucket - 0.35));
      const x2 = xAt(Math.min(n - 1, gap.end_bucket + 0.35));
      const bw = Math.max(10, x2 - x1);
      ctx.fillStyle = colGapFill;
      ctx.fillRect(x1, padT, bw, plotH);

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = colGapStroke;
      ctx.strokeRect(x1, padT, bw, plotH);
      ctx.restore();

      if (bw >= 34) {
        ctx.fillStyle = colInk2;
        ctx.font = '700 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No Data', x1 + bw / 2, padT + plotH / 2 + 3);
      }
    });

    // 2. Flat-Slope Plateau Callout Zones
    (trend.plateaus || []).forEach((pl) => {
      const x1 = xAt(Math.max(0, pl.start_bucket));
      const x2 = xAt(Math.min(n - 1, pl.end_bucket));
      const bw = Math.max(14, x2 - x1);
      const py = yAt(pl.level_value);
      const bandTop = Math.max(padT, py - 16);
      const bandH = Math.min(32, padT + plotH - bandTop);

      ctx.fillStyle = colPlateau;
      ctx.fillRect(x1, bandTop, bw, bandH);

      if (bw >= 40) {
        ctx.fillStyle = colAmber;
        ctx.font = '700 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Plateau', x1 + bw / 2, Math.max(padT + 10, bandTop - 3));
      }
    });

    // 3. Draw Primary Trajectory (breaking cleanly across null No-Data buckets!)
    let bestIdx = -1;
    let bestVal = trend.invert_good ? Infinity : -Infinity;

    // Area fill per contiguous segment
    let segPoints: Array<{ x: number; y: number }> = [];
    const flushSegment = () => {
      if (!segPoints.length) return;
      if (segPoints.length >= 2 && !trend.sparse) {
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, colPrimary.startsWith('hsl') ? colPrimary.replace('hsl(', 'hsla(').replace(')', ', 0.20)') : 'rgba(11,127,107,0.18)');
        grad.addColorStop(1, 'rgba(11,127,107,0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(segPoints[0].x, padT + plotH);
        segPoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(segPoints[segPoints.length - 1].x, padT + plotH);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = colPrimary;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (trend.sparse) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      segPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw discrete point dots on sparse series (e.g. clinical lab draws) or single-point segments
      if (trend.sparse || segPoints.length === 1 || n <= 16) {
        segPoints.forEach((pt) => {
          ctx.fillStyle = colSurface;
          ctx.strokeStyle = colPrimary;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
      segPoints = [];
    };

    trend.series.forEach((v, i) => {
      if (v === null || v === undefined || Number.isNaN(v)) {
        flushSegment();
        return;
      }
      const x = xAt(i);
      const y = yAt(v);
      segPoints.push({ x, y });
      if (trend.invert_good ? v < bestVal : v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    flushSegment();

    // 4. Separate Alt-Equipment Hollow Markers (e.g. 20 lb / 15 lb Smith Machine sessions)
    (trend.alt_series?.points || []).forEach((pt) => {
      if (pt.idx < 0 || pt.idx >= n) return;
      const x = xAt(pt.idx);
      const y = yAt(pt.val);
      ctx.fillStyle = colSurface;
      ctx.strokeStyle = colAmber;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 5. Peak / PR Star Marker
    if (bestIdx >= 0 && Number.isFinite(bestVal)) {
      const px = xAt(bestIdx);
      const py = yAt(bestVal);
      ctx.fillStyle = colPrimary;
      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', px, Math.max(11, py - 7));
    }

    // 6. X-axis date ticks
    ctx.fillStyle = colInk2;
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
    const tickCount = Math.min(6, n);
    for (let t = 0; t < tickCount; t++) {
      const idx = tickCount === 1 ? 0 : Math.round((t * (n - 1)) / (tickCount - 1));
      const lbl = trend.labels[idx] || '';
      ctx.textAlign = t === 0 ? 'left' : t === tickCount - 1 ? 'right' : 'center';
      ctx.fillText(lbl, xAt(idx), h - 6);
    }

    // 7. Interactive Crosshair Scrubbing
    if (scrubIdx !== null && scrubIdx >= 0 && scrubIdx < n) {
      const sx = xAt(scrubIdx);
      ctx.save();
      ctx.strokeStyle = colInk;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx, padT);
      ctx.lineTo(sx, padT + plotH);
      ctx.stroke();
      ctx.restore();

      const val = trend.series[scrubIdx];
      if (val !== null && val !== undefined) {
        const sy = yAt(val);
        ctx.fillStyle = colPrimary;
        ctx.strokeStyle = colSurface;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  const handlePointer = (clientX: number) => {
    const rect = canvas.getBoundingClientRect();
    const padL = 36;
    const padR = 14;
    const plotW = Math.max(1, rect.width - padL - padR);
    const rel = Math.max(0, Math.min(1, (clientX - rect.left - padL) / plotW));
    const idx = Math.round(rel * Math.max(0, trend.series.length - 1));
    scrubIdx = idx;
    render();

    if (readoutEl) {
      const lbl = trend.labels[idx] || trend.bucket_dates?.[idx] || '';
      const v = trend.series[idx];
      const altPt = trend.alt_series?.points?.find((p) => p.idx === idx);
      const dens = trend.density?.[idx] ?? 0;
      const formulaNote = altPt?.raw_formula ? ` [sheet: ${altPt.raw_formula}]` : '';
      if (v === null || v === undefined) {
        if (altPt) {
          readoutEl.textContent = `${lbl} • ${altPt.val} ${trend.unit} on 15–20 lb bar${formulaNote}`;
        } else {
          readoutEl.textContent = `${lbl} • Explicit No-Data Hiatus (0 sessions)`;
        }
      } else {
        const altSuffix = altPt ? ` • also ${altPt.val} ${trend.unit} on 15–20 lb bar${formulaNote}` : '';
        readoutEl.textContent = `${lbl} • ${v.toFixed(v % 1 === 0 ? 0 : 1)} ${trend.unit}${altSuffix} (${dens} entries)`;
      }
    }
  };

  canvas.onmousemove = (e) => handlePointer(e.clientX);
  canvas.onmouseleave = () => {
    scrubIdx = null;
    render();
    if (readoutEl) {
      readoutEl.textContent = 'Tap/drag chart to inspect plateaus, gaps & rebounds';
    }
  };
  canvas.ontouchstart = (e) => {
    if (e.touches[0]) handlePointer(e.touches[0].clientX);
  };
  canvas.ontouchmove = (e) => {
    if (e.touches[0]) handlePointer(e.touches[0].clientX);
  };

  requestAnimationFrame(render);
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
