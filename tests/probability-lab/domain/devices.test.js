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

    it('pHeads clamped correctly (default 0.5)', () => {
      const def = buildDeviceDefinition({ device: 'coin' });
      expect(def.probabilities[0]).toBeCloseTo(0.5, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.5, 10);
    });

    it('pHeads clamped to min 0.01', () => {
      const def = buildDeviceDefinition({ device: 'coin', coinPHeads: -1 });
      expect(def.probabilities[0]).toBeCloseTo(0.01, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.99, 10);
    });

    it('pHeads clamped to max 0.99', () => {
      const def = buildDeviceDefinition({ device: 'coin', coinPHeads: 2 });
      expect(def.probabilities[0]).toBeCloseTo(0.99, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.01, 10);
    });

    it('custom pHeads value works', () => {
      const def = buildDeviceDefinition({ device: 'coin', coinPHeads: 0.7 });
      expect(def.probabilities[0]).toBeCloseTo(0.7, 10);
      expect(def.probabilities[1]).toBeCloseTo(0.3, 10);
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

    it('pSix clamped correctly (default 1/6)', () => {
      const def = buildDeviceDefinition({ device: 'die' });
      expect(def.probabilities[5]).toBeCloseTo(1 / 6, 10);
      // Other probabilities should be equal
      const other = def.probabilities.slice(0, 5);
      expect(other.every(p => Math.abs(p - other[0]) < 1e-10)).toBe(true);
    });

    it('pSix clamped to min 1/6', () => {
      const def = buildDeviceDefinition({ device: 'die', diePSix: 0 });
      expect(def.probabilities[5]).toBeCloseTo(1 / 6, 10);
    });

    it('pSix clamped to max 0.8', () => {
      const def = buildDeviceDefinition({ device: 'die', diePSix: 1 });
      expect(def.probabilities[5]).toBeCloseTo(0.8, 10);
    });

    it('other probabilities are equal', () => {
      const def = buildDeviceDefinition({ device: 'die', diePSix: 0.5 });
      const other = def.probabilities.slice(0, 5);
      const expectedOther = (1 - 0.5) / 5;
      other.forEach(p => {
        expect(p).toBeCloseTo(expectedOther, 10);
      });
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

