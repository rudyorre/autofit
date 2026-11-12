export function renderConcentricHeroRingsSVG(stepsPct: number, azmPct: number): string {
  const outerCirc = 364.4; // r = 58
  const outerArc = 262.0;  // ~259deg horseshoe
  const innerCirc = 263.9; // r = 42
  const innerArc = 190.0;

  const sLen = Math.max(8, Math.min(outerArc, outerArc * Math.min(1, Math.max(0, stepsPct))));
  const aLen = Math.max(8, Math.min(innerArc, innerArc * Math.min(1, Math.max(0, azmPct))));

  return `
    <svg width="132" height="132" viewBox="0 0 136 136" aria-hidden="true">
      <g transform="rotate(140 68 68)">
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal-track)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="${outerArc} ${outerCirc}" />
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="${sLen.toFixed(1)} ${outerCirc}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber-track)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${innerArc} ${innerCirc}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${aLen.toFixed(1)} ${innerCirc}" />
      </g>
    </svg>
  `;
}

export function renderMiniDayRingSVG(pct: number, dayNum: number, selected: boolean): string {
  const r = 13;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.82;
  const fill = Math.max(3, Math.min(arc, arc * Math.min(1, Math.max(0, pct))));
  return `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <g transform="rotate(122 16 16)">
          <circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--m3-teal-track)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" />
          <circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--m3-teal)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${fill.toFixed(1)} ${circ.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 11px; font-weight: ${selected ? 800 : 600};">${dayNum}</span>
    </div>
  `;
}

export function renderScoreHorseshoeSVG(
  score: number,
  strokeVar: string,
  trackVar: string,
  size = 64
): string {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.74;
  const pct = Math.max(0.05, Math.min(1, score / 100));
  const fill = arc * pct;

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg width="${size}" height="${size}" viewBox="0 0 60 60" aria-hidden="true">
        <g transform="rotate(136 30 30)">
          <circle cx="30" cy="30" r="${r}" fill="none" stroke="${trackVar}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" />
          <circle cx="30" cy="30" r="${r}" fill="none" stroke="${strokeVar}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${fill.toFixed(1)} ${circ.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">${Math.round(score)}</span>
    </div>
  `;
}

export function renderSleepStagesDonutSVG(
  deepMin: number,
  remMin: number,
  lightMin: number,
  awakeMin: number,
  efficiencyPct: number
): string {
  const total = Math.max(1, deepMin + remMin + lightMin + awakeMin);
  const r = 46;
  const circ = 2 * Math.PI * r;
  const gap = 8;
  const segs = [
    { val: deepMin, color: 'var(--m3-blue)' },
    { val: remMin, color: 'var(--m3-teal)' },
    { val: lightMin, color: 'var(--m3-amber)' },
    { val: Math.max(8, awakeMin), color: 'var(--m3-coral)' },
  ];

  let offset = 0;
  const circles = segs
    .map((s) => {
      const rawLen = (s.val / total) * circ;
      const drawLen = Math.max(4, rawLen - gap);
      const svg = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.color}" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${drawLen.toFixed(1)} ${circ.toFixed(1)}"
        stroke-dashoffset="${(-offset).toFixed(1)}" />`;
      offset += rawLen;
      return svg;
    })
    .join('');

  return `
    <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <g transform="rotate(-90 60 60)">${circles}</g>
      </svg>
      <div style="position: absolute; text-align: center;">
        <div class="tabular" style="font-size: 20px; font-weight: 800; line-height: 1.05;">${Math.round(efficiencyPct)}%</div>
        <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Efficiency</div>
      </div>
    </div>
  `;
}
