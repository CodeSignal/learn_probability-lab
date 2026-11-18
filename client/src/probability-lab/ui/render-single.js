// Single-mode rendering
import drawBarChart, { setupBarChartHover } from './charts/bar-chart.js';
import drawLineChart from './charts/line-chart.js';
import { buildFrequencyTableHtml } from './tables.js';
import { showCoinOutcome, updateDeviceViewSingle } from './device-view.js';
import { formatCount, formatProbability } from '../../shared/format.js';

function renderSpinnerSectorsVisibility(els, singleState) {
  const show = singleState.device === 'spinner';
  els.spinnerOptions.hidden = !show;
}

function getEventIndicesFromLabels(def, singleState) {
  if (!def) return new Set();
  const selected = singleState.eventSelected;
  if (!(selected instanceof Set)) return new Set();

  const indices = new Set();
  for (const label of selected) {
    const idx = def.labels.indexOf(String(label));
    if (idx !== -1) indices.add(idx);
  }
  return indices;
}

function currentEventStats(def, singleState) {
  if (!def) return { estimated: null, theoretical: null };
  const indices = getEventIndicesFromLabels(def, singleState);
  const theoretical = Array.from(indices).reduce((acc, idx) => acc + (def.probabilities[idx] ?? 0), 0);

  if (singleState.trials === 0) return { estimated: null, theoretical };

  const count = Array.from(indices).reduce((acc, idx) => acc + (singleState.counts[idx] ?? 0), 0);
  return { estimated: count / singleState.trials, theoretical };
}

export default function renderSingle(els, state, { updateDevice = true, animateCoin = false } = {}) {
  const def = state.single.definition;
  if (!def) return;

  els.trials.textContent = formatCount(state.single.trials);
  const lastLabel = state.single.lastIndex === null ? '—' : def.labels[state.single.lastIndex] ?? '—';
  els.last.innerHTML = `<span class="pl-last-text">${lastLabel}</span>`;
  els.last.removeAttribute('data-tooltip');
  if (els.historyButton) {
    const trials = state.single.trials;
    els.historyButton.disabled = trials === 0;
    els.historyButton.textContent = trials === 0 ? 'History' : `History (${formatCount(trials)})`;
  }

  renderSpinnerSectorsVisibility(els, state.single);

  const selectedIndices = getEventIndicesFromLabels(def, state.single);
  const stats = currentEventStats(def, state.single);

  if (updateDevice) {
    updateDeviceViewSingle(els.deviceView, def, state.single);

    if (def.device === 'coin' && state.single.lastIndex !== null) {
      const coin = els.deviceView.querySelector('#pl-coin-element');
      const label = def.labels[state.single.lastIndex] ?? '—';
      showCoinOutcome(coin, label.startsWith('H'), animateCoin);
    }
  }

  // TODO: add nice die animation, e.g. https://github.com/3d-dice/dice-box

  const rel = state.single.trials === 0 ? def.labels.map(() => 0) : state.single.counts.map((c) => c / state.single.trials);
  drawBarChart(els.barChart, def.labels, rel, def.probabilities, state.single.counts, state.single.trials);
  setupBarChartHover(els.barChart, def.labels, state.single.counts, state.single.trials);

  const historyTrials = state.single.history.map((p) => p.trials);
  const historyEst = state.single.history.map((p) => Array.from(selectedIndices).reduce((acc, idx) => acc + (p.rel[idx] ?? 0), 0));
  drawLineChart(els.lineChart, historyTrials, historyEst, stats.theoretical ?? 0);

  els.frequencyTable.innerHTML = buildFrequencyTableHtml(def, state.single.counts, state.single.trials, selectedIndices);
}
