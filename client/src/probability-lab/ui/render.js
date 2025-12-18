// Render orchestrator
import renderSingle from './render-single.js';
import renderTwo from './render-two.js';

export function renderModeVisibility(els, state) {
  const isTwo = state.mode === 'two';
  const root = document.getElementById('probability-lab');
  if (root) root.dataset.mode = state.mode;

  els.singleConfig.hidden = isTwo;
  els.twoConfig.hidden = !isTwo;
  els.twoView.hidden = !isTwo;
  els.eventCard.hidden = isTwo;

  const barCard = els.barChart.closest('section');
  const convCard = els.lineChart.closest('section');
  const freqCard = els.frequencyTable.closest('section');
  const singleBottomGrid = els.lineChart.closest('.pl-bottom-grid');
  if (barCard) barCard.hidden = isTwo;
  if (convCard) convCard.hidden = isTwo;
  if (freqCard) freqCard.hidden = isTwo;
  if (singleBottomGrid) singleBottomGrid.hidden = isTwo;
}

export default function render(els, state) {
  renderModeVisibility(els, state);

  if (state.mode === 'two') renderTwo(els, state);
  else renderSingle(els, state);
}

