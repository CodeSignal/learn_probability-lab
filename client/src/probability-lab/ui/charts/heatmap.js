// Heatmap rendering
import withCanvas2d from './canvas.js';
import { getCssVar, hexToRgb } from './colors.js';
import { clamp } from '../../../shared/math.js';

export default function drawHeatmap(canvas, rowLabels, colLabels, matrix, selectedCell) {
  const primary = getCssVar('--Colors-Base-Primary-600', '#377DFF');
  const grid = getCssVar('--Colors-Stroke-Default', '#DDE0EA');
  const text = getCssVar('--Colors-Text-Body-Medium', '#66718F');
  const strong = getCssVar('--Colors-Text-Body-Strongest', '#0A1122');
  const bg = getCssVar('--Colors-Backgrounds-Main-Top', '#FFFFFF');

  const rgb = hexToRgb(primary) ?? { r: 55, g: 125, b: 255 };
  const rows = rowLabels.length;
  const cols = colLabels.length;

  let maxValue = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      maxValue = Math.max(maxValue, matrix[r]?.[c] ?? 0);
    }
  }
  if (maxValue <= 0) maxValue = 1;

  withCanvas2d(canvas, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const padding = { top: 48, right: 14, bottom: 18, left: 90 };
    const plotW = Math.max(1, w - padding.left - padding.right);
    const plotH = Math.max(1, h - padding.top - padding.bottom);

    const cellW = plotW / Math.max(1, cols);
    const cellH = plotH / Math.max(1, rows);

    ctx.font = '12px var(--body-family)';
    ctx.fillStyle = text;
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'center';
    for (let c = 0; c < cols; c += 1) {
      const x = padding.left + c * cellW + cellW / 2;
      ctx.fillText(String(colLabels[c]), x, padding.top - 18);
    }

    ctx.textAlign = 'right';
    for (let r = 0; r < rows; r += 1) {
      const y = padding.top + r * cellH + cellH / 2;
      ctx.fillText(String(rowLabels[r]), padding.left - 10, y);
    }

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const value = clamp((matrix[r]?.[c] ?? 0) / maxValue, 0, 1);
        const alpha = 0.08 + value * 0.92;
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        const x = padding.left + c * cellW;
        const y = padding.top + r * cellH;
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c += 1) {
      const x = padding.left + c * cellW;
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotH);
    }
    for (let r = 0; r <= rows; r += 1) {
      const y = padding.top + r * cellH;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
    }
    ctx.stroke();

    if (selectedCell && Number.isInteger(selectedCell.r) && Number.isInteger(selectedCell.c)) {
      ctx.strokeStyle = strong;
      ctx.lineWidth = 3;
      const x = padding.left + selectedCell.c * cellW;
      const y = padding.top + selectedCell.r * cellH;
      ctx.strokeRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);
      ctx.lineWidth = 1;
    }
  });
}

