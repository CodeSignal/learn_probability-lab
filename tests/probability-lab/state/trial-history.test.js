import { describe, it, expect } from 'vitest';
import { IndexHistory, PackedPairHistory } from '../../../client/src/probability-lab/state/trial-history.js';

describe('trial-history', () => {
  it('IndexHistory supports push/get across chunk boundaries', () => {
    const history = new IndexHistory();

    for (let i = 0; i < 9000; i += 1) {
      history.push(i % 50);
    }

    expect(history.length).toBe(9000);
    expect(history.get(0)).toBe(0);
    expect(history.get(8191)).toBe(8191 % 50);
    expect(history.get(8192)).toBe(8192 % 50);
    expect(history.get(8999)).toBe(8999 % 50);
    expect(history.get(-1)).toBeNull();
    expect(history.get(9000)).toBeNull();
  });

  it('PackedPairHistory supports pushPair/getPair across chunk boundaries', () => {
    const history = new PackedPairHistory();

    for (let i = 0; i < 9000; i += 1) {
      history.pushPair(i % 50, (i * 7) % 50);
    }

    expect(history.length).toBe(9000);
    expect(history.getPair(0)).toEqual({ a: 0, b: 0 });
    expect(history.getPair(8192)).toEqual({ a: 8192 % 50, b: (8192 * 7) % 50 });
    expect(history.getPair(8999)).toEqual({ a: 8999 % 50, b: (8999 * 7) % 50 });
    expect(history.getPair(-1)).toBeNull();
    expect(history.getPair(9000)).toBeNull();
  });
});

