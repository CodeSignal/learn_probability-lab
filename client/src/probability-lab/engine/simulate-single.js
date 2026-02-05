// Pure simulation function for single-event trials
import { sampleIndex } from '../domain/cdf.js';

/**
 * Simulates a number of single-event trials and updates the state slice.
 * Mutates the passed-in stateSlice (pure in terms of no DOM, but mutates state).
 *
 * @param {Object} stateSlice - State slice with:
 *   - definition: { cdf: Array<number>, labels: Array<string> }
 *   - counts: Array<number>
 *   - trials: number
 *   - lastIndex: number | null
 *   - history: Array<{ trials: number, rel: Array<number> }>
 * @param {Function} rng - Random number generator function (0-1)
 * @param {number} count - Number of trials to run
 */
export default function simulateSingleTrials(stateSlice, rng, count) {
  const def = stateSlice.definition;
  if (!def) return;
  const trialHistory = stateSlice.trialHistory;

  for (let i = 0; i < count; i += 1) {
    const idx = sampleIndex(rng, def.cdf);
    stateSlice.counts[idx] += 1;
    stateSlice.trials += 1;
    stateSlice.lastIndex = idx;
    if (trialHistory) trialHistory.push(idx);
  }

  if (stateSlice.trials > 0) {
    const rel = stateSlice.counts.map((c) => c / stateSlice.trials);
    stateSlice.history.push({ trials: stateSlice.trials, rel });
    if (stateSlice.history.length > 2000) {
      stateSlice.history = stateSlice.history.filter((_, i) => i % 2 === 0);
    }
  }
}
