import { describe, it, expect } from 'vitest';
import { buildCdf, sampleIndex } from '../../../client/src/probability-lab/domain/cdf.js';

describe('buildCdf', () => {
  it('normalizes probabilities (sums to 1.0)', () => {
    const probabilities = [0.1, 0.2, 0.3, 0.4];
    const cdf = buildCdf(probabilities);
    expect(cdf[cdf.length - 1]).toBeCloseTo(1.0, 10);
  });

  it('handles zero probabilities correctly', () => {
    const probabilities = [0, 0.5, 0, 0.5];
    const cdf = buildCdf(probabilities);
    expect(cdf.length).toBe(4);
    expect(cdf[cdf.length - 1]).toBeCloseTo(1.0, 10);
  });

  it('handles negative total (returns zeros)', () => {
    const probabilities = [-1, -2, -3];
    const cdf = buildCdf(probabilities);
    expect(cdf.every(v => v === 0)).toBe(true);
  });

  it('last value is always 1.0 (or 0 if invalid)', () => {
    const valid = buildCdf([0.25, 0.25, 0.25, 0.25]);
    expect(valid[valid.length - 1]).toBeCloseTo(1.0, 10);

    const invalid = buildCdf([-1, -1]);
    expect(invalid[invalid.length - 1]).toBe(0);
  });

  it('values are monotonic increasing', () => {
    const probabilities = [0.1, 0.2, 0.3, 0.4];
    const cdf = buildCdf(probabilities);

    for (let i = 1; i < cdf.length; i++) {
      expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i - 1]);
    }
  });

  it('handles single probability', () => {
    const cdf = buildCdf([1.0]);
    expect(cdf.length).toBe(1);
    expect(cdf[0]).toBeCloseTo(1.0, 10);
  });

  it('handles unnormalized probabilities', () => {
    const probabilities = [1, 2, 3, 4]; // sum = 10
    const cdf = buildCdf(probabilities);
    expect(cdf[cdf.length - 1]).toBeCloseTo(1.0, 10);
    expect(cdf[0]).toBeCloseTo(0.1, 10);
  });
});

describe('sampleIndex', () => {
  it('returns valid index (0 to length-1)', () => {
    const cdf = [0.25, 0.5, 0.75, 1.0];
    const mockRng = () => 0.5;
    const index = sampleIndex(mockRng, cdf);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(cdf.length);
  });

  it('respects CDF probabilities (statistical test)', () => {
    const cdf = [0.1, 0.3, 0.6, 1.0]; // probabilities: 0.1, 0.2, 0.3, 0.4
    const counts = [0, 0, 0, 0];
    const samples = 10000;

    // Deterministic RNG for testing
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < samples; i++) {
      const idx = sampleIndex(rng, cdf);
      counts[idx]++;
    }

    // Check that distribution roughly matches probabilities
    const tolerance = 0.05; // 5% tolerance
    expect(counts[0] / samples).toBeCloseTo(0.1, 1);
    expect(counts[1] / samples).toBeCloseTo(0.2, 1);
    expect(counts[2] / samples).toBeCloseTo(0.3, 1);
    expect(counts[3] / samples).toBeCloseTo(0.4, 1);
  });

  it('handles rng() = 1.0 returns last index', () => {
    const cdf = [0.25, 0.5, 0.75, 1.0];
    const mockRng = () => 1.0;
    const index = sampleIndex(mockRng, cdf);
    expect(index).toBe(cdf.length - 1);
  });

  it('handles empty CDF returns 0', () => {
    const cdf = [];
    const mockRng = () => 0.5;
    const index = sampleIndex(mockRng, cdf);
    expect(index).toBe(0);
  });

  it('handles rng() = 0.0 returns first index', () => {
    const cdf = [0.25, 0.5, 0.75, 1.0];
    const mockRng = () => 0.0;
    const index = sampleIndex(mockRng, cdf);
    expect(index).toBe(0);
  });

  it('handles values just below thresholds', () => {
    const cdf = [0.25, 0.5, 0.75, 1.0];
    const mockRng1 = () => 0.249;
    const mockRng2 = () => 0.251;

    expect(sampleIndex(mockRng1, cdf)).toBe(0);
    expect(sampleIndex(mockRng2, cdf)).toBe(1);
  });
});

