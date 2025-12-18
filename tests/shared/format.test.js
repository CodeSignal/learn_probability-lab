import { describe, it, expect } from 'vitest';
import { formatCount, formatProbability, formatSignedProbability } from '../../client/src/shared/format.js';

describe('formatCount', () => {
  it('formats numbers with locale-appropriate separators', () => {
    const result = formatCount(1000);
    expect(typeof result).toBe('string');
    // Locale-specific formatting adds commas: '1,000'
    expect(result).toBe('1,000');
  });

  it('handles zero', () => {
    const result = formatCount(0);
    expect(result).toBe('0');
  });

  it('handles negative numbers', () => {
    const result = formatCount(-1000);
    expect(typeof result).toBe('string');
    // Locale-specific formatting: '-1,000'
    expect(result).toBe('-1,000');
  });

  it('handles large numbers', () => {
    const result = formatCount(1000000);
    expect(typeof result).toBe('string');
    // Locale-specific formatting: '1,000,000'
    expect(result).toBe('1,000,000');
  });

  it('handles small numbers', () => {
    expect(formatCount(1)).toBe('1');
    expect(formatCount(42)).toBe('42');
  });
});

describe('formatProbability', () => {
  it('formats as percentage with correct digits', () => {
    expect(formatProbability(0.5)).toBe('50.0%');
    expect(formatProbability(0.123)).toBe('12.3%');
    expect(formatProbability(0.1234)).toBe('12.3%');
  });

  it('respects digits parameter', () => {
    expect(formatProbability(0.1234, 2)).toBe('12.34%');
    expect(formatProbability(0.1234, 0)).toBe('12%');
    expect(formatProbability(0.1234, 3)).toBe('12.340%');
  });

  it('handles zero', () => {
    expect(formatProbability(0)).toBe('0.0%');
    expect(formatProbability(0, 2)).toBe('0.00%');
  });

  it('handles one', () => {
    expect(formatProbability(1)).toBe('100.0%');
    expect(formatProbability(1, 2)).toBe('100.00%');
  });

  it('returns "—" for NaN', () => {
    expect(formatProbability(NaN)).toBe('—');
    expect(formatProbability(NaN, 2)).toBe('—');
  });

  it('returns "—" for Infinity', () => {
    expect(formatProbability(Infinity)).toBe('—');
    expect(formatProbability(-Infinity)).toBe('—');
  });

  it('handles values between 0 and 1', () => {
    expect(formatProbability(0.25)).toBe('25.0%');
    expect(formatProbability(0.75)).toBe('75.0%');
    expect(formatProbability(0.999)).toBe('99.9%');
  });
});

describe('formatSignedProbability', () => {
  it('adds "+" prefix for positive values', () => {
    expect(formatSignedProbability(0.5)).toBe('+50.0%');
    expect(formatSignedProbability(0.123)).toBe('+12.3%');
  });

  it('adds "-" prefix for negative values', () => {
    expect(formatSignedProbability(-0.5)).toBe('-50.0%');
    expect(formatSignedProbability(-0.123)).toBe('-12.3%');
  });

  it('has no sign for zero', () => {
    expect(formatSignedProbability(0)).toBe('0.0%');
    expect(formatSignedProbability(-0)).toBe('0.0%');
  });

  it('respects digits parameter', () => {
    expect(formatSignedProbability(0.1234, 2)).toBe('+12.34%');
    expect(formatSignedProbability(-0.1234, 2)).toBe('-12.34%');
    expect(formatSignedProbability(0.1234, 0)).toBe('+12%');
  });

  it('returns "—" for NaN', () => {
    expect(formatSignedProbability(NaN)).toBe('—');
    expect(formatSignedProbability(NaN, 2)).toBe('—');
  });

  it('returns "—" for Infinity', () => {
    expect(formatSignedProbability(Infinity)).toBe('—');
    expect(formatSignedProbability(-Infinity)).toBe('—');
  });

  it('handles small positive values', () => {
    expect(formatSignedProbability(0.01)).toBe('+1.0%');
    expect(formatSignedProbability(0.001)).toBe('+0.1%');
  });

  it('handles small negative values', () => {
    expect(formatSignedProbability(-0.01)).toBe('-1.0%');
    expect(formatSignedProbability(-0.001)).toBe('-0.1%');
  });
});

