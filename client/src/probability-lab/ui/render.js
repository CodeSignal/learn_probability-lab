// Render orchestrator
import renderSingle from './render-single.js';
import renderTwo from './render-two.js';

function getDeviceIcon(device) {
  const icons = {
    coin: '🪙',
    die: '🎲',
    spinner: '⭕',
  };
  return icons[device] || '—';
}

function formatDeviceName(device) {
  return device ? device.charAt(0).toUpperCase() + device.slice(1) : '—';
}

function formatSampleSpace(labels) {
  if (!labels || labels.length === 0) return '—';
  return `{${labels.join(', ')}}`;
}

function nearlyEqual(a, b, tolerance = 1e-3) {
  return Math.abs(a - b) <= tolerance;
}

function isFairDevice(device, values) {
  if (device === 'coin') {
    const p = values.coinProbabilities ?? [0.5, 0.5];
    return p.length === 2 && nearlyEqual(p[0], 0.5) && nearlyEqual(p[1], 0.5);
  }

  if (device === 'die') {
    const p = values.dieProbabilities ?? Array(6).fill(1 / 6);
    return p.length === 6 && p.every((value) => nearlyEqual(value, 1 / 6));
  }

  if (device === 'spinner') {
    const skew = values.spinnerSkew ?? 0;
    return nearlyEqual(skew, 0, 1e-2);
  }

  return false;
}

function setTag(tagEl, { text, variant }) {
  if (!tagEl) return;
  tagEl.textContent = text;

  tagEl.classList.remove('default', 'secondary', 'success', 'warning', 'info', 'error', 'outline');
  tagEl.classList.add(variant);
}

export function renderExperimentSetup(els, state) {
  if (!els.setupDevice || !els.setupSampleSpace) return;

  const seed = (state.seedText ?? '').trim();
  const seedText = seed ? `Seed: ${seed}` : 'Seed: Random';
  setTag(els.seedSummary, { text: seedText, variant: seed ? 'info' : 'secondary' });

  if (state.mode === 'two') {
    // Two-event mode: show both devices and sample spaces
    const deviceA = state.two.deviceA || '—';
    const deviceB = state.two.deviceB || '—';
    const labelsA = state.two.definitionA?.labels;
    const labelsB = state.two.definitionB?.labels;

    const fairA = isFairDevice(deviceA, {
      coinProbabilities: state.two.coinProbabilitiesA,
      dieProbabilities: state.two.dieProbabilitiesA,
      spinnerSkew: state.two.spinnerSkewA,
    });
    const linked = state.two.relationship === 'copy' || state.two.relationship === 'complement';
    const fairB = linked
      ? fairA
      : isFairDevice(deviceB, {
        coinProbabilities: state.two.coinProbabilitiesB,
        dieProbabilities: state.two.dieProbabilitiesB,
        spinnerSkew: state.two.spinnerSkewB,
      });

    const biasText = linked
      ? `Bias: A ${fairA ? 'fair' : 'custom'} · B linked`
      : `Bias: A ${fairA ? 'fair' : 'custom'} · B ${fairB ? 'fair' : 'custom'}`;
    setTag(els.biasSummary, { text: biasText, variant: fairA && fairB ? 'success' : 'warning' });

    if (els.relationshipSummary) {
      const relationship = state.two.relationship || 'independent';
      const label = relationship === 'copy'
        ? 'B = A'
        : relationship === 'complement'
          ? 'Complement'
          : 'Independent';
      els.relationshipSummary.hidden = false;
      setTag(els.relationshipSummary, { text: `Relationship: ${label}`, variant: 'secondary' });
    }

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(deviceA)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(deviceA)}</span>
        <span class="pl-setup-label body-xsmall">A</span>
      </div>
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(deviceB)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(deviceB)}</span>
        <span class="pl-setup-label body-xsmall">B</span>
      </div>
    `;

    els.setupSampleSpace.innerHTML = `
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-label body-xsmall">A</span>
        <span class="pl-setup-set code-small">${formatSampleSpace(labelsA)}</span>
      </div>
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-label body-xsmall">B</span>
        <span class="pl-setup-set code-small">${formatSampleSpace(labelsB)}</span>
      </div>
    `;
  } else {
    // Single mode: show single device and sample space
    const device = state.single.device || '—';
    const labels = state.single.definition?.labels;

    const fair = isFairDevice(device, {
      coinProbabilities: state.single.coinProbabilities,
      dieProbabilities: state.single.dieProbabilities,
      spinnerSkew: state.single.spinnerSkew,
    });
    setTag(els.biasSummary, { text: `Bias: ${fair ? 'Uniform' : 'Biased'}`, variant: fair ? 'success' : 'warning' });
    if (els.relationshipSummary) els.relationshipSummary.hidden = true;

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(device)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(device)}</span>
      </div>
    `;

    els.setupSampleSpace.innerHTML = `
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-set code-small">${formatSampleSpace(labels)}</span>
      </div>
    `;
  }
}

export function renderModeVisibility(els, state) {
  const isTwo = state.mode === 'two';
  const root = document.getElementById('probability-lab');
  if (root) root.dataset.mode = state.mode;

  els.singleConfig.hidden = isTwo;
  els.twoConfig.hidden = !isTwo;
  els.twoView.hidden = !isTwo;
  els.eventCard.hidden = isTwo;

  // Show/hide single-event and two-event view containers
  if (els.singleView) els.singleView.hidden = isTwo;
}

export default function render(els, state) {
  renderModeVisibility(els, state);
  renderExperimentSetup(els, state);

  if (state.mode === 'two') renderTwo(els, state);
  else renderSingle(els, state);
}
