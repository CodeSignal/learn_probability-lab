// Pure simulation function for two-event trials
import { sampleIndex, buildCdf } from '../domain/cdf.js';

/**
 * Modifies probabilities for device B based on whether device A had a "high" outcome.
 * Creates symmetric dependence: high A → high B more likely, low A → low B more likely.
 *
 * @param {Array<number>} originalProbs - Original probabilities for device B
 * @param {boolean} isHighA - Whether device A had a "high" outcome
 * @param {number} boostFactor - Factor to multiply matching outcomes (default 3.5)
 * @returns {Array<number>} Modified probabilities (normalized to sum to 1)
 */
function modifyProbabilitiesForDependence(originalProbs, isHighA, boostFactor = 3.5) {
  const n = originalProbs.length;
  const highThreshold = Math.ceil(n / 2);

  const modified = originalProbs.map((p, i) => {
    const isHighB = i >= highThreshold;
    // If A is high and B is high, or A is low and B is low, boost probability
    if ((isHighA && isHighB) || (!isHighA && !isHighB)) {
      return p * boostFactor;
    }
    // Otherwise, reduce probability proportionally
    return p;
  });

  // Normalize to ensure sum is 1
  const sum = modified.reduce((acc, p) => acc + p, 0);
  if (sum <= 0) {
    // Fallback to uniform distribution if something went wrong
    return originalProbs.map(() => 1 / n);
  }
  return modified.map((p) => p / sum);
}

/**
 * Simulates a number of two-event trials and updates the state slice.
 * Mutates the passed-in stateSlice (pure in terms of no DOM, but mutates state).
 *
 * @param {Object} stateSlice - State slice with:
 *   - definitionA: { cdf: Array<number>, device: string }
 *   - definitionB: { cdf: Array<number> }
 *   - relationship: 'independent' | 'dependent'
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
  const trialHistory = stateSlice.trialHistory;

  for (let i = 0; i < count; i += 1) {
    const a = sampleIndex(rng, defA.cdf);
    let b;

    if (relationship === 'dependent') {
      // Implement probabilistic dependence where "high" outcomes of A
      // make "high" outcomes of B more likely, and "low" outcomes of A
      // make "low" outcomes of B more likely
      if (!defB.probabilities) {
        // Fallback to independent if probabilities are missing
        b = sampleIndex(rng, defB.cdf);
      } else {
        const nA = defA.labels ? defA.labels.length : defA.cdf.length;
        const highThresholdA = Math.ceil(nA / 2);
        const isHighA = a >= highThresholdA;

        const modifiedProbs = modifyProbabilitiesForDependence(defB.probabilities, isHighA);
        const modifiedCdf = buildCdf(modifiedProbs);
        b = sampleIndex(rng, modifiedCdf);
      }
    } else {
      // independent
      b = sampleIndex(rng, defB.cdf);
    }

    stateSlice.countsA[a] += 1;
    stateSlice.countsB[b] += 1;
    stateSlice.joint[a][b] += 1;
    stateSlice.trials += 1;
    stateSlice.lastA = a;
    stateSlice.lastB = b;
    if (trialHistory) trialHistory.pushPair(a, b);
  }
}
