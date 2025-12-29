import { describe, it, expect } from 'vitest';
import { buildDeviceDefinition } from '../../../client/src/probability-lab/domain/devices.js';

describe('buildDeviceDefinition', () => {
  describe('coin device', () => {
    it('returns correct structure', () => {
      const def = buildDeviceDefinition({ device: 'coin' });
      expect(def).toHaveProperty('device', 'coin');
      expect(def).toHaveProperty('labels');
      expect(def).toHaveProperty('probabilities');
      expect(def).toHaveProperty('cdf');
    });

    it('probabilities sum to ~1', () => {
      const def = buildDeviceDefinition({ device: 'coin' });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('labels are ["Heads", "Tails"]', () => {
      const def = buildDeviceDefinition({ device: 'coin' });
      expect(def.labels).toEqual(['Heads', 'Tails']);
    });

    it('default probabilities are equal (0.5 each)', () => {
      const def = buildDeviceDefinition({ device: 'coin' });
      expect(def.probabilities[0]).toBeCloseTo(0.5, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.5, 10);
    });

    it('custom coinProbabilities array works', () => {
      const customProbs = [0.7, 0.3];
      const def = buildDeviceDefinition({ device: 'coin', coinProbabilities: customProbs });
      expect(def.probabilities[0]).toBeCloseTo(0.7, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.3, 10);
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('coinProbabilities array is normalized', () => {
      const unnormalized = [0.8, 0.4]; // sums to 1.2
      const def = buildDeviceDefinition({ device: 'coin', coinProbabilities: unnormalized });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
      // Should maintain relative ratios after normalization
      expect(def.probabilities[0] / def.probabilities[1]).toBeCloseTo(2.0, 10);
    });

    it('probabilities are clamped to valid range (0.01 to 0.99)', () => {
      const extremeProbs = [0.001, 0.999]; // one too low
      const def = buildDeviceDefinition({ device: 'coin', coinProbabilities: extremeProbs });
      def.probabilities.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(0.01);
        expect(p).toBeLessThanOrEqual(0.99);
      });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('die device', () => {
    it('returns correct structure', () => {
      const def = buildDeviceDefinition({ device: 'die' });
      expect(def).toHaveProperty('device', 'die');
      expect(def).toHaveProperty('labels');
      expect(def).toHaveProperty('probabilities');
      expect(def).toHaveProperty('cdf');
    });

    it('probabilities sum to ~1', () => {
      const def = buildDeviceDefinition({ device: 'die' });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('labels are ["1", "2", "3", "4", "5", "6"]', () => {
      const def = buildDeviceDefinition({ device: 'die' });
      expect(def.labels).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('default probabilities are equal (1/6 each)', () => {
      const def = buildDeviceDefinition({ device: 'die' });
      const expected = 1 / 6;
      def.probabilities.forEach(p => {
        expect(p).toBeCloseTo(expected, 10);
      });
    });

    it('custom dieProbabilities array works', () => {
      const customProbs = [0.1, 0.15, 0.2, 0.15, 0.2, 0.2];
      const def = buildDeviceDefinition({ device: 'die', dieProbabilities: customProbs });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
      // Probabilities should be normalized but maintain relative ratios
      expect(def.probabilities.length).toBe(6);
    });

    it('dieProbabilities array is normalized', () => {
      const unnormalized = [0.2, 0.2, 0.2, 0.2, 0.2, 0.3]; // sums to 1.3
      const def = buildDeviceDefinition({ device: 'die', dieProbabilities: unnormalized });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('probabilities are clamped to valid range', () => {
      const extremeProbs = [0.001, 0.001, 0.001, 0.001, 0.001, 0.995]; // some too low, one too high
      const def = buildDeviceDefinition({ device: 'die', dieProbabilities: extremeProbs });
      def.probabilities.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(0.01);
        expect(p).toBeLessThanOrEqual(0.8);
      });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('spinner device', () => {
    it('returns correct structure', () => {
      const def = buildDeviceDefinition({ device: 'spinner' });
      expect(def).toHaveProperty('device', 'spinner');
      expect(def).toHaveProperty('labels');
      expect(def).toHaveProperty('probabilities');
      expect(def).toHaveProperty('cdf');
      expect(def).toHaveProperty('sectors');
      expect(def).toHaveProperty('skew');
    });

    it('probabilities sum to ~1', () => {
      const def = buildDeviceDefinition({ device: 'spinner' });
      const sum = def.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('labels match sector count', () => {
      const def8 = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 8 });
      expect(def8.labels.length).toBe(8);
      expect(def8.labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);

      const def5 = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 5 });
      expect(def5.labels.length).toBe(5);
      expect(def5.labels).toEqual(['1', '2', '3', '4', '5']);
    });

    it('sectors clamped to min 2', () => {
      const def = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 1 });
      expect(def.sectors).toBe(2);
      expect(def.labels.length).toBe(2);
    });

    it('sectors clamped to max 12', () => {
      const def = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 20 });
      expect(def.sectors).toBe(12);
      expect(def.labels.length).toBe(12);
    });

    it('skew clamped to range [-1, 1]', () => {
      const def1 = buildDeviceDefinition({ device: 'spinner', spinnerSkew: -2 });
      expect(def1.skew).toBe(-1);

      const def2 = buildDeviceDefinition({ device: 'spinner', spinnerSkew: 2 });
      expect(def2.skew).toBe(1);
    });

    it('skew affects distribution (positive skew favors higher sectors)', () => {
      const defNeutral = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 5, spinnerSkew: 0 });
      const defPositive = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 5, spinnerSkew: 1 });

      // With positive skew, later sectors should have higher probabilities
      expect(defPositive.probabilities[4]).toBeGreaterThan(defNeutral.probabilities[4]);
      expect(defPositive.probabilities[0]).toBeLessThan(defNeutral.probabilities[0]);
    });

    it('skew affects distribution (negative skew favors lower sectors)', () => {
      const defNeutral = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 5, spinnerSkew: 0 });
      const defNegative = buildDeviceDefinition({ device: 'spinner', spinnerSectors: 5, spinnerSkew: -1 });

      // With negative skew, earlier sectors should have higher probabilities
      expect(defNegative.probabilities[0]).toBeGreaterThan(defNeutral.probabilities[0]);
      expect(defNegative.probabilities[4]).toBeLessThan(defNeutral.probabilities[4]);
    });

    it('default sectors is 8', () => {
      const def = buildDeviceDefinition({ device: 'spinner' });
      expect(def.sectors).toBe(8);
      expect(def.labels.length).toBe(8);
    });

    it('default skew is 0', () => {
      const def = buildDeviceDefinition({ device: 'spinner' });
      expect(def.skew).toBe(0);
    });
  });
});

