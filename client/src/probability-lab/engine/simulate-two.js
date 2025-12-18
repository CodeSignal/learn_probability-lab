// Pure simulation function for two-event trials
import { sampleIndex } from '../domain/cdf.js';

/**
 * Simulates a number of two-event trials and updates the state slice.
 * Mutates the passed-in stateSlice (pure in terms of no DOM, but mutates state).
 *
 * @param {Object} stateSlice - State slice with:
 *   - definitionA: { cdf: Array<number>, device: string }
 *   - definitionB: { cdf: Array<number> }
 *   - relationship: 'independent' | 'copy' | 'complement'
 *   - countsA: Array<number>
 *   - countsB: Array<number>
 *   - joint: Array<Array<number>>
 *   - trials: number
 *   - lastA: number | null
 *   - lastB: number | null
 * @param {Function} rng - Random number generator function (0-1)
 * @param {number} count - Number of trials to run
 */
export default function simulateTwoTrials(stateSlice, rng, count) {
  const defA = stateSlice.definitionA;
  const defB = stateSlice.definitionB;
  if (!defA || !defB) return;

  const relationship = stateSlice.relationship;

  for (let i = 0; i < count; i += 1) {
    const a = sampleIndex(rng, defA.cdf);
    let b;

    if (relationship === 'copy') {
      b = a;
    } else if (relationship === 'complement' && defA.device === 'coin') {
      b = 1 - a;
    } else {
      b = sampleIndex(rng, defB.cdf);
    }

    stateSlice.countsA[a] += 1;
    stateSlice.countsB[b] += 1;
    stateSlice.joint[a][b] += 1;
    stateSlice.trials += 1;
    stateSlice.lastA = a;
    stateSlice.lastB = b;
  }
}

