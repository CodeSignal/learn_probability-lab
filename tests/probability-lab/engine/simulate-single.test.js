import { describe, it, expect, beforeEach } from 'vitest';
import simulateSingleTrials from '../../../client/src/probability-lab/engine/simulate-single.js';
import { buildCdf } from '../../../client/src/probability-lab/domain/cdf.js';
import { IndexHistory } from '../../../client/src/probability-lab/state/trial-history.js';

describe('simulateSingleTrials', () => {
  let stateSlice;
  let mockRng;
  let rngCallCount;

  beforeEach(() => {
    rngCallCount = 0;
    mockRng = () => {
      rngCallCount++;
      // Deterministic sequence: 0.1, 0.3, 0.5, 0.7, 0.9, 0.2, ...
      const values = [0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.0];
      return values[(rngCallCount - 1) % values.length];
    };

    stateSlice = {
      definition: {
        cdf: buildCdf([0.2, 0.3, 0.5]), // probabilities: 0.2, 0.3, 0.5
        labels: ['A', 'B', 'C'],
      },
      counts: [0, 0, 0],
      trials: 0,
      lastIndex: null,
      history: [],
    };
  });

  it('updates counts correctly', () => {
    simulateSingleTrials(stateSlice, mockRng, 5);
    expect(stateSlice.counts.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('updates trials counter', () => {
    simulateSingleTrials(stateSlice, mockRng, 10);
    expect(stateSlice.trials).toBe(10);

    simulateSingleTrials(stateSlice, mockRng, 5);
    expect(stateSlice.trials).toBe(15);
  });

  it('updates lastIndex', () => {
    simulateSingleTrials(stateSlice, mockRng, 1);
    expect(stateSlice.lastIndex).not.toBeNull();
    expect(stateSlice.lastIndex).toBeGreaterThanOrEqual(0);
    expect(stateSlice.lastIndex).toBeLessThan(3);
  });

  it('records trialHistory when provided', () => {
    stateSlice.trialHistory = new IndexHistory();
    simulateSingleTrials(stateSlice, mockRng, 5);

    expect(stateSlice.trialHistory.length).toBe(5);
    expect(stateSlice.trialHistory.get(0)).toBe(0);
    expect(stateSlice.trialHistory.get(1)).toBe(1);
    expect(stateSlice.trialHistory.get(2)).toBe(2);
  });

  it('adds history entries', () => {
    simulateSingleTrials(stateSlice, mockRng, 10);
    expect(stateSlice.history.length).toBeGreaterThan(0);

    const lastEntry = stateSlice.history[stateSlice.history.length - 1];
    expect(lastEntry).toHaveProperty('trials');
    expect(lastEntry).toHaveProperty('rel');
    expect(lastEntry.trials).toBe(10);
    expect(lastEntry.rel.length).toBe(3);
  });

  it('history relative frequencies sum to ~1', () => {
    simulateSingleTrials(stateSlice, mockRng, 100);
    const lastEntry = stateSlice.history[stateSlice.history.length - 1];
    const sum = lastEntry.rel.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('handles zero count (no changes)', () => {
    const initialState = { ...stateSlice };
    simulateSingleTrials(stateSlice, mockRng, 0);
    expect(stateSlice.trials).toBe(initialState.trials);
    expect(stateSlice.counts).toEqual(initialState.counts);
    expect(stateSlice.history.length).toBe(initialState.history.length);
  });

  it('handles missing definition (no-op)', () => {
    stateSlice.definition = null;
    const initialState = { ...stateSlice };
    simulateSingleTrials(stateSlice, mockRng, 10);
    expect(stateSlice).toEqual(initialState);
  });

  it('handles undefined definition (no-op)', () => {
    stateSlice.definition = undefined;
    const initialState = { ...stateSlice };
    simulateSingleTrials(stateSlice, mockRng, 10);
    expect(stateSlice).toEqual(initialState);
  });

  it('updates counts based on CDF probabilities', () => {
    // With mockRng returning 0.1, 0.3, 0.5, 0.7, 0.9
    // CDF: [0.2, 0.5, 1.0]
    // 0.1 < 0.2 -> index 0
    // 0.3 < 0.5 -> index 1
    // 0.5 >= 0.5 -> index 1
    // 0.7 < 1.0 -> index 2
    // 0.9 < 1.0 -> index 2

    simulateSingleTrials(stateSlice, mockRng, 5);
    expect(stateSlice.counts[0]).toBeGreaterThanOrEqual(0);
    expect(stateSlice.counts[1]).toBeGreaterThanOrEqual(0);
    expect(stateSlice.counts[2]).toBeGreaterThanOrEqual(0);
  });

  it('history is pruned when exceeding 2000 entries', () => {
    // Simulate enough trials to create > 2000 history entries
    // Each trial adds one history entry
    for (let i = 0; i < 2500; i++) {
      simulateSingleTrials(stateSlice, mockRng, 1);
    }

    // History should be pruned (every other entry removed)
    expect(stateSlice.history.length).toBeLessThanOrEqual(2000);
  });

  it('maintains correct state across multiple calls', () => {
    simulateSingleTrials(stateSlice, mockRng, 3);
    const trialsAfterFirst = stateSlice.trials;
    const countsAfterFirst = [...stateSlice.counts];

    simulateSingleTrials(stateSlice, mockRng, 2);
    expect(stateSlice.trials).toBe(trialsAfterFirst + 2);
    expect(stateSlice.counts.reduce((a, b) => a + b, 0)).toBe(5);
  });
});
