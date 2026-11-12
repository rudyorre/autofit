export function buildSparklineSVG(
  pts: Array<number | null>,
  strokeVar = 'var(--m3-teal)',
  w = 72,
  h = 24
): string {
  const valid = pts.filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
  if (valid.length < 2) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }
  const minV = Math.min(...valid);
  const maxV = Math.max(...valid);
  const span = Math.max(1, maxV - minV);
  const padX = 3;
  const padY = 4;
  const xStep = (w - padX * 2) / Math.max(1, pts.length - 1);

  let d = '';
  let inSeg = false;
  let lastX = 0;
  let lastY = 0;

  pts.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) {
      inSeg = false;
      return;
    }
    const x = padX + i * xStep;
    const y = h - padY - ((v - minV) / span) * (h - padY * 2);
    d += `${inSeg ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    inSeg = true;
    lastX = x;
    lastY = y;
  });

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow: visible; flex-shrink: 0;" aria-hidden="true">
      <path d="${d.trim()}" fill="none" stroke="${strokeVar}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.6" fill="${strokeVar}" />
    </svg>
  `;
}

export function drawCapsuleBarChart(
  canvas: HTMLCanvasElement | null,
  values: number[],
  labels: string[],
  barColorVar = '--m3-teal',
  goalLine?: number
): void {
  if (!canvas || !values.length) return;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(220, rect.width || 320);
  const h = Math.max(90, rect.height || 120);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(document.getElementById('m3-app') || document.documentElement);
  const fillCol = styles.getPropertyValue(barColorVar).trim() || '#0b7f6b';
  const trackCol = styles.getPropertyValue('--m3-surface-dim').trim() || '#e2ebe8';
  const ink2 = styles.getPropertyValue('--m3-ink-2').trim() || '#556b67';
  const hairline = styles.getPropertyValue('--m3-hairline').trim() || 'rgba(0,0,0,0.1)';

  const padTop = 10;
  const padBot = 20;
  const chartH = h - padTop - padBot;
  const maxVal = Math.max(goalLine || 1, ...values, 1) * 1.1;

  if (goalLine && goalLine > 0) {
    const gy = padTop + chartH - (goalLine / maxVal) * chartH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, gy);
    ctx.lineTo(w - 4, gy);
    ctx.stroke();
    ctx.restore();
  }

  const n = values.length;
  const slotW = (w - 8) / n;
  const barW = Math.max(5, Math.min(18, slotW * 0.58));

  values.forEach((v, i) => {
    const cx = 4 + slotW * i + slotW / 2;
    const x = cx - barW / 2;
    // Background capsule track
    drawRoundRect(ctx, x, padTop, barW, chartH, barW / 2, trackCol);

    const bh = Math.max(v > 0 ? 5 : 0, (Math.max(0, v) / maxVal) * chartH);
    if (bh > 0) {
      drawRoundRect(ctx, x, padTop + chartH - bh, barW, bh, barW / 2, fillCol);
    }

    const showLbl = n <= 7 || i === 0 || i === Math.floor(n / 2) || i === n - 1 || (n === 24 && i % 6 === 0);
    if (showLbl && labels[i]) {
      ctx.fillStyle = ink2;
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], cx, h - 5);
    }
  });
}

export function drawMiniWaveCanvas(
  canvas: HTMLCanvasElement | null,
  samples: number[],
  strokeVar = '--m3-coral'
): void {
  if (!canvas || samples.length < 2) return;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(90, rect.width || 130);
  const h = Math.max(30, rect.height || 38);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(document.getElementById('m3-app') || document.documentElement);
  const strokeCol = styles.getPropertyValue(strokeVar).trim() || '#df3c2a';

  const minV = Math.min(...samples);
  const maxV = Math.max(...samples);
  const span = Math.max(1, maxV - minV);
  const stepX = (w - 8) / (samples.length - 1);

  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  samples.forEach((v, i) => {
    const x = 4 + i * stepX;
    const y = h - 5 - ((v - minV) / span) * (h - 10);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
  ctx.fill();
}
