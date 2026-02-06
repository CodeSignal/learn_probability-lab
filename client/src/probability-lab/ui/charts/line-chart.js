// Line chart rendering
import withCanvas2d from './canvas.js';
import { getCssVar } from './colors.js';
import { clamp } from '../../../shared/math.js';
import { formatCount, formatProbability } from '../../../shared/format.js';

export default function drawLineChart(canvas, xValues, yValues, theoryValue) {
  const primary = getCssVar('--Colors-Base-Primary-600', '#377DFF');
  const grid = getCssVar('--Colors-Stroke-Default', '#DDE0EA');
  const text = getCssVar('--Colors-Text-Body-Medium', '#66718F');
  const strong = getCssVar('--Colors-Text-Body-Strongest', '#0A1122');
  const bg = getCssVar('--Colors-Backgrounds-Main-Top', '#FFFFFF');

  withCanvas2d(canvas, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Check if there are any data points
    if (xValues.length === 0 || yValues.length === 0) {
      // Draw empty state message
      ctx.fillStyle = text;
      ctx.font = '16px var(--body-family)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Run some trials to see convergence', w / 2, h / 2 - 10);
      ctx.font = '14px var(--body-family)';
      ctx.fillStyle = getCssVar('--Colors-Text-Body-Light', '#808AA5');
      ctx.fillText('Watch how probability estimates converge over time', w / 2, h / 2 + 15);
      return;
    }

    const padding = { top: 14, right: 12, bottom: 34, left: 54 };
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
      ctx.fillText(formatProbability(yPct, 0), padding.left - 10, y);
    }

    const maxX = xValues.at(-1) ?? 0;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('0', padding.left, padding.top + plotH + 8);
    ctx.textAlign = 'right';
    ctx.fillText(maxX ? formatCount(maxX) : '0', padding.left + plotW, padding.top + plotH + 8);

    if (!Number.isFinite(theoryValue)) return;

    ctx.strokeStyle = strong;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    const yTheory = padding.top + (1 - clamp(theoryValue, 0, 1)) * plotH;
    ctx.beginPath();
    ctx.moveTo(padding.left, yTheory);
    ctx.lineTo(padding.left + plotW, yTheory);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    // Handle single data point case: draw a dot
    if (xValues.length === 1 && yValues.length === 1) {
      const x = maxX === 0 ? 0 : (xValues[0] / maxX) * plotW;
      const y = (1 - clamp(yValues[0], 0, 1)) * plotH;
      const px = padding.left + x;
      const py = padding.top + y;
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Multiple data points: draw line with decimation
    const step = Math.max(1, Math.ceil(xValues.length / 500));
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < xValues.length; i += step) {
      const x = maxX === 0 ? 0 : (xValues[i] / maxX) * plotW;
      const y = (1 - clamp(yValues[i], 0, 1)) * plotH;
      const px = padding.left + x;
      const py = padding.top + y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  });
}

