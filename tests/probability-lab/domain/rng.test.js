import { describe, it, expect } from 'vitest';
import { hashStringToUint32, mulberry32, createRngFromSeed } from '../../../client/src/probability-lab/domain/rng.js';

describe('hashStringToUint32', () => {
  it('produces same output for same input (deterministic)', () => {
    const result1 = hashStringToUint32('test');
    const result2 = hashStringToUint32('test');
    expect(result1).toBe(result2);
  });

  it('produces different outputs for different inputs', () => {
    const result1 = hashStringToUint32('test');
    const result2 = hashStringToUint32('test2');
    expect(result1).not.toBe(result2);
  });

  it('handles empty string', () => {
    const result = hashStringToUint32('');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it('handles special characters', () => {
    const result1 = hashStringToUint32('hello world');
    const result2 = hashStringToUint32('hello@world#123');
    expect(result1).not.toBe(result2);
    expect(typeof result1).toBe('number');
    expect(typeof result2).toBe('number');
  });

  it('returns unsigned 32-bit integer', () => {
    const result = hashStringToUint32('test');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('mulberry32', () => {
  it('produces same sequence for same seed', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(67890);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('outputs are in range [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('sequence is deterministic across multiple calls', () => {
    const rng = mulberry32(12345);
    const first = rng();
    const rng2 = mulberry32(12345);
    const second = rng2();
    expect(first).toBe(second);
  });
});

describe('createRngFromSeed', () => {
  it('returns deterministic RNG function for empty seed', () => {
    const rng1 = createRngFromSeed('');
    const rng2 = createRngFromSeed(null);
    const rng3 = createRngFromSeed(undefined);
    const rng4 = createRngFromSeed('   ');

    expect(typeof rng1).toBe('function');
    expect(typeof rng2).toBe('function');
    expect(typeof rng3).toBe('function');
    expect(typeof rng4).toBe('function');

    expect(rng1()).toBe(rng2());
    expect(rng3()).toBe(rng4());
  });

  it('returns deterministic RNG function for valid seed', () => {
    const rng = createRngFromSeed('test-seed');
    expect(typeof rng).toBe('function');
    expect(rng).not.toBe(Math.random);
  });

  it('same seed produces same first N numbers', () => {
    const rng1 = createRngFromSeed('test-seed');
    const rng2 = createRngFromSeed('test-seed');

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRngFromSeed('seed1');
    const rng2 = createRngFromSeed('seed2');

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('generated RNG outputs are in range [0, 1)', () => {
    const rng = createRngFromSeed('test');
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

