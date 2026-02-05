const LOG_ENDPOINT = '/log';
const DEFAULT_SECTIONS = {
  barChart: false,
  convergence: false,
  frequencyTable: false,
  jointDistribution: false,
  twoWayTable: false,
};

function normalizeSections(sections) {
  return { ...DEFAULT_SECTIONS, ...(sections || {}) };
}

function cloneArray(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  return value.slice();
}

function getSelectedOutcomes(def, selectedSet) {
  if (!(selectedSet instanceof Set)) return [];
  if (def && Array.isArray(def.labels)) {
    return def.labels.filter((label) => selectedSet.has(label));
  }
  return Array.from(selectedSet).map((label) => String(label));
}

function buildConfigSnapshot(state) {
  const sections = normalizeSections(state.sections);
  if (state.mode === 'two') {
    return {
      mode: 'two',
      deviceA: state.two.deviceA ?? null,
      deviceB: state.two.deviceB ?? null,
      sections,
    };
  }
  return {
    mode: 'single',
    device: state.single.device ?? null,
    sections,
  };
}

function buildSettingsSnapshot(state) {
  const sections = normalizeSections(state.sections);
  if (state.mode === 'two') {
    return {
      mode: 'two',
      deviceA: state.two.deviceA ?? null,
      deviceB: state.two.deviceB ?? null,
      sections,
      relationship: state.two.relationship ?? null,
      spinnerSectorsA: state.two.spinnerSectorsA ?? null,
      spinnerSectorsB: state.two.spinnerSectorsB ?? null,
      biasA: {
        coinProbabilities: cloneArray(state.two.coinProbabilitiesA),
        dieProbabilities: cloneArray(state.two.dieProbabilitiesA),
        spinnerSkew: state.two.spinnerSkewA ?? 0,
      },
      biasB: {
        coinProbabilities: cloneArray(state.two.coinProbabilitiesB),
        dieProbabilities: cloneArray(state.two.dieProbabilitiesB),
        spinnerSkew: state.two.spinnerSkewB ?? 0,
      },
    };
  }

  const def = state.single.definition;
  return {
    mode: 'single',
    device: state.single.device ?? null,
    sections,
    spinnerSectors: state.single.spinnerSectors ?? null,
    bias: {
      coinProbabilities: cloneArray(state.single.coinProbabilities),
      dieProbabilities: cloneArray(state.single.dieProbabilities),
      spinnerSkew: state.single.spinnerSkew ?? 0,
    },
    eventSelected: getSelectedOutcomes(def, state.single.eventSelected),
  };
}

function diffKeys(previous, next) {
  if (!previous) return Object.keys(next);
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed = [];
  for (const key of keys) {
    const prevValue = previous[key];
    const nextValue = next[key];
    if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      changed.push(key);
    }
  }
  return changed;
}

function postEvent(event) {
  if (!event || typeof event !== 'object') return;
  const payload = JSON.stringify(event, (key, value) => {
    if (typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)) {
      return Math.round(value * 1000) / 1000;
    }
    return value;
  });
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function getTrials(state) {
  return state.mode === 'two' ? state.two.trials : state.single.trials;
}

function getNextMilestone(current) {
  if (!Number.isFinite(current) || current < 1) return 1;
  const power = Math.floor(Math.log10(current));
  const scale = Math.pow(10, power);
  const normalized = current / scale;
  if (normalized <= 1) return 2 * scale;
  if (normalized <= 2) return 5 * scale;
  return 10 * scale;
}

function buildSingleStatus(state) {
  const def = state.single.definition;
  if (!def) return null;

  const trials = state.single.trials;
  const counts = Array.isArray(state.single.counts) ? state.single.counts : [];
  const selectedOutcomes = getSelectedOutcomes(def, state.single.eventSelected);
  const selectedIndices = new Set(
    selectedOutcomes.map((label) => def.labels.indexOf(label)).filter((idx) => idx >= 0),
  );

  const pTheoretical = Array.from(selectedIndices)
    .reduce((acc, idx) => acc + (def.probabilities[idx] ?? 0), 0);

  const selectedCount = Array.from(selectedIndices)
    .reduce((acc, idx) => acc + (counts[idx] ?? 0), 0);

  const pEstimated = trials > 0 ? selectedCount / trials : null;
  const lastOutcome = state.single.lastIndex === null ? null : (def.labels[state.single.lastIndex] ?? null);

  const data = {
    mode: 'single',
    trials,
    lastOutcome,
    event: {
      selectedOutcomes,
      pEstimated,
      pTheoretical,
    },
  };

  const sections = normalizeSections(state.sections);
  if (sections.barChart) {
    data.barChart = {
      rows: def.labels.map((label, i) => {
        const count = counts[i] ?? 0;
        return {
          outcome: label,
          count,
          relFreq: trials > 0 ? count / trials : 0,
        };
      }),
    };
  }

  if (sections.convergence) {
    data.convergence = {
      trials,
      pEstimated,
      pTheoretical,
    };
  }

  if (sections.frequencyTable) {
    data.frequencyTable = {
      rows: def.labels.map((label, i) => {
        const count = counts[i] ?? 0;
        const relFreq = trials > 0 ? count / trials : null;
        const pTheory = def.probabilities[i] ?? 0;
        return {
          outcome: label,
          pTheory,
          count,
          relFreq,
          delta: relFreq === null ? null : relFreq - pTheory,
          selected: selectedIndices.has(i),
        };
      }),
    };
  }

  return data;
}

function buildTwoStatus(state) {
  const defA = state.two.definitionA;
  const defB = state.two.definitionB;
  if (!defA || !defB) return null;

  const trials = state.two.trials;
  const countsA = Array.isArray(state.two.countsA) ? state.two.countsA : [];
  const countsB = Array.isArray(state.two.countsB) ? state.two.countsB : [];
  const joint = Array.isArray(state.two.joint) ? state.two.joint : [];

  let lastOutcome = null;
  if (state.two.lastA !== null && state.two.lastB !== null) {
    lastOutcome = {
      a: defA.labels[state.two.lastA] ?? null,
      b: defB.labels[state.two.lastB] ?? null,
    };
  }

  const data = {
    mode: 'two',
    trials,
    lastOutcome,
    relationship: state.two.relationship ?? null,
  };

  if (state.two.selectedCell) {
    const r = state.two.selectedCell.r;
    const c = state.two.selectedCell.c;
    const selectedCell = { r, c };
    if (trials > 0) {
      const jointCount = joint[r]?.[c] ?? 0;
      const pJoint = jointCount / trials;
      const pA = (countsA[r] ?? 0) / trials;
      const pB = (countsB[c] ?? 0) / trials;
      selectedCell.pJoint = pJoint;
      selectedCell.pA = pA;
      selectedCell.pB = pB;
      selectedCell.pAGivenB = pB > 0 ? pJoint / pB : null;
      selectedCell.pBGivenA = pA > 0 ? pJoint / pA : null;
    }
    data.selectedCell = selectedCell;
  }

  const sections = normalizeSections(state.sections);
  if (sections.jointDistribution) {
    data.jointDistribution = {
      labelsA: cloneArray(defA.labels),
      labelsB: cloneArray(defB.labels),
      matrixRel: joint.map((row) => row.map((count) => (trials > 0 ? count / trials : 0))),
    };
  }

  if (sections.twoWayTable) {
    data.twoWayTable = {
      labelsA: cloneArray(defA.labels),
      labelsB: cloneArray(defB.labels),
      jointCounts: joint.map((row) => cloneArray(row)),
    };
  }

  return data;
}

function buildStatusPayload(state) {
  if (state.mode === 'two') return buildTwoStatus(state);
  return buildSingleStatus(state);
}

export function createActivityLogger() {
  let appStartLogged = false;
  let nextTrialsToLog = 1;
  let lastTrials = 0;
  let lastSettingsSnapshot = null;

  function logAppStart(state) {
    if (appStartLogged) return;
    appStartLogged = true;
    postEvent({ type: 'app_start', data: { config: buildConfigSnapshot(state) } });
    lastSettingsSnapshot = buildSettingsSnapshot(state);
    lastTrials = getTrials(state);
    nextTrialsToLog = 1;
  }

  function logSettingsChange(state, changedKeys) {
    const snapshot = buildSettingsSnapshot(state);
    const changes = Array.isArray(changedKeys) ? changedKeys : diffKeys(lastSettingsSnapshot, snapshot);
    if (changes.length === 0) {
      lastSettingsSnapshot = snapshot;
      return;
    }
    postEvent({ type: 'settings_change', data: { changed: changes, settings: snapshot } });
    lastSettingsSnapshot = snapshot;
  }

  function logRunReset(state, reason = 'unknown') {
    nextTrialsToLog = 1;
    lastTrials = getTrials(state);
    const snapshot = buildSettingsSnapshot(state);
    postEvent({ type: 'run_reset', data: { reason, settings: snapshot } });
    lastSettingsSnapshot = snapshot;
  }

  function maybeLogStatus(state) {
    const trials = getTrials(state);
    if (trials < lastTrials) {
      nextTrialsToLog = 1;
      lastTrials = trials;
      return;
    }

    if (trials < nextTrialsToLog) {
      lastTrials = trials;
      return;
    }

    const payload = buildStatusPayload(state);
    if (!payload) return;
    postEvent({ type: 'status', data: payload });

    let next = nextTrialsToLog;
    while (next <= trials) {
      next = getNextMilestone(next);
    }
    nextTrialsToLog = next;
    lastTrials = trials;
  }

  return {
    logAppStart,
    logSettingsChange,
    logRunReset,
    maybeLogStatus,
  };
}
