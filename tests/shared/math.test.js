import { describe, it, expect } from 'vitest';
import { clamp, safeNumber, roundToPercentages } from '../../client/src/shared/math.js';

describe('clamp', () => {
  it('leaves values within range unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('clamps values below min to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(2, 5, 10)).toBe(5);
  });

  it('clamps values above max to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(8, 0, 5)).toBe(5);
  });

  it('handles min > max (returns max)', () => {
    // When min > max, Math.min/max will clamp to max
    expect(clamp(5, 10, 0)).toBe(0);
    expect(clamp(15, 10, 0)).toBe(0);
    expect(clamp(-5, 10, 0)).toBe(0);
  });

  it('handles NaN', () => {
    expect(clamp(NaN, 0, 10)).toBeNaN();
  });

  it('handles Infinity', () => {
    expect(clamp(Infinity, 0, 10)).toBe(10);
    expect(clamp(-Infinity, 0, 10)).toBe(0);
  });

  it('handles negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10);
    expect(clamp(-3, -10, -5)).toBe(-5);
    expect(clamp(-7, -10, -5)).toBe(-7);
  });

  it('handles decimal values', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.5, 0, 1)).toBe(0);
  });
});

describe('safeNumber', () => {
  it('returns valid numbers as-is', () => {
    expect(safeNumber(5, 0)).toBe(5);
    expect(safeNumber(0, 10)).toBe(0);
    expect(safeNumber(-5, 0)).toBe(-5);
    expect(safeNumber(3.14, 0)).toBe(3.14);
  });

  it('returns fallback for NaN', () => {
    expect(safeNumber(NaN, 42)).toBe(42);
    expect(safeNumber(NaN, -1)).toBe(-1);
  });

  it('returns fallback for Infinity', () => {
    expect(safeNumber(Infinity, 42)).toBe(42);
    expect(safeNumber(-Infinity, 42)).toBe(42);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(safeNumber('not a number', 42)).toBe(42);
    // Note: Number('123') returns 123 (coerced), so this is expected behavior
    expect(safeNumber('123', 42)).toBe(123);
  });

  it('handles null (coerces to 0)', () => {
    // Number(null) returns 0, which is finite, so returns 0 not fallback
    expect(safeNumber(null, 42)).toBe(0);
  });

  it('handles undefined', () => {
    expect(safeNumber(undefined, 42)).toBe(42);
  });

  it('handles empty string (coerces to 0)', () => {
    // Number('') returns 0, which is finite, so returns 0 not fallback
    expect(safeNumber('', 42)).toBe(0);
  });

  it('handles objects', () => {
    expect(safeNumber({}, 42)).toBe(42);
    // Number([]) returns 0, which is finite, so returns 0 not fallback
    expect(safeNumber([], 42)).toBe(0);
  });

  it('handles zero fallback', () => {
    expect(safeNumber(NaN, 0)).toBe(0);
    expect(safeNumber(Infinity, 0)).toBe(0);
  });
});

describe('roundToPercentages', () => {
  it('returns empty array for empty input', () => {
    expect(roundToPercentages([])).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(roundToPercentages(null)).toEqual([]);
    expect(roundToPercentages(undefined)).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(roundToPercentages([1.0])).toEqual([100]);
    // Note: [0.5] doesn't sum to 1.0, so behavior is undefined
    // For valid input that sums to 1.0, single element should be 100
  });

  it('handles uniform distributions (fair coin)', () => {
    const result = roundToPercentages([0.5, 0.5]);
    expect(result).toEqual([50, 50]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('handles uniform distributions (fair die)', () => {
    const result = roundToPercentages([1/6, 1/6, 1/6, 1/6, 1/6, 1/6]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    // Each should be 16 or 17 (16.666... rounds)
    result.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(16);
      expect(p).toBeLessThanOrEqual(17);
    });
  });

  it('handles extreme skew (bug case: 98% + 5×0.4%)', () => {
    // This is the exact bug case: P(1) = 98%, others = 0.4% each
    const probs = [0.98, 0.004, 0.004, 0.004, 0.004, 0.004];
    const result = roundToPercentages(probs);
    
    // Should sum to exactly 100
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    
    // First should be 98
    expect(result[0]).toBe(98);
    
    // Remaining 2% should be distributed among 5 outcomes
    const remaining = result.slice(1).reduce((a, b) => a + b, 0);
    expect(remaining).toBe(2);
    
    // Each of the 5 should be 0 or 1 (largest-remainder will round some up)
    result.slice(1).forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });
  });

  it('always sums to exactly 100', () => {
    const testCases = [
      [0.7, 0.3],
      [0.333, 0.333, 0.334],
      [0.1, 0.2, 0.3, 0.4],
      [0.98, 0.01, 0.005, 0.005],
      [0.001, 0.001, 0.001, 0.997],
    ];
    
    testCases.forEach(probs => {
      const result = roundToPercentages(probs);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });
  });

  it('uses largest-remainder rounding correctly', () => {
    // Three outcomes: 33.3%, 33.3%, 33.4%
    // Should round to [33, 33, 34] (sums to 100)
    const result = roundToPercentages([1/3, 1/3, 1/3]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    
    // With largest-remainder, two should get 33 and one should get 34
    const counts = { 33: 0, 34: 0 };
    result.forEach(p => {
      expect([33, 34]).toContain(p);
      counts[p] = (counts[p] || 0) + 1;
    });
    expect(counts[33] + counts[34]).toBe(3);
  });

  it('handles all-zero input (edge case - doesn\'t sum to 1.0)', () => {
    // Function expects probabilities summing to 1.0, but handles this gracefully
    const result = roundToPercentages([0, 0, 0]);
    // With shortfall of 100 and 3 remainders, distributes 3 points
    expect(result.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
    // Each element gets at least 0, at most the distributed amount
    result.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0);
    });
  });

  it('handles very small probabilities (must sum to 1.0)', () => {
    // 0.1 each for 10 outcomes = 1.0 total
    const probs = Array(10).fill(0.1);
    const result = roundToPercentages(probs);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    // Each should be 10 (0.1 * 100 = 10, no remainder)
    result.forEach(p => {
      expect(p).toBe(10);
    });
  });

  it('handles probabilities that sum to slightly more than 1.0', () => {
    // Due to floating point, this might happen
    const result = roundToPercentages([0.5, 0.5, 0.0000001]);
    expect(result.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
  });
});

