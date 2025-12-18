// Bar chart rendering
import withCanvas2d from './canvas.js';
import { getCssVar } from './colors.js';
import { clamp } from '../../../shared/math.js';
import { formatProbability } from '../../../shared/format.js';

export default function drawBarChart(canvas, labels, values, theory) {
  const primary = getCssVar('--Colors-Base-Primary-600', '#377DFF');
  const grid = getCssVar('--Colors-Stroke-Default', '#DDE0EA');
  const text = getCssVar('--Colors-Text-Body-Medium', '#66718F');
  const strong = getCssVar('--Colors-Text-Body-Strongest', '#0A1122');
  const bg = getCssVar('--Colors-Backgrounds-Main-Top', '#FFFFFF');

  withCanvas2d(canvas, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const padding = { top: 14, right: 12, bottom: 34, left: 44 };
    const plotW = Math.max(1, w - padding.left - padding.right);
    const plotH = Math.max(1, h - padding.top - padding.bottom);

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const yPct of [0, 0.25, 0.5, 0.75, 1]) {
      const y = padding.top + (1 - yPct) * plotH;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
    }
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = '12px var(--body-family)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const yPct of [0, 0.5, 1]) {
      const y = padding.top + (1 - yPct) * plotH;
      ctx.fillText(formatProbability(yPct, 0), padding.left - 8, y);
    }

    if (labels.length === 0) return;

    const gap = labels.length > 1 ? Math.min(14, plotW / (labels.length * 2)) : 0;
    const barW = (plotW - gap * (labels.length - 1)) / labels.length;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < labels.length; i += 1) {
      const value = clamp(values[i] ?? 0, 0, 1);
      const theoryValue = clamp(theory[i] ?? 0, 0, 1);
      const x = padding.left + i * (barW + gap);
      const barH = value * plotH;
      const y = padding.top + plotH - barH;

      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, barW, barH);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = primary;
      ctx.globalAlpha = 0.25;
      ctx.strokeRect(x, padding.top, barW, plotH);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = strong;
      ctx.lineWidth = 2;
      const yTheory = padding.top + (1 - theoryValue) * plotH;
      ctx.beginPath();
      ctx.moveTo(x + 2, yTheory);
      ctx.lineTo(x + barW - 2, yTheory);
      ctx.stroke();
      ctx.lineWidth = 1;

      ctx.fillStyle = strong;
      ctx.font = '12px var(--body-family)';
      const label = String(labels[i]);
      ctx.fillText(label, x + barW / 2, padding.top + plotH + 8);
    }
  });
}

