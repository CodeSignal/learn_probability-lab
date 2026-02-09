// Two-mode rendering
import drawHeatmap from './charts/heatmap.js';
import { buildTwoWayTableHtml } from './tables.js';
import { updateDeviceViewTwo } from './device-view.js';
import { formatCount, formatProbability } from '../../shared/format.js';
import { getCssVar } from './charts/colors.js';

function updateCellSummary(els, defA, defB, twoState) {
  const trials = twoState.trials;
  const selected = twoState.selectedCell;

  if (!defA || !defB || !selected || trials === 0) {
    els.cellSummary.textContent = 'Click a cell to see joint and conditional probabilities.';
    return;
  }

  const r = selected.r;
  const c = selected.c;
  const jointCount = twoState.joint[r]?.[c] ?? 0;
  const pJoint = jointCount / trials;
  const pA = (twoState.countsA[r] ?? 0) / trials;
  const pB = (twoState.countsB[c] ?? 0) / trials;
  const pAGivenB = pB > 0 ? pJoint / pB : null;
  const pBGivenA = pA > 0 ? pJoint / pA : null;
  const expectedIfIndependent = pA * pB;

  els.cellSummary.innerHTML = `
    <div><strong>Selected:</strong> A = ${defA.labels[r]} and B = ${defB.labels[c]}</div>
    <div style="margin-top: 6px;">
      <span class="pl-nowrap"><strong>P(A ∩ B)</strong> ≈ ${formatProbability(pJoint, 2)}</span>
      · <span class="pl-nowrap"><strong>P(A)</strong> ≈ ${formatProbability(pA, 2)}</span>
      · <span class="pl-nowrap"><strong>P(B)</strong> ≈ ${formatProbability(pB, 2)}</span>
    </div>
    <div style="margin-top: 6px;">
      <span class="pl-nowrap"><strong>P(A | B)</strong> ≈ ${pAGivenB === null ? '—' : formatProbability(pAGivenB, 2)}</span>
      · <span class="pl-nowrap"><strong>P(B | A)</strong> ≈ ${pBGivenA === null ? '—' : formatProbability(pBGivenA, 2)}</span>
    </div>
    <div style="margin-top: 6px; color: ${getCssVar('--Colors-Text-Body-Medium', '#66718F')};">
      If independent, expect P(A)·P(B) ≈ ${formatProbability(expectedIfIndependent, 2)}.
    </div>
  `;
}

export default function renderTwo(els, state) {
  const defA = state.two.definitionA;
  const defB = state.two.definitionB;
  if (!defA || !defB) return;

  els.trials.textContent = formatCount(state.two.trials);
  if (els.historyButton) {
    const trials = state.two.trials;
    els.historyButton.disabled = trials === 0;
    els.historyButton.textContent = trials === 0 ? 'History' : `History (${formatCount(trials)})`;
  }

  if (state.two.lastA === null || state.two.lastB === null) {
    els.last.innerHTML = '<span class="pl-last-text">—</span>';
    els.last.removeAttribute('data-tooltip');
  } else {
    const outcomeText = `(${defA.labels[state.two.lastA]}, ${defB.labels[state.two.lastB]})`;
    els.last.innerHTML = `<span class="pl-last-text">${outcomeText}</span>`;
    els.last.setAttribute('data-tooltip', outcomeText);
  }

  updateDeviceViewTwo(els.deviceView, defA, defB, state.two);

  // Trigger coin flip animations for two-devices mode
  // TODO: make it work for auto mode too
  if (state.two.lastA !== null && state.two.lastB !== null && !state.running.auto) {
    const deviceWraps = els.deviceView.querySelectorAll('.pl-device-mini');
    const coinA = deviceWraps[0]?.querySelector('.pl-coin');
    const coinB = deviceWraps[1]?.querySelector('.pl-coin');

    // Handle device A coin animation
    if (defA.device === 'coin' && coinA) {
      const isHeadsA = state.two.lastA === 0; // 0 = Heads, 1 = Tails
      coinA.style.animation = 'none';
      requestAnimationFrame(() => {
        coinA.style.animation = isHeadsA
          ? 'pl-flip-heads 2s forwards'
          : 'pl-flip-tails 2s forwards';
      });
    }

    // Handle device B coin animation
    if (defB.device === 'coin' && coinB) {
      const isHeadsB = state.two.lastB === 0; // 0 = Heads, 1 = Tails
      coinB.style.animation = 'none';
      requestAnimationFrame(() => {
        coinB.style.animation = isHeadsB
          ? 'pl-flip-heads 2s forwards'
          : 'pl-flip-tails 2s forwards';
      });
    }
  }

  const trials = state.two.trials;
  const matrix = state.two.joint.map((row) => row.map((count) => (trials > 0 ? count / trials : 0)));

  drawHeatmap(els.heatmap, defA.labels, defB.labels, matrix, state.two.selectedCell);
  els.twoWayTable.innerHTML = buildTwoWayTableHtml(
    defA,
    defB,
    state.two.joint,
    state.two.countsA,
    state.two.countsB,
    state.two.trials,
    state.two.selectedCell,
  );
  updateCellSummary(els, defA, defB, state.two);
}
