// CodeSignal Probability Lab
// A convergence-focused probability simulator (coin / die / spinner).
import Modal from './design-system/components/modal/modal.js';
import { setStatus } from './src/shell/status.js';
import { initializeWebSocket } from './src/shell/websocket.js';
import { initializeHelpModal } from './src/shell/help.js';
import { loadConfig } from './src/shell/config.js';
import { clamp, safeNumber } from './src/shared/math.js';
import { formatProbability } from './src/shared/format.js';
import { createRngFromSeed } from './src/probability-lab/domain/rng.js';
import { buildDeviceDefinition } from './src/probability-lab/domain/devices.js';
import simulateSingleTrials from './src/probability-lab/engine/simulate-single.js';
import simulateTwoTrials from './src/probability-lab/engine/simulate-two.js';
import { createRunner } from './src/probability-lab/engine/runner.js';
import render from './src/probability-lab/ui/render.js';
import { createStore } from './src/probability-lab/state/store.js';
import NumericSlider from './design-system/components/numeric-slider/numeric-slider.js';

function $(id) {
  return document.getElementById(id);
}

const els = {
  status: $('status'),

  setupDevice: $('pl-setup-device'),
  setupSampleSpace: $('pl-setup-sample-space'),

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

  reset: $('pl-reset'),
  step: $('pl-step'),
  stepSize: $('pl-step-size'),
  auto: $('pl-auto'),
  autoSpeedContainer: $('pl-auto-speed-container'),
  runModeManual: $('pl-run-mode-manual'),
  runModeAuto: $('pl-run-mode-auto'),

  seed: $('pl-seed'),

  eventCard: $('pl-event-card'),
  eventOutcomes: $('pl-event-outcomes'),
  eventEst: $('pl-event-est'),
  eventTheory: $('pl-event-theory'),

  deviceView: $('pl-device-view'),
  trials: $('pl-trials'),
  last: $('pl-last'),

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

const store = createStore({
  rng: Math.random,
  seedText: '',

  mode: 'single',
  speed: 60,
  stepSize: 1,

  sections: {
    barChart: false,
    convergence: false,
    frequencyTable: false,
    jointDistribution: false,
    twoWayTable: false,
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
    definition: null,
    trials: 0,
    counts: [],
    lastIndex: null,
    history: [],
    eventSelected: new Set(),
  },

  two: {
    deviceA: 'coin',
    spinnerSectorsA: 8,
    coinProbabilitiesA: [0.5, 0.5],
    dieProbabilitiesA: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    spinnerSkewA: 0,

    deviceB: 'coin',
    spinnerSectorsB: 8,
    coinProbabilitiesB: [0.5, 0.5],
    dieProbabilitiesB: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    spinnerSkewB: 0,

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
  },
});

// Create runner instance with callbacks
const runner = createRunner(store.getState().running, {
  onTick: () => {
    const state = store.getState();
    render(els, state);
    applySectionVisibility(state);
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
    draft.single.eventSelected = filtered;
  });

  renderEventOptions();
}

function resetTwoSimulation() {
  const state = store.getState();
  const relationship = state.two.relationship;

  const defA = buildDeviceDefinition({
    device: state.two.deviceA,
    spinnerSectors: state.two.spinnerSectorsA,
    coinProbabilities: state.two.coinProbabilitiesA,
    dieProbabilities: state.two.dieProbabilitiesA,
    spinnerSkew: state.two.spinnerSkewA,
  });

  let defB;
  if (relationship === 'copy' || relationship === 'complement') {
    defB = { ...defA };
    defB.cdf = [...defA.cdf];
    defB.labels = [...defA.labels];
    defB.probabilities = [...defA.probabilities];
  } else {
    defB = buildDeviceDefinition({
      device: state.two.deviceB,
      spinnerSectors: state.two.spinnerSectorsB,
      coinProbabilities: state.two.coinProbabilitiesB,
      dieProbabilities: state.two.dieProbabilitiesB,
      spinnerSkew: state.two.spinnerSkewB,
    });
  }

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
  });
}

function resetSimulation() {
  runner.stopRunning();
  store.setState((draft) => {
    draft.running.cancel = false;
    // Rewind RNG to the start of the seeded sequence on every reset
    draft.rng = createRngFromSeed(draft.seedText);
  });

  const state = store.getState();
  if (state.mode === 'two') resetTwoSimulation();
  else resetSingleSimulation();

  render(els, store.getState());
  applySectionVisibility(store.getState());
  syncUiFromState();
}

function applySectionVisibility(state) {
  const sections = state.sections || {};

  if (state.mode === 'single') {
    // Single mode sections - use style.display instead of hidden attribute to override CSS
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
  } else {
    // Two mode sections
    if (els.jointDistributionCard) {
      els.jointDistributionCard.style.display = sections.jointDistribution ? '' : 'none';
      els.jointDistributionCard.hidden = !sections.jointDistribution;
    }
    if (els.twoWayTableCard) {
      els.twoWayTableCard.style.display = sections.twoWayTable ? '' : 'none';
      els.twoWayTableCard.hidden = !sections.twoWayTable;
    }
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

  // Controls are disabled only during auto-run
  const toDisable = [
    els.spinnerSectors,
    els.stepSize,
    els.seed,
    els.relationship,
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

function normalizeProbabilities(probabilities, changedIndex, newValue, maxValue = 0.8) {
  // Clone array to avoid mutation
  const result = [...probabilities];

  // Clamp new value
  const clamped = clamp(newValue, 0.01, maxValue);
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
    // Fallback: equal distribution (shouldn't happen in practice)
    const equal = remaining / (result.length - 1);
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        result[i] = equal;
      }
    }
  }

  return result;
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

  // Check if sliders already exist for this device
  const existingKeys = [];
  for (const key of instanceMap.keys()) {
    if (key.startsWith(`${deviceKey}-`)) {
      existingKeys.push(key);
    }
  }

  // If sliders exist, update their values instead of recreating
  if (existingKeys.length > 0) {
    if (device === 'coin') {
      const probabilities = values.coinProbabilities ?? [0.5, 0.5];
      for (let i = 0; i < 2; i++) {
        const sliderKey = `${deviceKey}-${i}`;
        const slider = instanceMap.get(sliderKey);
        if (slider) {
          slider.setValue(Math.round(probabilities[i] * 100), null, false);
        }
      }
    } else if (device === 'die') {
      const probabilities = values.dieProbabilities ?? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
      for (let i = 0; i < 6; i++) {
        const sliderKey = `${deviceKey}-${i}`;
        const slider = instanceMap.get(sliderKey);
        if (slider) {
          slider.setValue(Math.round(probabilities[i] * 100), null, false);
        }
      }
    } else {
      // Spinner
      const sliderKey = `${deviceKey}-skew`;
      const slider = instanceMap.get(sliderKey);
      if (slider) {
        slider.setValue(Math.round(values.spinnerSkew * 100), null, false);
      }
    }
    return;
  }

  // No existing sliders, create new ones
  container.innerHTML = '';

  if (device === 'coin') {
    const probabilities = values.coinProbabilities ?? [0.5, 0.5];
    const labels = ['H', 'T'];
    for (let i = 0; i < 2; i++) {
      const sliderKey = `${deviceKey}-${i}`;
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = 'var(--UI-Spacing-spacing-sm)';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'row';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = 'var(--UI-Spacing-spacing-sm)';

      const labelEl = document.createElement('label');
      labelEl.textContent = `P(${labels[i]})`;
      labelEl.classList.add('pl-slider-label', 'body-small');

      const sliderContainer = document.createElement('div');
      wrapper.appendChild(labelEl);
      wrapper.appendChild(sliderContainer);
      container.appendChild(wrapper);

      const slider = new NumericSlider(sliderContainer, {
        type: 'single',
        min: 1,
        max: 99,
        step: 1,
        value: Math.round(probabilities[i] * 100),
        showInputs: true,
        onChange: (percentageValue) => {
          const probabilityValue = percentageValue / 100;

          // Get current probabilities from all sliders
          const currentProbabilities = [];
          for (let j = 0; j < 2; j++) {
            const otherKey = `${deviceKey}-${j}`;
            const otherSlider = instanceMap.get(otherKey);
            if (otherSlider) {
              const otherValue = otherSlider.getValue();
              currentProbabilities[j] = otherValue / 100;
            } else {
              currentProbabilities[j] = probabilities[j];
            }
          }

          const normalized = normalizeProbabilities(currentProbabilities, i, probabilityValue, 0.99);

          // Update all coin sliders with normalized values
          for (let j = 0; j < 2; j++) {
            const otherKey = `${deviceKey}-${j}`;
            const otherSlider = instanceMap.get(otherKey);
            if (otherSlider) {
              otherSlider.setValue(Math.round(normalized[j] * 100), null, false);
            }
          }

          onChange('coinProbabilities', normalized);
        },
      });

      instanceMap.set(sliderKey, slider);
    }
    return;
  }

  if (device === 'die') {
    const probabilities = values.dieProbabilities ?? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    for (let i = 0; i < 6; i++) {
      const faceNumber = i + 1;
      const sliderKey = `${deviceKey}-${i}`;
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = 'var(--UI-Spacing-spacing-sm)';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'row';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = 'var(--UI-Spacing-spacing-sm)';

      const labelEl = document.createElement('label');
      labelEl.textContent = `P(${faceNumber})`;
      labelEl.classList.add('pl-slider-label', 'body-small');

      const sliderContainer = document.createElement('div');
      wrapper.appendChild(labelEl);
      wrapper.appendChild(sliderContainer);
      container.appendChild(wrapper);

      const slider = new NumericSlider(sliderContainer, {
        type: 'single',
        min: 1,
        max: 80,
        step: 1,
        value: Math.round(probabilities[i] * 100),
        showInputs: true,
        onChange: (percentageValue) => {
          const probabilityValue = percentageValue / 100;

          // Get current probabilities from all sliders
          const currentProbabilities = [];
          for (let j = 0; j < 6; j++) {
            const otherKey = `${deviceKey}-${j}`;
            const otherSlider = instanceMap.get(otherKey);
            if (otherSlider) {
              const otherValue = otherSlider.getValue();
              currentProbabilities[j] = otherValue / 100;
            } else {
              currentProbabilities[j] = probabilities[j];
            }
          }

          const normalized = normalizeProbabilities(currentProbabilities, i, probabilityValue, 0.8);

          // Update all die sliders with normalized values
          for (let j = 0; j < 6; j++) {
            const otherKey = `${deviceKey}-${j}`;
            const otherSlider = instanceMap.get(otherKey);
            if (otherSlider) {
              otherSlider.setValue(Math.round(normalized[j] * 100), null, false);
            }
          }

          onChange('dieProbabilities', normalized);
        },
      });

      instanceMap.set(sliderKey, slider);
    }
    return;
  }

  // Spinner skew
  const sliderKey = `${deviceKey}-skew`;
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = 'var(--UI-Spacing-spacing-sm)';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'row';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = 'var(--UI-Spacing-spacing-sm)';

  const labelEl = document.createElement('label');
  labelEl.textContent = 'Skew';
  labelEl.classList.add('pl-slider-label', 'body-small');

  const sliderContainer = document.createElement('div');
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
      applySectionVisibility(state);
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

function applySeed(seedText) {
  const trimmed = (seedText ?? '').trim();
  store.setState((draft) => {
    draft.seedText = trimmed;
    draft.rng = createRngFromSeed(trimmed);
  });
  resetSimulation();
}

function syncUiFromState() {
  const state = store.getState();
  els.stepSize.value = String(state.stepSize);
  els.seed.value = state.seedText;

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
  }, (key, value) => {
    store.setState((draft) => {
      draft.single[key] = value;
    });
    resetSimulation();
  });

  renderBiasControls(
    els.biasOptionsA,
    state.two.deviceA,
    {
      coinProbabilities: state.two.coinProbabilitiesA,
      dieProbabilities: state.two.dieProbabilitiesA,
      spinnerSkew: state.two.spinnerSkewA,
    },
    (key, value) => {
      store.setState((draft) => {
        draft.two[`${key}A`] = value;
      });
      resetSimulation();
    },
  );

  updateTwoControlsForRelationship();
}

function updateTwoControlsForRelationship() {
  const state = store.getState();
  const complementOption = els.relationship.querySelector('option[value="complement"]');
  const canComplement = state.two.deviceA === 'coin';
  if (complementOption) complementOption.disabled = !canComplement;

  let changed = false;
  if (state.two.relationship === 'complement' && !canComplement) {
    store.setState((draft) => {
      draft.two.relationship = 'copy';
    });
    els.relationship.value = 'copy';
    changed = true;
  }

  const linked = state.two.relationship === 'copy' || state.two.relationship === 'complement';

  if (linked) {
    const currentState = store.getState();
    if (currentState.two.deviceB !== currentState.two.deviceA) {
      store.setState((draft) => {
        draft.two.deviceB = draft.two.deviceA;
      });
      changed = true;
    }

    // Clean up device B sliders when linked
    for (const slider of sliderInstances.two.b.values()) {
      if (slider && typeof slider.destroy === 'function') {
        slider.destroy();
      }
    }
    sliderInstances.two.b.clear();

    els.biasOptionsB.innerHTML = '<p class="pl-muted body-xsmall">B is linked to A.</p>';
    return;
  }

  renderBiasControls(
    els.biasOptionsB,
    state.two.deviceB,
    {
      coinProbabilities: state.two.coinProbabilitiesB,
      dieProbabilities: state.two.dieProbabilitiesB,
      spinnerSkew: state.two.spinnerSkewB,
    },
    (key, value) => {
      store.setState((draft) => {
        draft.two[`${key}B`] = value;
      });
      resetSimulation();
    },
  );
}

function initEventListeners() {
  els.spinnerSectors.addEventListener('change', () => {
    const clamped = clamp(parseInt(els.spinnerSectors.value, 10), 2, 12);
    store.setState((draft) => {
      draft.single.spinnerSectors = clamped;
    });
    resetSimulation();
  });

  els.relationship.addEventListener('change', () => {
    store.setState((draft) => {
      draft.two.relationship = els.relationship.value;
    });
    updateTwoControlsForRelationship();
    resetSimulation();
  });

  els.stepSize.addEventListener('change', () => {
    const clamped = clamp(Math.floor(safeNumber(els.stepSize.value, 100)), 1, 1_000_000);
    store.setState((draft) => {
      draft.stepSize = clamped;
    });
    els.stepSize.value = String(clamped);
    updateControls();
  });

  // Handle button group selection
  document.querySelectorAll('.pl-button-group .button').forEach((button) => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.pl-button-group .button').forEach((btn) => {
        btn.classList.remove('active');
      });
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
    runner.runTrials(state.stepSize, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
  });

  els.reset.addEventListener('click', resetSimulation);

  els.auto.addEventListener('click', () => {
    const state = store.getState();
    if (state.running.auto) {
      runner.stopRunning();
    } else {
      const stateSlice = state.mode === 'two' ? state.two : state.single;
      runner.startAuto(state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng, state.speed);
    }
  });

  // Apply seed automatically on change
  let seedTimeout = null;
  els.seed.addEventListener('input', () => {
    // Debounce to avoid resetting simulation too frequently during typing
    clearTimeout(seedTimeout);
    seedTimeout = setTimeout(() => {
      applySeed(els.seed.value);
    }, 500);
  });

  els.seed.addEventListener('change', () => {
    clearTimeout(seedTimeout);
    applySeed(els.seed.value);
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
    applySectionVisibility(currentState);
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
    applySectionVisibility(updatedState);
  });

  window.addEventListener('resize', () => {
    const state = store.getState();
    render(els, state);
    applySectionVisibility(state);
  });
}

async function init() {
  // Initialize help modal and WebSocket (non-blocking)
  initializeHelpModal(Modal, setStatus);
  initializeWebSocket();

  // Initialize probability lab
  if (!els.singleConfig) return;

  setStatus('Loading...');

  // Load configuration from config.json
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error('Failed to load config:', error);
    setStatus('Failed to load config');
    return;
  }

  // Apply config to store state
  store.setState((draft) => {
    draft.mode = config.mode;
    if (config.mode === 'single') {
      draft.single.device = config.device;
    } else {
      draft.two.deviceA = config.deviceA;
      draft.two.deviceB = config.deviceB;
    }
    if (config.sections) {
      draft.sections = { ...draft.sections, ...config.sections };
    }
    draft.rng = createRngFromSeed(draft.seedText);
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
            runner.startAuto(newState.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, newState.rng, newState.speed);
          }, 0);
        }
      },
    });
  }

  resetSingleSimulation();
  resetTwoSimulation();

  initEventListeners();
  updateControls();
  applySectionVisibility(store.getState());

  // Defer initial render until after layout is complete
  requestAnimationFrame(() => {
    render(els, store.getState());
    setStatus('Ready');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
