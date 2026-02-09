/**
 * Math utilities
 */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Converts float probabilities to integer percentages using largest-remainder rounding.
 * Guarantees the result sums to exactly 100.
 *
 * @param {Array<number>} probabilities - Array of float probabilities (should sum to 1.0)
 * @returns {Array<number>} Array of integers (0-100) that sum to exactly 100
 */
export function roundToPercentages(probabilities) {
  if (!Array.isArray(probabilities) || probabilities.length === 0) {
    return [];
  }

  // Step 1: Floor each probability × 100 to get integer parts
  const floors = probabilities.map(p => Math.floor(p * 100));
  const floorSum = floors.reduce((sum, f) => sum + f, 0);

  // Step 2: Calculate shortfall
  const shortfall = 100 - floorSum;

  if (shortfall <= 0) {
    // Already at or above 100, return floors (shouldn't happen with valid probabilities)
    return floors;
  }

  // Step 3: Calculate fractional remainders and create index-remainder pairs
  const remainders = probabilities.map((p, i) => ({
    index: i,
    remainder: (p * 100) - floors[i],
  }));

  // Step 4: Sort by remainder (descending)
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Step 5: Distribute shortfall one point at a time to largest remainders
  const result = [...floors];
  for (let i = 0; i < shortfall && i < remainders.length; i++) {
    result[remainders[i].index]++;
  }

  return result;
}

