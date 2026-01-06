// Bar chart rendering
import withCanvas2d from './canvas.js';
import { getCssVar } from './colors.js';
import { clamp } from '../../../shared/math.js';
import { formatProbability, formatCount } from '../../../shared/format.js';

export default function drawBarChart(canvas, labels, values, theory, counts = [], trials = 0) {
  const primary = getCssVar('--Colors-Base-Primary-600', '#377DFF');
  const grid = getCssVar('--Colors-Stroke-Default', '#DDE0EA');
  const text = getCssVar('--Colors-Text-Body-Medium', '#66718F');
  const strong = getCssVar('--Colors-Text-Body-Strongest', '#0A1122');
  const bg = getCssVar('--Colors-Backgrounds-Main-Top', '#FFFFFF');

  withCanvas2d(canvas, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Check if there are any values (trials run)
    const hasData = values.some(v => v > 0);
    if (!hasData && labels.length > 0) {
      // Draw empty state message
      ctx.fillStyle = text;
      ctx.font = '16px var(--body-family)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Run some trials to see the chart', w / 2, h / 2 - 10);
      ctx.font = '14px var(--body-family)';
      ctx.fillStyle = getCssVar('--Colors-Text-Body-Light', '#808AA5');
      ctx.fillText('Click "Run Trials" to start', w / 2, h / 2 + 15);
      return;
    }

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
    const slotW = (plotW - gap * (labels.length - 1)) / labels.length;
    const barW = slotW * 0.8; // Bars are 80% of slot width

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < labels.length; i += 1) {
      const value = clamp(values[i] ?? 0, 0, 1);
      const theoryValue = clamp(theory[i] ?? 0, 0, 1);
      const slotX = padding.left + i * (slotW + gap);
      const x = slotX + (slotW - barW) / 2; // Center bar in its slot
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
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      const yTheory = padding.top + (1 - theoryValue) * plotH;
      ctx.beginPath();
      ctx.moveTo(x + 2, yTheory);
      ctx.lineTo(x + barW - 2, yTheory);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;

      ctx.fillStyle = strong;
      ctx.font = '12px var(--body-family)';
      const label = String(labels[i]);
      ctx.fillText(label, slotX + slotW / 2, padding.top + plotH + 8); // Center label on slot
    }
  });
}

// Store cleanup function for event listeners
let hoverCleanup = null;

export function setupBarChartHover(canvas, labels, counts, trials) {
  // Clean up previous listeners if they exist
  if (hoverCleanup) {
    hoverCleanup();
    hoverCleanup = null;
  }

  // Get or create tooltip element
  let tooltip = document.querySelector('.pl-bar-chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'pl-bar-chart-tooltip box card';
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);
  }

  const padding = { top: 14, right: 12, bottom: 34, left: 44 };
  const tooltipOffset = 10; // Offset from cursor

  function handleMouseMove(event) {
    if (trials === 0 || labels.length === 0) {
      tooltip.style.display = 'none';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const w = rect.width;
    const h = rect.height;
    const plotW = Math.max(1, w - padding.left - padding.right);
    const plotH = Math.max(1, h - padding.top - padding.bottom);

    // Check if mouse is within plot area
    if (x < padding.left || x > padding.left + plotW || y < padding.top || y > padding.top + plotH) {
      tooltip.style.display = 'none';
      return;
    }

    // Calculate which bar slot the mouse is over
    const gap = labels.length > 1 ? Math.min(14, plotW / (labels.length * 2)) : 0;
    const slotW = (plotW - gap * (labels.length - 1)) / labels.length;
    const relativeX = x - padding.left;
    const barIndex = Math.floor(relativeX / (slotW + gap));

    // Check if mouse is over a valid bar
    if (barIndex < 0 || barIndex >= labels.length) {
      tooltip.style.display = 'none';
      return;
    }

    // Check if mouse is within the bar slot bounds
    const slotX = padding.left + barIndex * (slotW + gap);
    if (x < slotX || x > slotX + slotW) {
      tooltip.style.display = 'none';
      return;
    }

    // Get data for this bar
    const count = counts[barIndex] ?? 0;
    const label = labels[barIndex];
    const probability = trials > 0 ? count / trials : 0;

    // Format tooltip content
    const tooltipText = `P(${label}) = ${formatCount(count)} / ${formatCount(trials)} = ${formatProbability(probability, 2)}`;
    tooltip.textContent = tooltipText;

    // Position tooltip near cursor
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + tooltipOffset}px`;
    tooltip.style.top = `${event.clientY + tooltipOffset}px`;

    // Adjust if tooltip goes off screen
    requestAnimationFrame(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = `${event.clientX - tooltipRect.width - tooltipOffset}px`;
      }
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = `${event.clientY - tooltipRect.height - tooltipOffset}px`;
      }
    });
  }

  function handleMouseLeave() {
    tooltip.style.display = 'none';
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  // Store cleanup function
  hoverCleanup = () => {
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
  };
}
