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

export function renderExperimentSetup(els, state) {
  if (!els.setupDevice || !els.setupSampleSpace) return;

  if (state.mode === 'two') {
    // Two-event mode: show both devices and sample spaces
    const deviceA = state.two.deviceA || '—';
    const deviceB = state.two.deviceB || '—';
    const labelsA = state.two.definitionA?.labels;
    const labelsB = state.two.definitionB?.labels;

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(deviceA)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(deviceA)}</span>
        <span class="pl-setup-label body-xsmall">(Event A)</span>
      </div>
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(deviceB)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(deviceB)}</span>
        <span class="pl-setup-label body-xsmall">(Event B)</span>
      </div>
    `;

    els.setupSampleSpace.innerHTML = `
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-label body-xsmall">Event A: Sample Space Ω =</span>
        <span class="pl-setup-set code-small">${formatSampleSpace(labelsA)}</span>
      </div>
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-label body-xsmall">Event B: Sample Space Ω =</span>
        <span class="pl-setup-set code-small">${formatSampleSpace(labelsB)}</span>
      </div>
    `;
  } else {
    // Single mode: show single device and sample space
    const device = state.single.device || '—';
    const labels = state.single.definition?.labels;

    els.setupDevice.innerHTML = `
      <div class="pl-setup-device-item">
        <span class="pl-setup-icon body-large">${getDeviceIcon(device)}</span>
        <span class="pl-setup-device-name body-small">${formatDeviceName(device)}</span>
      </div>
    `;

    els.setupSampleSpace.innerHTML = `
      <div class="pl-setup-sample-space-item">
        <span class="pl-setup-label body-xsmall">Sample Space Ω =</span>
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

