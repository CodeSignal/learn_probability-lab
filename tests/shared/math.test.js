import { describe, it, expect } from 'vitest';
import { clamp, safeNumber } from '../../client/src/shared/math.js';

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

