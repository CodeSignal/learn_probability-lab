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

function getDeviceDisplay(def, fallbackDevice) {
  const icon = def?.icon || getDeviceIcon(fallbackDevice);
  const name = def?.name || formatDeviceName(fallbackDevice);
  return { icon, name };
}

function formatSampleSpace(labels) {
  if (!labels || labels.length === 0) return '—';
  return `{${labels.join(', ')}}`;
}

function nearlyEqual(a, b, tolerance = 1e-3) {
  return Math.abs(a - b) <= tolerance;
}

function isUniformProbabilities(probabilities, tolerance = 1e-3) {
  if (!Array.isArray(probabilities) || probabilities.length === 0) return false;
  const target = probabilities[0];
  return probabilities.every((value) => nearlyEqual(value, target, tolerance));
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

function generateBiasTooltipText(def) {
  if (!def || !def.probabilities || !def.labels || def.probabilities.length === 0) {
    return '';
  }

  const probabilities = def.probabilities;
  const labels = def.labels;

  // Check if uniform
  if (isUniformProbabilities(probabilities)) {
    return '  All outcomes are equally likely.';
  }

  // Check if one outcome is certain (probability = 1.0)
  const certainIndex = probabilities.findIndex((p) => nearlyEqual(p, 1.0));
  if (certainIndex !== -1) {
    return `  Certain outcome: ${labels[certainIndex]}\n  All other outcomes are impossible.`;
  }

  // Find most and least likely outcomes
  let maxIndex = 0;
  let minIndex = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[maxIndex]) {
      maxIndex = i;
    }
    if (probabilities[i] < probabilities[minIndex]) {
      minIndex = i;
    }
  }

  return `  Most likely outcome: ${labels[maxIndex]}\n  Least likely outcome: ${labels[minIndex]}`;
}

export function renderExperimentSetup(els, state) {
  if (!els.setupDevice || !els.setupSampleSpace) return;

  if (state.mode === 'two') {
    // Two-event mode: show both devices and sample spaces
    const deviceA = state.two.deviceA || '—';
    const deviceB = state.two.deviceB || '—';
    const labelsA = state.two.definitionA?.labels;
    const labelsB = state.two.definitionB?.labels;
    const defA = state.two.definitionA;
    const defB = state.two.definitionB;
    const displayA = getDeviceDisplay(defA, deviceA);
    const displayB = getDeviceDisplay(defB, deviceB);

    const fairA = defA?.probabilities
      ? isUniformProbabilities(defA.probabilities)
      : isFairDevice(deviceA, {
        coinProbabilities: state.two.coinProbabilitiesA,
        dieProbabilities: state.two.dieProbabilitiesA,
        spinnerSkew: state.two.spinnerSkewA,
      });
    const fairB = defB?.probabilities
      ? isUniformProbabilities(defB.probabilities)
      : isFairDevice(deviceB, {
        coinProbabilities: state.two.coinProbabilitiesB,
        dieProbabilities: state.two.dieProbabilitiesB,
        spinnerSkew: state.two.spinnerSkewB,
      });

    const biasText = `Bias (A / B): ${fairA ? 'Uniform' : 'Biased'} / ${fairB ? 'Uniform' : 'Biased'}`;
    setTag(els.biasSummary, { text: biasText, variant: fairA && fairB ? 'success' : 'warning' });

    // Set tooltip text for two-event mode
    if (els.biasSummary) {
      const tooltipA = defA ? generateBiasTooltipText(defA) : '';
      const tooltipB = defB ? generateBiasTooltipText(defB) : '';
      let tooltipText = '';
      if (tooltipA && tooltipB) {
        tooltipText = `Device A:\n${tooltipA}\nDevice B:\n${tooltipB}`;
      } else if (tooltipA) {
        tooltipText = `Device A:\n${tooltipA}`;
      } else if (tooltipB) {
        tooltipText = `Device B:\n${tooltipB}`;
      }
      if (tooltipText) {
        els.biasSummary.setAttribute('data-tooltip', tooltipText);
      } else {
        els.biasSummary.removeAttribute('data-tooltip');
      }
    }

    if (els.relationshipSummary) {
      const relationship = state.two.relationship || 'independent';
      const label = relationship === 'dependent'
        ? 'Dependent'
        : 'Independent';
      els.relationshipSummary.hidden = false;
      els.relationshipSummary.style.display = '';
      setTag(els.relationshipSummary, { text: `Relationship: ${label}`, variant: 'secondary' });
    }

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${displayA.icon}</span>
        <span class="pl-setup-device-name body-small">${displayA.name}</span>
        <span class="pl-setup-label body-xsmall">A</span>
      </div>
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${displayB.icon}</span>
        <span class="pl-setup-device-name body-small">${displayB.name}</span>
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
    const def = state.single.definition;
    const labels = def?.labels;
    const display = getDeviceDisplay(def, device);

    const fair = def?.probabilities
      ? isUniformProbabilities(def.probabilities)
      : isFairDevice(device, {
        coinProbabilities: state.single.coinProbabilities,
        dieProbabilities: state.single.dieProbabilities,
        spinnerSkew: state.single.spinnerSkew,
      });
    setTag(els.biasSummary, { text: `Bias: ${fair ? 'Uniform' : 'Biased'}`, variant: fair ? 'success' : 'warning' });

    // Set tooltip text for single mode
    if (els.biasSummary && def) {
      const tooltipText = generateBiasTooltipText(def);
      if (tooltipText) {
        els.biasSummary.setAttribute('data-tooltip', tooltipText);
      } else {
        els.biasSummary.removeAttribute('data-tooltip');
      }
    }
    if (els.relationshipSummary) {
      els.relationshipSummary.hidden = true;
      els.relationshipSummary.style.display = 'none';
    }

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${display.icon}</span>
        <span class="pl-setup-device-name body-small">${display.name}</span>
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

  // Show/hide single-event and two-event view containers
  if (els.singleView) els.singleView.hidden = isTwo;
}

export default function render(els, state) {
  renderModeVisibility(els, state);
  renderExperimentSetup(els, state);

  if (state.mode === 'two') renderTwo(els, state);
  else renderSingle(els, state);
}
