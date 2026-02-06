// CodeSignal Probability Lab
// A convergence-focused probability simulator (coin / die / spinner).
import Modal from './design-system/components/modal/modal.js';
import { initializeHelpModal } from './src/shell/help.js';
import { loadConfig } from './src/shell/config.js';
import { createActivityLogger } from './src/shell/activity-logger.js';
import { clamp, safeNumber } from './src/shared/math.js';
import { formatProbability } from './src/shared/format.js';
import { buildDeviceDefinition } from './src/probability-lab/domain/devices.js';
import simulateSingleTrials from './src/probability-lab/engine/simulate-single.js';
import simulateTwoTrials from './src/probability-lab/engine/simulate-two.js';
import { createRunner } from './src/probability-lab/engine/runner.js';
import render from './src/probability-lab/ui/render.js';
import { createStore } from './src/probability-lab/state/store.js';
import { IndexHistory, PackedPairHistory } from './src/probability-lab/state/trial-history.js';
import { createHistoryView } from './src/probability-lab/ui/history-view.js';
import NumericSlider from './design-system/components/numeric-slider/numeric-slider.js';

function $(id) {
  return document.getElementById(id);
}

const els = {
  setupDevice: $('pl-setup-device'),
  setupSampleSpace: $('pl-setup-sample-space'),
  biasSummary: $('pl-bias-summary'),
  relationshipSummary: $('pl-relationship-summary'),

  singleConfig: $('pl-single-config'),
  singleView: $('pl-single-view'),
  twoConfig: $('pl-two-config'),
  twoView: $('pl-two-view'),

  spinnerOptions: $('pl-spinner-options'),
  spinnerSectors: $('pl-spinner-sectors'),
  biasOptions: $('pl-bias-options'),

  biasOptionsA: $('pl-bias-options-a'),
  biasOptionsB: $('pl-bias-options-b'),
  relationship: $('pl-relationship'),

  openSettings: $('pl-open-settings'),
  settingsModal: $('pl-settings-modal'),

  reset: $('pl-reset'),
  step: $('pl-step'),
  stepSize: $('pl-step-size'),
  auto: $('pl-auto'),
  autoSpeedContainer: $('pl-auto-speed-container'),
  runModeManual: $('pl-run-mode-manual'),
  runModeAuto: $('pl-run-mode-auto'),
  runModeToggleManual: $('pl-run-mode-toggle-manual'),
  runModeToggleAuto: $('pl-run-mode-toggle-auto'),

  eventOutcomes: $('pl-event-outcomes'),

  deviceView: $('pl-device-view'),
  trials: $('pl-trials'),
  last: $('pl-last'),
  historyButton: $('pl-history'),
  historyModal: $('pl-history-modal'),
  historySummary: $('pl-history-summary'),
  historyEmpty: $('pl-history-empty'),
  historyScroller: $('pl-history-scroller'),
  historyViewport: $('pl-history-viewport'),
  historyItems: $('pl-history-items'),
  historyJumpTop: $('pl-history-jump-top'),
  historyJumpLatest: $('pl-history-jump-latest'),

  barChart: $('pl-bar-chart'),
  lineChart: $('pl-line-chart'),
  frequencyTable: $('pl-frequency-table'),

  heatmap: $('pl-heatmap'),
  twoWayTable: $('pl-twoway-table'),
  cellSummary: $('pl-cell-summary'),

  // Section containers for visibility control
  barChartSection: $('pl-bar-chart-section'),
  convergenceCard: $('pl-convergence-card'),
  frequencyCard: $('pl-frequency-card'),
  jointDistributionCard: $('pl-joint-distribution-card'),
  twoWayTableCard: $('pl-two-way-table-card'),
  historyCard: $('pl-history-card'),
  historyCardSummary: $('pl-history-card-summary'),
  historyCardEmpty: $('pl-history-card-empty'),
  historyCardScroller: $('pl-history-card-scroller'),
  historyCardViewport: $('pl-history-card-viewport'),
  historyCardItems: $('pl-history-card-items'),
  historyCardJumpTop: $('pl-history-card-jump-top'),
  historyCardJumpLatest: $('pl-history-card-jump-latest'),
};

// Store NumericSlider instances for each device configuration
const sliderInstances = {
  single: new Map(), // key: 'coin-0', 'coin-1', 'die-0', etc.
  two: {
    a: new Map(),
    b: new Map(),
  },
};

// Store speed slider instance
let speedSlider = null;
let settingsModal = null;
let historyModal = null;
let historyView = null;

const store = createStore({

  mode: 'single',
  speed: 60,
  stepSize: 1,
  runMode: 'manual',

  sections: {
    barChart: false,
    convergence: false,
    frequencyTable: false,
    jointDistribution: false,
    twoWayTable: false,
    history: false,
  },

  visualElements: {
    editExperimentButton: true,
    biasTag: true,
  },

  running: {
    cancel: false,
    auto: false,
    rafId: null,
  },

  single: {
    device: 'coin',
    spinnerSectors: 8,
    coinProbabilities: [0.5, 0.5],
    dieProbabilities: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    spinnerSkew: 0,
    customDeviceSettings: null,
    definition: null,
    trials: 0,
    counts: [],
    lastIndex: null,
    history: [],
    trialHistory: new IndexHistory(),
    eventSelected: new Set(),
  },

  two: {
    deviceA: 'coin',
    spinnerSectorsA: 8,
    coinProbabilitiesA: [0.5, 0.5],
    dieProbabilitiesA: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    spinnerSkewA: 0,
    customDeviceSettingsA: null,

    deviceB: 'coin',
    spinnerSectorsB: 8,
    coinProbabilitiesB: [0.5, 0.5],
    dieProbabilitiesB: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    spinnerSkewB: 0,
    customDeviceSettingsB: null,

    relationship: 'independent',
    definitionA: null,
    definitionB: null,
    trials: 0,
    countsA: [],
    countsB: [],
    joint: [],
    lastA: null,
    lastB: null,
    selectedCell: null,
    trialHistory: new PackedPairHistory(),
  },
});

const activityLogger = createActivityLogger();

// Create runner instance with callbacks
const runner = createRunner(store.getState().running, {
  onTick: () => {
    const state = store.getState();
    render(els, state);
    applyVisibility(state);
    const sections = state.sections || {};
    const useStandalone = state.mode === 'single' && sections.history === true;
    if (historyView && (useStandalone || historyModal?.isOpen)) {
      historyView.sync(state, { preserveScroll: true });
    }
    activityLogger.maybeLogStatus(state);
  },
  onDone: updateControls,
  onStop: updateControls,
});

function resetSingleSimulation() {
  const state = store.getState();
  const def = buildDeviceDefinition({
    device: state.single.device,
    spinnerSectors: state.single.spinnerSectors,
    coinProbabilities: state.single.coinProbabilities,
    dieProbabilities: state.single.dieProbabilities,
    spinnerSkew: state.single.spinnerSkew,
    deviceSettings: state.single.customDeviceSettings,
  });

  let filtered = new Set();
  if (state.single.eventSelected instanceof Set) {
    for (const label of state.single.eventSelected) {
      const asText = String(label);
      if (def.labels.includes(asText)) filtered.add(asText);
    }
  }
  if (filtered.size === 0 && def.labels.length > 0) {
    filtered.add(def.labels[0]);
  }

  store.setState((draft) => {
    draft.single.definition = def;
    draft.single.trials = 0;
    draft.single.counts = Array(def.labels.length).fill(0);
    draft.single.lastIndex = null;
    draft.single.history = [];
    draft.single.trialHistory?.clear();
    draft.single.eventSelected = filtered;
  });

  renderEventOptions();
}

function resetTwoSimulation() {
  const state = store.getState();

  const defA = buildDeviceDefinition({
    device: state.two.deviceA,
    spinnerSectors: state.two.spinnerSectorsA,
    coinProbabilities: state.two.coinProbabilitiesA,
    dieProbabilities: state.two.dieProbabilitiesA,
    spinnerSkew: state.two.spinnerSkewA,
    deviceSettings: state.two.customDeviceSettingsA,
  });

  const defB = buildDeviceDefinition({
    device: state.two.deviceB,
    spinnerSectors: state.two.spinnerSectorsB,
    coinProbabilities: state.two.coinProbabilitiesB,
    dieProbabilities: state.two.dieProbabilitiesB,
    spinnerSkew: state.two.spinnerSkewB,
    deviceSettings: state.two.customDeviceSettingsB,
  });

  store.setState((draft) => {
    draft.two.definitionA = defA;
    draft.two.definitionB = defB;
    draft.two.trials = 0;
    draft.two.countsA = Array(defA.labels.length).fill(0);
    draft.two.countsB = Array(defB.labels.length).fill(0);
    draft.two.joint = Array.from({ length: defA.labels.length }, () => Array(defB.labels.length).fill(0));
    draft.two.lastA = null;
    draft.two.lastB = null;
    draft.two.selectedCell = null;
    draft.two.trialHistory?.clear();
  });
}

function resetSimulation({ reason = 'unknown', logSettings = false } = {}) {
  runner.stopRunning();
  store.setState((draft) => {
    draft.running.cancel = false;
  });

  const state = store.getState();
  if (state.mode === 'two') resetTwoSimulation();
  else resetSingleSimulation();

  render(els, store.getState());
  applyVisibility(store.getState());
  syncUiFromState();
  const currentState = store.getState();
  const sections = currentState.sections || {};
  const useStandalone = sections.history === true;
  if (historyView && (useStandalone || historyModal?.isOpen)) {
    historyView.sync(currentState, { scrollToLatest: true });
  }
  if (logSettings) {
    activityLogger.logSettingsChange(currentState);
  }
  activityLogger.logRunReset(currentState, reason);
}

function applySectionVisibility(state) {
  const sections = state.sections || {};

  if (state.mode === 'single') {
    // Hide two-mode sections
    if (els.jointDistributionCard) {
      els.jointDistributionCard.style.display = 'none';
      els.jointDistributionCard.hidden = true;
    }
    if (els.twoWayTableCard) {
      els.twoWayTableCard.style.display = 'none';
      els.twoWayTableCard.hidden = true;
    }

    // Show/hide single mode sections based on config - use style.display instead of hidden attribute to override CSS
    if (els.barChartSection) {
      els.barChartSection.style.display = sections.barChart ? '' : 'none';
      els.barChartSection.hidden = !sections.barChart;
    }
    if (els.convergenceCard) {
      els.convergenceCard.style.display = sections.convergence ? '' : 'none';
      els.convergenceCard.hidden = !sections.convergence;
    }
    if (els.frequencyCard) {
      els.frequencyCard.style.display = sections.frequencyTable ? '' : 'none';
      els.frequencyCard.hidden = !sections.frequencyTable;
    }

    // History card (standalone widget) - single mode only
    if (els.historyCard) {
      els.historyCard.style.display = sections.history ? '' : 'none';
      els.historyCard.hidden = !sections.history;
    }
  } else {
    // Hide single-mode sections
    if (els.barChartSection) {
      els.barChartSection.style.display = 'none';
      els.barChartSection.hidden = true;
    }
    if (els.convergenceCard) {
      els.convergenceCard.style.display = 'none';
      els.convergenceCard.hidden = true;
    }
    if (els.frequencyCard) {
      els.frequencyCard.style.display = 'none';
      els.frequencyCard.hidden = true;
    }

    // Show/hide two mode sections based on config
    if (els.jointDistributionCard) {
      els.jointDistributionCard.style.display = sections.jointDistribution ? '' : 'none';
      els.jointDistributionCard.hidden = !sections.jointDistribution;
    }
    if (els.twoWayTableCard) {
      els.twoWayTableCard.style.display = sections.twoWayTable ? '' : 'none';
      els.twoWayTableCard.hidden = !sections.twoWayTable;
    }

    // Hide history card in two-event mode (not used)
    if (els.historyCard) {
      els.historyCard.style.display = 'none';
      els.historyCard.hidden = true;
    }
  }
}

function applyVisualElementVisibility(state) {
  const visualElements = state.visualElements || {};

  const showEditExperimentButton = visualElements.editExperimentButton !== false;
  if (els.openSettings) {
    els.openSettings.style.display = showEditExperimentButton ? '' : 'none';
    els.openSettings.hidden = !showEditExperimentButton;
  }

  const showBiasTag = visualElements.biasTag !== false;
  if (els.biasSummary) {
    els.biasSummary.style.display = showBiasTag ? '' : 'none';
    els.biasSummary.hidden = !showBiasTag;
  }

  const tagsContainer = els.biasSummary?.parentElement || els.relationshipSummary?.parentElement;
  if (tagsContainer) {
    const biasVisible = Boolean(
      showBiasTag
      && els.biasSummary
      && !els.biasSummary.hidden
      && els.biasSummary.style.display !== 'none',
    );
    const relationshipVisible = Boolean(
      els.relationshipSummary
      && !els.relationshipSummary.hidden
      && els.relationshipSummary.style.display !== 'none',
    );

    const anyVisible = biasVisible || relationshipVisible;
    tagsContainer.style.display = anyVisible ? '' : 'none';
    tagsContainer.hidden = !anyVisible;
  }
}

function applyVisibility(state) {
  applySectionVisibility(state);
  applyVisualElementVisibility(state);

  // Hide history button and modal when history is shown as standalone widget (single mode only)
  const sections = state.sections || {};
  const useStandalone = state.mode === 'single' && sections.history === true;

  if (els.historyButton) {
    els.historyButton.style.display = useStandalone ? 'none' : '';
    els.historyButton.hidden = useStandalone;
  }

  // Hide modal content when standalone widget is active (single mode only)
  if (els.historyModal) {
    els.historyModal.style.display = useStandalone ? 'none' : '';
    els.historyModal.hidden = useStandalone;
  }
}

function updateControls() {
  const state = store.getState();
  const autoRunning = state.running.auto;
  const disableInputs = state.running.rafId !== null && state.running.auto;

  els.auto.textContent = autoRunning ? 'Stop Automatic Run' : 'Start Automatic Run';
  els.step.disabled = autoRunning;
  els.step.textContent = state.stepSize === 1 ? 'Run 1 Trial' : `Run ${state.stepSize} Trials`;

  if (els.runModeAuto) {
    els.runModeAuto.classList.toggle('pl-run-mode-active', autoRunning);
  }

  // Update run mode visibility
  if (els.runModeManual) {
    els.runModeManual.classList.toggle('hidden', state.runMode !== 'manual');
  }
  if (els.runModeAuto) {
    els.runModeAuto.classList.toggle('hidden', state.runMode !== 'auto');
  }

  // Update toggle button active states
  if (els.runModeToggleManual) {
    els.runModeToggleManual.classList.toggle('active', state.runMode === 'manual');
  }
  if (els.runModeToggleAuto) {
    els.runModeToggleAuto.classList.toggle('active', state.runMode === 'auto');
  }

  // Controls are disabled only during auto-run
  const toDisable = [
    els.spinnerSectors,
    els.stepSize,
    els.relationship,
    els.openSettings,
  ];

  for (const el of toDisable) {
    if (!el) continue;
    el.disabled = disableInputs;
  }

  for (const button of document.querySelectorAll('#pl-run-mode-manual .pl-button-group .button')) {
    button.disabled = disableInputs;
  }

  // Disable/enable NumericSlider instances
  for (const slider of sliderInstances.single.values()) {
    if (slider && typeof slider.setDisabled === 'function') {
      slider.setDisabled(disableInputs);
    }
  }
  for (const slider of sliderInstances.two.a.values()) {
    if (slider && typeof slider.setDisabled === 'function') {
      slider.setDisabled(disableInputs);
    }
  }
  for (const slider of sliderInstances.two.b.values()) {
    if (slider && typeof slider.setDisabled === 'function') {
      slider.setDisabled(disableInputs);
    }
  }

  // Disable/enable speed slider
  if (speedSlider && typeof speedSlider.setDisabled === 'function') {
    speedSlider.setDisabled(disableInputs);
  }

  // Also disable other inputs in bias containers (like spinner sectors)
  for (const container of [els.biasOptions, els.biasOptionsA, els.biasOptionsB]) {
    if (!container) continue;
    for (const input of container.querySelectorAll('select')) {
      input.disabled = disableInputs;
    }
  }

  if (disableInputs) {
    els.reset.disabled = true;
  } else {
    els.reset.disabled = false;
  }
}

function normalizeProbabilities(probabilities, changedIndex, newValue) {
  // Clone array to avoid mutation
  const result = [...probabilities];

  // Clamp new value to 0-1 range
  const clamped = clamp(newValue, 0, 1);
  result[changedIndex] = clamped;

  // Calculate remaining probability
  const remaining = 1 - clamped;

  // Get other probabilities (excluding changed index)
  const others = result.filter((_, i) => i !== changedIndex);
  const otherSum = others.reduce((sum, p) => sum + p, 0);

  // Redistribute proportionally
  if (otherSum > 0) {
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        result[i] = (probabilities[i] / otherSum) * remaining;
      }
    }
  } else {
    // Fallback: equal distribution among non-changed outcomes
    const equal = remaining / (result.length - 1);
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        result[i] = equal;
      }
    }
  }

  return result;
}

function renderOutcomeSliders(
  container,
  instanceMap,
  deviceKey,
  labels,
  probabilities,
  onChange
) {
  // Check if sliders already exist for this device
  const existingKeys = [];
  for (const key of instanceMap.keys()) {
    if (key.startsWith(`${deviceKey}-`)) {
      existingKeys.push(key);
    }
  }

  // If sliders exist, update their values instead of recreating
  if (existingKeys.length > 0) {
    for (let i = 0; i < labels.length; i++) {
      const sliderKey = `${deviceKey}-${i}`;
      const slider = instanceMap.get(sliderKey);
      if (slider) {
        slider.setValue(Math.round(probabilities[i] * 100), null, false);
      }
    }
    return;
  }

  // No existing sliders, create new ones
  container.innerHTML = '';
  container.classList.remove('pl-bias-options--custom');

  for (let i = 0; i < labels.length; i++) {
    const sliderKey = `${deviceKey}-${i}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'pl-bias-row';

    const labelEl = document.createElement('span');
    labelEl.textContent = `P(${labels[i]})`;
    labelEl.classList.add('pl-bias-row-label', 'body-small');

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'pl-bias-row-control';
    wrapper.appendChild(labelEl);
    wrapper.appendChild(sliderContainer);
    container.appendChild(wrapper);

    const slider = new NumericSlider(sliderContainer, {
      type: 'single',
      min: 0,
      max: 100,
      step: 1,
      value: Math.round(probabilities[i] * 100),
      showInputs: true,
      onChange: (percentageValue) => {
        const probabilityValue = percentageValue / 100;

        // Get current probabilities from all sliders
        const currentProbabilities = [];
        for (let j = 0; j < labels.length; j++) {
          const otherKey = `${deviceKey}-${j}`;
          const otherSlider = instanceMap.get(otherKey);
          if (otherSlider) {
            const otherValue = otherSlider.getValue();
            currentProbabilities[j] = otherValue / 100;
          } else {
            currentProbabilities[j] = probabilities[j];
          }
        }

        const normalized = normalizeProbabilities(currentProbabilities, i, probabilityValue);

        // Update all sliders with normalized values
        for (let j = 0; j < labels.length; j++) {
          const otherKey = `${deviceKey}-${j}`;
          const otherSlider = instanceMap.get(otherKey);
          if (otherSlider) {
            otherSlider.setValue(Math.round(normalized[j] * 100), null, false);
          }
        }

        onChange(normalized);
      },
    });

    instanceMap.set(sliderKey, slider);
  }
}

function renderBiasControls(container, device, values, onChange) {
  // Determine which instance map to use based on container
  let instanceMap;
  if (container === els.biasOptions) {
    instanceMap = sliderInstances.single;
  } else if (container === els.biasOptionsA) {
    instanceMap = sliderInstances.two.a;
  } else if (container === els.biasOptionsB) {
    instanceMap = sliderInstances.two.b;
  } else {
    instanceMap = sliderInstances.single; // fallback
  }

  const deviceKey = device;

  if (device === 'custom') {
    const settings = values.customDeviceSettings ?? {};
    const outcomes = Array.isArray(settings.outcomes) ? settings.outcomes : [];
    let probabilities = Array.isArray(settings.probabilities) ? settings.probabilities : [];

    if (outcomes.length === 0) {
      container.innerHTML = '';
      container.classList.add('pl-bias-options--custom');
      const empty = document.createElement('div');
      empty.className = 'pl-custom-bias-note body-xsmall';
      empty.textContent = 'No custom outcomes configured.';
      container.append(empty);
      return;
    }

    // Ensure probabilities array matches outcomes length
    if (probabilities.length !== outcomes.length) {
      const uniformProb = 1 / outcomes.length;
      probabilities = Array.from({ length: outcomes.length }, () => uniformProb);
    }

    renderOutcomeSliders(
      container,
      instanceMap,
      deviceKey,
      outcomes,
      probabilities,
      (normalized) => onChange('customProbabilities', normalized)
    );
    return;
  }

  container.classList.remove('pl-bias-options--custom');

  if (device === 'coin') {
    const labels = ['H', 'T'];
    const probabilities = values.coinProbabilities ?? [0.5, 0.5];
    renderOutcomeSliders(
      container,
      instanceMap,
      deviceKey,
      labels,
      probabilities,
      (normalized) => onChange('coinProbabilities', normalized)
    );
    return;
  }

  if (device === 'die') {
    const labels = ['1', '2', '3', '4', '5', '6'];
    const probabilities = values.dieProbabilities ?? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    renderOutcomeSliders(
      container,
      instanceMap,
      deviceKey,
      labels,
      probabilities,
      (normalized) => onChange('dieProbabilities', normalized)
    );
    return;
  }

  // Spinner skew
  const sliderKey = `${deviceKey}-skew`;
  const wrapper = document.createElement('div');
  wrapper.className = 'pl-bias-row';

  const labelEl = document.createElement('span');
  labelEl.textContent = 'Skew';
  labelEl.classList.add('pl-bias-row-label', 'body-small');

  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'pl-bias-row-control';
  wrapper.appendChild(labelEl);
  wrapper.appendChild(sliderContainer);
  container.appendChild(wrapper);

  const slider = new NumericSlider(sliderContainer, {
    type: 'single',
    min: -100,
    max: 100,
    step: 1,
    value: Math.round(values.spinnerSkew * 100),
    showInputs: true,
    onChange: (percentageValue) => {
      const skewValue = percentageValue / 100;
      onChange('spinnerSkew', skewValue);
    },
  });

  instanceMap.set(sliderKey, slider);
}

function renderEventOptions() {
  const state = store.getState();
  const def = state.single.definition;
  els.eventOutcomes.innerHTML = '';
  if (!def) return;

  const selectedLabels = state.single.eventSelected instanceof Set ? state.single.eventSelected : new Set();

  for (let i = 0; i < def.labels.length; i += 1) {
    const option = document.createElement('div');
    option.className = 'pl-event-option';

    const label = document.createElement('label');
    label.className = 'input-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedLabels.has(def.labels[i]);

    const box = document.createElement('span');
    box.className = 'input-checkbox-box';

    const checkmark = document.createElement('span');
    checkmark.className = 'input-checkbox-checkmark';
    box.appendChild(checkmark);

    const title = document.createElement('span');
    title.className = 'input-checkbox-label';
    title.textContent = def.labels[i];

    checkbox.addEventListener('change', () => {
      const currentState = store.getState();
      const next = currentState.single.eventSelected instanceof Set ? new Set(currentState.single.eventSelected) : new Set();
      if (checkbox.checked) next.add(def.labels[i]);
      else next.delete(def.labels[i]);
      store.setState((draft) => {
        draft.single.eventSelected = next;
      });
      const state = store.getState();
      render(els, state);
      applyVisibility(state);
      activityLogger.logSettingsChange(state);
    });

    label.append(checkbox, box, title);

    const p = document.createElement('div');
    p.className = 'pl-event-prob body-xsmall';
    p.textContent = formatProbability(def.probabilities[i], 1);

    option.addEventListener('click', (event) => {
      if (event.target.closest('label')) return;
      checkbox.click();
    });

    option.append(label, p);
    els.eventOutcomes.append(option);
  }
}

function openSettingsModal(scrollTarget) {
  if (!settingsModal) return;

  settingsModal.open();

  if (!scrollTarget) return;
  requestAnimationFrame(() => {
    const targetEl = settingsModal.content.querySelector(scrollTarget);
    if (!targetEl) return;
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initSettingsModal() {
  if (settingsModal) return;
  if (!els.settingsModal) return;

  const modalContent = els.settingsModal;
  const wasHidden = modalContent.hidden;
  // Keep it hidden in-page to avoid layout shift while we move it into the modal dialog.
  modalContent.hidden = true;

  settingsModal = new Modal({
    size: 'large',
    title: 'Experiment Settings',
    content: modalContent,
    footerButtons: [{ label: 'Done', type: 'primary' }],
  });

  if (wasHidden) modalContent.hidden = false;

  if (els.openSettings) {
    els.openSettings.addEventListener('click', () => openSettingsModal('#pl-settings-section-probabilities'));
  }
}

function initHistoryModal() {
  if (historyView) return; // Already initialized

  const state = store.getState();
  const sections = state.sections || {};
  const useStandalone = state.mode === 'single' && sections.history === true;

  if (useStandalone) {
    // Initialize standalone history widget (single mode only)
    if (!els.historyCard) return;

    // Ensure modal content is hidden when using standalone
    if (els.historyModal) {
      els.historyModal.style.display = 'none';
      els.historyModal.hidden = true;
    }

    historyView = createHistoryView({
      summaryEl: els.historyCardSummary,
      emptyEl: els.historyCardEmpty,
      scrollerEl: els.historyCardScroller,
      viewportEl: els.historyCardViewport,
      itemsEl: els.historyCardItems,
      jumpTopButton: els.historyCardJumpTop,
      jumpLatestButton: els.historyCardJumpLatest,
    });
  } else {
    // Initialize modal history (default for both modes, but required for two-event mode)
    if (historyModal) return;
    if (!els.historyModal) return;

    const modalContent = els.historyModal;
    const wasHidden = modalContent.hidden;
    modalContent.hidden = true;

    historyModal = new Modal({
      size: 'medium',
      title: 'Trial History',
      content: modalContent,
      onOpen: () => {
        if (historyView) historyView.sync(store.getState(), { scrollToLatest: true });
      },
    });

    if (wasHidden) modalContent.hidden = false;

    historyView = createHistoryView({
      summaryEl: els.historySummary,
      emptyEl: els.historyEmpty,
      scrollerEl: els.historyScroller,
      viewportEl: els.historyViewport,
      itemsEl: els.historyItems,
      jumpTopButton: els.historyJumpTop,
      jumpLatestButton: els.historyJumpLatest,
    });

    if (els.historyButton) {
      els.historyButton.addEventListener('click', () => {
        historyModal.open();
      });
    }
  }
}

function syncUiFromState() {
  const state = store.getState();
  els.stepSize.value = String(state.stepSize);

  els.spinnerSectors.value = String(state.single.spinnerSectors);

  els.relationship.value = state.two.relationship;

  // Sync speed slider value
  if (speedSlider && typeof speedSlider.setValue === 'function') {
    speedSlider.setValue(state.speed, null, false);
  }

  renderBiasControls(els.biasOptions, state.single.device, {
    coinProbabilities: state.single.coinProbabilities,
    dieProbabilities: state.single.dieProbabilities,
    spinnerSkew: state.single.spinnerSkew,
    customDeviceSettings: state.single.customDeviceSettings,
  }, (key, value) => {
    store.setState((draft) => {
      if (key === 'customProbabilities') {
        if (draft.single.customDeviceSettings) {
          draft.single.customDeviceSettings.probabilities = value;
        }
      } else {
        draft.single[key] = value;
      }
    });
    resetSimulation({ reason: 'bias_change', logSettings: true });
  });

  renderBiasControls(
    els.biasOptionsA,
    state.two.deviceA,
    {
      coinProbabilities: state.two.coinProbabilitiesA,
      dieProbabilities: state.two.dieProbabilitiesA,
      spinnerSkew: state.two.spinnerSkewA,
      customDeviceSettings: state.two.customDeviceSettingsA,
    },
    (key, value) => {
      store.setState((draft) => {
        if (key === 'customProbabilities') {
          if (draft.two.customDeviceSettingsA) {
            draft.two.customDeviceSettingsA.probabilities = value;
          }
        } else {
          draft.two[`${key}A`] = value;
        }
      });
      resetSimulation({ reason: 'bias_change', logSettings: true });
    },
  );

  updateTwoControlsForRelationship();
}

function updateTwoControlsForRelationship() {
  const state = store.getState();

  renderBiasControls(
    els.biasOptionsB,
    state.two.deviceB,
    {
      coinProbabilities: state.two.coinProbabilitiesB,
      dieProbabilities: state.two.dieProbabilitiesB,
      spinnerSkew: state.two.spinnerSkewB,
      customDeviceSettings: state.two.customDeviceSettingsB,
    },
    (key, value) => {
      store.setState((draft) => {
        if (key === 'customProbabilities') {
          if (draft.two.customDeviceSettingsB) {
            draft.two.customDeviceSettingsB.probabilities = value;
          }
        } else {
          draft.two[`${key}B`] = value;
        }
      });
      resetSimulation({ reason: 'bias_change', logSettings: true });
    },
  );
}

function initEventListeners() {
  initSettingsModal();
  initHistoryModal();

  els.spinnerSectors.addEventListener('change', () => {
    const clamped = clamp(parseInt(els.spinnerSectors.value, 10), 2, 12);
    store.setState((draft) => {
      draft.single.spinnerSectors = clamped;
    });
    resetSimulation({ reason: 'bias_change', logSettings: true });
  });

  els.relationship.addEventListener('change', () => {
    store.setState((draft) => {
      draft.two.relationship = els.relationship.value;
    });
    updateTwoControlsForRelationship();
    resetSimulation({ reason: 'relationship_change', logSettings: true });
  });

  els.stepSize.addEventListener('change', () => {
    const clamped = clamp(Math.floor(safeNumber(els.stepSize.value, 100)), 1, 1_000_000);
    store.setState((draft) => {
      draft.stepSize = clamped;
    });
    els.stepSize.value = String(clamped);
    updateControls();
  });

  // Handle run mode toggle buttons
  if (els.runModeToggleManual) {
    els.runModeToggleManual.addEventListener('click', () => {
      const state = store.getState();
      // If switching from auto to manual and auto is running, stop it
      if (state.runMode === 'auto' && state.running.auto) {
        runner.stopRunning();
      }
      // Update active states in the toggle group
      const toggleGroup = els.runModeToggleManual.closest('.pl-button-group');
      if (toggleGroup) {
        toggleGroup.querySelectorAll('.button').forEach((btn) => {
          btn.classList.remove('active');
        });
        els.runModeToggleManual.classList.add('active');
      }
      store.setState((draft) => {
        draft.runMode = 'manual';
      });
      updateControls();
    });
  }

  if (els.runModeToggleAuto) {
    els.runModeToggleAuto.addEventListener('click', () => {
      // Update active states in the toggle group
      const toggleGroup = els.runModeToggleAuto.closest('.pl-button-group');
      if (toggleGroup) {
        toggleGroup.querySelectorAll('.button').forEach((btn) => {
          btn.classList.remove('active');
        });
        els.runModeToggleAuto.classList.add('active');
      }
      store.setState((draft) => {
        draft.runMode = 'auto';
      });
      updateControls();
    });
  }

  // Handle button group selection (for step size buttons)
  document.querySelectorAll('.pl-button-group .button[data-value]').forEach((button) => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons in the same group
      const group = button.closest('.pl-button-group');
      if (group) {
        group.querySelectorAll('.button').forEach((btn) => {
          btn.classList.remove('active');
        });
      }
      // Add active class to clicked button
      button.classList.add('active');
      // Update hidden input and store
      const value = parseInt(button.dataset.value, 10);
      els.stepSize.value = String(value);
      store.setState((draft) => {
        draft.stepSize = value;
      });
      updateControls();
    });
  });

  els.step.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(state.stepSize, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, Math.random);
  });

  els.reset.addEventListener('click', () => {
    resetSimulation({ reason: 'user_reset' });
  });

  els.auto.addEventListener('click', () => {
    const state = store.getState();
    if (state.running.auto) {
      runner.stopRunning();
    } else {
      const stateSlice = state.mode === 'two' ? state.two : state.single;
      runner.startAuto(state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, Math.random, state.speed);
    }
  });

  els.twoWayTable.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-row][data-col]');
    if (!cell) return;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    if (!Number.isInteger(r) || !Number.isInteger(c)) return;
    store.setState((draft) => {
      draft.two.selectedCell = { r, c };
    });
    const currentState = store.getState();
    render(els, currentState);
    applyVisibility(currentState);
  });

  els.heatmap.addEventListener('click', (event) => {
    const currentState = store.getState();
    const defA = currentState.two.definitionA;
    const defB = currentState.two.definitionB;
    if (!defA || !defB) return;

    const rect = els.heatmap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padding = { top: 48, right: 14, bottom: 18, left: 90 };
    const plotW = rect.width - padding.left - padding.right;
    const plotH = rect.height - padding.top - padding.bottom;
    if (plotW <= 0 || plotH <= 0) return;

    const cols = defB.labels.length;
    const rows = defA.labels.length;
    const col = Math.floor(((x - padding.left) / plotW) * cols);
    const row = Math.floor(((y - padding.top) / plotH) * rows);

    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    store.setState((draft) => {
      draft.two.selectedCell = { r: row, c: col };
    });
    const updatedState = store.getState();
    render(els, updatedState);
    applyVisibility(updatedState);
  });

  window.addEventListener('resize', () => {
    const state = store.getState();
    render(els, state);
    applyVisibility(state);
    const sections = state.sections || {};
    const useStandalone = sections.history === true;
    if (historyView && (useStandalone || historyModal?.isOpen)) {
      historyView.sync(state, { preserveScroll: true });
    }
  });
}

async function init() {
  // Initialize help modal (non-blocking)
  initializeHelpModal(Modal);

  // Initialize probability lab
  if (!els.singleConfig) return;

  // Load configuration from config.json
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error('Failed to load config:', error);
    return;
  }

  // Apply config to store state
  store.setState((draft) => {
    draft.mode = config.mode;
    if (config.mode === 'single') {
      draft.single.device = config.device;
      draft.single.customDeviceSettings = config.deviceSettings ?? null;
    } else {
      draft.two.deviceA = config.deviceA;
      draft.two.deviceB = config.deviceB;
      draft.two.customDeviceSettingsA = config.deviceASettings ?? null;
      draft.two.customDeviceSettingsB = config.deviceBSettings ?? null;
    }
    if (config.sections) {
      draft.sections = { ...draft.sections, ...config.sections };
    }
    if (config.visualElements) {
      draft.visualElements = { ...draft.visualElements, ...config.visualElements };
    }
  });
  syncUiFromState();

  // Initialize speed slider
  if (els.autoSpeedContainer && !speedSlider) {
    const state = store.getState();
    speedSlider = new NumericSlider(els.autoSpeedContainer, {
      type: 'single',
      min: 1,
      max: 60,
      step: 1,
      value: state.speed,
      showInputs: true,
      onChange: (value) => {
        const currentState = store.getState();
        const wasRunning = currentState.running.auto;

        store.setState((draft) => {
          draft.speed = value;
        });

        // If auto mode is running, restart it with new speed
        if (wasRunning) {
          runner.stopRunning();
          // Use setTimeout to ensure stopRunning completes before restarting
          setTimeout(() => {
            const newState = store.getState();
            const stateSlice = newState.mode === 'two' ? newState.two : newState.single;
            runner.startAuto(newState.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, Math.random, newState.speed);
          }, 0);
        }
      },
    });
  }

  resetSingleSimulation();
  resetTwoSimulation();

  initEventListeners();
  updateControls();
  // Apply visibility after initEventListeners so history modal/widget is initialized first
  applyVisibility(store.getState());
  activityLogger.logAppStart(store.getState());

  // Defer initial render until after layout is complete
  requestAnimationFrame(() => {
    const state = store.getState();
    render(els, state);
    applyVisibility(state);
    // Sync standalone history if enabled
    const sections = state.sections || {};
    if (sections.history === true && historyView) {
      historyView.sync(state, { scrollToLatest: false });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
