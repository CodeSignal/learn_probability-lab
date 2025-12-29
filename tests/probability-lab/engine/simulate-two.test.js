import { describe, it, expect, beforeEach } from 'vitest';
import simulateTwoTrials from '../../../client/src/probability-lab/engine/simulate-two.js';
import { buildCdf } from '../../../client/src/probability-lab/domain/cdf.js';

describe('simulateTwoTrials', () => {
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
      definitionA: {
        cdf: buildCdf([0.5, 0.5]), // coin: [Heads, Tails]
        device: 'coin',
      },
      definitionB: {
        cdf: buildCdf([0.5, 0.5]), // coin: [Heads, Tails]
      },
      relationship: 'independent',
      countsA: [0, 0],
      countsB: [0, 0],
      joint: [
        [0, 0],
        [0, 0],
      ],
      trials: 0,
      lastA: null,
      lastB: null,
    };
  });

  describe('independent relationship', () => {
    it('A and B are sampled independently', () => {
      stateSlice.relationship = 'independent';
      simulateTwoTrials(stateSlice, mockRng, 10);

      // Both should have counts
      expect(stateSlice.countsA.reduce((a, b) => a + b, 0)).toBe(10);
      expect(stateSlice.countsB.reduce((a, b) => a + b, 0)).toBe(10);

      // Joint counts should reflect independent sampling
      const totalJoint = stateSlice.joint.flat().reduce((a, b) => a + b, 0);
      expect(totalJoint).toBe(10);
    });

    it('updates countsA, countsB, joint correctly', () => {
      stateSlice.relationship = 'independent';
      simulateTwoTrials(stateSlice, mockRng, 5);

      expect(stateSlice.countsA.reduce((a, b) => a + b, 0)).toBe(5);
      expect(stateSlice.countsB.reduce((a, b) => a + b, 0)).toBe(5);

      const totalJoint = stateSlice.joint.flat().reduce((a, b) => a + b, 0);
      expect(totalJoint).toBe(5);
    });

    it('updates trials, lastA, lastB', () => {
      stateSlice.relationship = 'independent';
      simulateTwoTrials(stateSlice, mockRng, 3);

      expect(stateSlice.trials).toBe(3);
      expect(stateSlice.lastA).not.toBeNull();
      expect(stateSlice.lastB).not.toBeNull();
      expect(stateSlice.lastA).toBeGreaterThanOrEqual(0);
      expect(stateSlice.lastA).toBeLessThan(2);
      expect(stateSlice.lastB).toBeGreaterThanOrEqual(0);
      expect(stateSlice.lastB).toBeLessThan(2);
    });
  });

  describe('dependent relationship', () => {
    it('does not crash when relationship is dependent', () => {
      stateSlice.relationship = 'dependent';
      simulateTwoTrials(stateSlice, mockRng, 10);

      // Verify basic functionality - should update counts and trials
      expect(stateSlice.trials).toBe(10);
      expect(stateSlice.countsA.reduce((a, b) => a + b, 0)).toBe(10);
      expect(stateSlice.countsB.reduce((a, b) => a + b, 0)).toBe(10);
      expect(stateSlice.lastA).not.toBeNull();
      expect(stateSlice.lastB).not.toBeNull();
    });
  });

  it('handles zero count (no changes)', () => {
    const initialState = { ...stateSlice };
    simulateTwoTrials(stateSlice, mockRng, 0);
    expect(stateSlice.trials).toBe(initialState.trials);
    expect(stateSlice.countsA).toEqual(initialState.countsA);
    expect(stateSlice.countsB).toEqual(initialState.countsB);
  });

  it('handles missing definitionA (no-op)', () => {
    stateSlice.definitionA = null;
    const initialState = { ...stateSlice };
    simulateTwoTrials(stateSlice, mockRng, 10);
    expect(stateSlice).toEqual(initialState);
  });

  it('handles missing definitionB (no-op)', () => {
    stateSlice.definitionB = null;
    const initialState = { ...stateSlice };
    simulateTwoTrials(stateSlice, mockRng, 10);
    expect(stateSlice).toEqual(initialState);
  });

  it('maintains correct state across multiple calls', () => {
    simulateTwoTrials(stateSlice, mockRng, 3);
    const trialsAfterFirst = stateSlice.trials;
    const countsASumAfterFirst = stateSlice.countsA.reduce((a, b) => a + b, 0);

    simulateTwoTrials(stateSlice, mockRng, 2);
    expect(stateSlice.trials).toBe(trialsAfterFirst + 2);
    expect(stateSlice.countsA.reduce((a, b) => a + b, 0)).toBe(countsASumAfterFirst + 2);
  });

  it('joint matrix dimensions match definition sizes', () => {
    stateSlice.definitionA.cdf = buildCdf([0.33, 0.33, 0.34]);
    stateSlice.definitionB.cdf = buildCdf([0.5, 0.5]);
    stateSlice.countsA = [0, 0, 0];
    stateSlice.countsB = [0, 0];
    stateSlice.joint = [
      [0, 0],
      [0, 0],
      [0, 0],
    ];

    simulateTwoTrials(stateSlice, mockRng, 5);

    expect(stateSlice.joint.length).toBe(3); // matches definitionA size
    expect(stateSlice.joint[0].length).toBe(2); // matches definitionB size
  });
});

