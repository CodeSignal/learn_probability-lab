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
import { getCssVar } from './src/probability-lab/ui/charts/colors.js';
import render from './src/probability-lab/ui/render.js';
import { createStore } from './src/probability-lab/state/store.js';

function $(id) {
  return document.getElementById(id);
}

const els = {
  status: $('status'),

  singleConfig: $('pl-single-config'),
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
  plus1: $('pl-plus-1'),
  plus10: $('pl-plus-10'),
  plus100: $('pl-plus-100'),
  plus1000: $('pl-plus-1000'),
  auto: $('pl-auto'),
  speed: $('pl-speed'),

  seed: $('pl-seed'),
  applySeed: $('pl-apply-seed'),
  randomizeSeed: $('pl-randomize-seed'),

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
};

const store = createStore({
  rng: Math.random,
  seedText: '',

  mode: 'single',
  speed: 6,
  stepSize: 100,

  running: {
    cancel: false,
    auto: false,
    rafId: null,
  },

  single: {
    device: 'coin',
    spinnerSectors: 8,
    coinPHeads: 0.5,
    diePSix: 1 / 6,
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
    coinPHeadsA: 0.5,
    diePSixA: 1 / 6,
    spinnerSkewA: 0,

    deviceB: 'coin',
    spinnerSectorsB: 8,
    coinPHeadsB: 0.5,
    diePSixB: 1 / 6,
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
  onTick: () => render(els, store.getState()),
  onDone: updateControls,
  onStop: updateControls,
});

function resetSingleSimulation() {
  const state = store.getState();
  const def = buildDeviceDefinition({
    device: state.single.device,
    spinnerSectors: state.single.spinnerSectors,
    coinPHeads: state.single.coinPHeads,
    diePSix: state.single.diePSix,
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
    coinPHeads: state.two.coinPHeadsA,
    diePSix: state.two.diePSixA,
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
      coinPHeads: state.two.coinPHeadsB,
      diePSix: state.two.diePSixB,
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
  });

  const state = store.getState();
  if (state.mode === 'two') resetTwoSimulation();
  else resetSingleSimulation();

  render(els, store.getState());
}

function updateControls() {
  const state = store.getState();
  const autoRunning = state.running.auto;
  const disableInputs = state.running.rafId !== null && state.running.auto;

  els.auto.textContent = autoRunning ? 'Stop auto' : 'Start auto';
  els.step.disabled = autoRunning;

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

  for (const container of [els.biasOptions, els.biasOptionsA, els.biasOptionsB]) {
    if (!container) continue;
    for (const input of container.querySelectorAll('input, select, button, textarea')) {
      input.disabled = disableInputs;
    }
  }

  if (disableInputs) {
    els.plus1.disabled = true;
    els.plus10.disabled = true;
    els.plus100.disabled = true;
    els.plus1000.disabled = true;
    els.reset.disabled = true;
  } else {
    els.plus1.disabled = false;
    els.plus10.disabled = false;
    els.plus100.disabled = false;
    els.plus1000.disabled = false;
    els.reset.disabled = false;
  }
}

function renderBiasControls(container, device, values, onChange) {
  container.innerHTML = '';

  function addRangeRow({ label, min, max, step, value, formatter, key }) {
    const row = document.createElement('label');
    row.className = 'row';

    const name = document.createElement('span');
    name.textContent = label;
    name.style.minWidth = '88px';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);

    const out = document.createElement('span');
    out.textContent = formatter(value);
    out.style.minWidth = '62px';
    out.style.textAlign = 'right';
    out.style.fontVariantNumeric = 'tabular-nums';
    out.style.color = getCssVar('--Colors-Text-Body-Medium', '#66718F');

    input.addEventListener('input', () => {
      const next = safeNumber(input.value, value);
      out.textContent = formatter(next);
    });

    input.addEventListener('change', () => {
      const next = safeNumber(input.value, value);
      out.textContent = formatter(next);
      onChange(key, next);
    });

    row.append(name, input, out);
    container.append(row);
  }

  if (device === 'coin') {
    addRangeRow({
      label: 'P(Heads)',
      min: 0.01,
      max: 0.99,
      step: 0.01,
      value: values.coinPHeads,
      formatter: (v) => formatProbability(v, 0),
      key: 'coinPHeads',
    });
    return;
  }

  if (device === 'die') {
    addRangeRow({
      label: 'P(6)',
      min: 1 / 6,
      max: 0.8,
      step: 0.01,
      value: values.diePSix,
      formatter: (v) => formatProbability(v, 0),
      key: 'diePSix',
    });
    return;
  }

  addRangeRow({
    label: 'Skew',
    min: -1,
    max: 1,
    step: 0.01,
    value: values.spinnerSkew,
    formatter: (v) => v.toFixed(2),
    key: 'spinnerSkew',
  });
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
    label.className = 'pl-event-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedLabels.has(def.labels[i]);

    const title = document.createElement('span');
    title.textContent = def.labels[i];

    checkbox.addEventListener('change', () => {
      const currentState = store.getState();
      const next = currentState.single.eventSelected instanceof Set ? new Set(currentState.single.eventSelected) : new Set();
      if (checkbox.checked) next.add(def.labels[i]);
      else next.delete(def.labels[i]);
      store.setState((draft) => {
        draft.single.eventSelected = next;
      });
      render(els, store.getState());
    });

    label.append(checkbox, title);

    const p = document.createElement('div');
    p.className = 'pl-event-prob';
    p.textContent = formatProbability(def.probabilities[i], 1);

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
  els.speed.value = String(state.speed);
  els.stepSize.value = String(state.stepSize);
  els.seed.value = state.seedText;

  els.spinnerSectors.value = String(state.single.spinnerSectors);

  els.relationship.value = state.two.relationship;

  renderBiasControls(els.biasOptions, state.single.device, state.single, (key, value) => {
    store.setState((draft) => {
      draft.single[key] = value;
    });
    resetSimulation();
  });

  renderBiasControls(
    els.biasOptionsA,
    state.two.deviceA,
    {
      coinPHeads: state.two.coinPHeadsA,
      diePSix: state.two.diePSixA,
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
    els.biasOptionsB.innerHTML = '<p class="pl-muted">B is linked to A.</p>';
    return;
  }

  renderBiasControls(
    els.biasOptionsB,
    state.two.deviceB,
    {
      coinPHeads: state.two.coinPHeadsB,
      diePSix: state.two.diePSixB,
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
    const state = store.getState();
    const clamped = clamp(Math.floor(safeNumber(els.stepSize.value, 100)), 1, 1_000_000);
    store.setState((draft) => {
      draft.stepSize = clamped;
    });
    els.stepSize.value = String(clamped);
  });

  els.speed.addEventListener('input', () => {
    const clamped = clamp(Math.floor(safeNumber(els.speed.value, 6)), 1, 10);
    store.setState((draft) => {
      draft.speed = clamped;
    });
  });

  els.step.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(state.stepSize, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
  });
  els.plus1.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(1, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
  });
  els.plus10.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(10, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
  });
  els.plus100.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(100, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
  });
  els.plus1000.addEventListener('click', () => {
    const state = store.getState();
    const stateSlice = state.mode === 'two' ? state.two : state.single;
    runner.runTrials(1000, state.mode, simulateSingleTrials, simulateTwoTrials, stateSlice, state.rng);
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

  els.applySeed.addEventListener('click', () => applySeed(els.seed.value));
  els.seed.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applySeed(els.seed.value);
  });

  els.randomizeSeed.addEventListener('click', () => {
    const next = String(Math.floor(Math.random() * 1_000_000));
    els.seed.value = next;
    applySeed(next);
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
    render(els, store.getState());
  });

  els.heatmap.addEventListener('click', (event) => {
    const state = store.getState();
    const defA = state.two.definitionA;
    const defB = state.two.definitionB;
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
    render(els, store.getState());
  });

  window.addEventListener('resize', () => {
    render(els, store.getState());
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
    draft.rng = createRngFromSeed(draft.seedText);
  });
  syncUiFromState();

  resetSingleSimulation();
  resetTwoSimulation();

  initEventListeners();
  updateControls();
  render(els, store.getState());

  setStatus('Ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
