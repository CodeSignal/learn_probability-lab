/**
 * Device definition builder
 */
import { clamp } from '../../shared/math.js';
import { buildCdf } from './cdf.js';

export function buildDeviceDefinition(config) {
  if (config.device === 'coin') {
    const labels = ['Heads', 'Tails'];
    let probabilities = config.coinProbabilities ?? [0.5, 0.5];

    // Ensure all probabilities are clamped and normalized
    // First, normalize the input probabilities
    let sum = probabilities.reduce((acc, p) => acc + p, 0);
    if (sum <= 0) {
      probabilities = [0.5, 0.5];
      return { device: 'coin', labels, probabilities, cdf: buildCdf(probabilities) };
    }

    let normalized = probabilities.map((p) => p / sum);

    // Clamp values that are out of bounds and redistribute excess
    let clamped = normalized.map((p) => clamp(p, 0.01, 0.99));
    let clampedSum = clamped.reduce((acc, p) => acc + p, 0);

    // If clamping reduced the sum, redistribute the difference proportionally
    if (clampedSum < 1.0) {
      const excess = 1.0 - clampedSum;
      // Find values that can accept more probability (those below 0.99)
      const canAcceptMore = clamped.map((p, i) => p < 0.99 ? i : -1).filter(i => i >= 0);
      if (canAcceptMore.length > 0) {
        // Distribute excess proportionally among values that can accept more
        const weights = canAcceptMore.map(i => clamped[i]);
        const weightSum = weights.reduce((acc, w) => acc + w, 0);
        if (weightSum > 0) {
          canAcceptMore.forEach((idx, i) => {
            clamped[idx] = Math.min(0.99, clamped[idx] + (weights[i] / weightSum) * excess);
          });
        } else {
          // Equal distribution if weights are zero
          const perValue = excess / canAcceptMore.length;
          canAcceptMore.forEach(idx => {
            clamped[idx] = Math.min(0.99, clamped[idx] + perValue);
          });
        }
      }
    }

    // Final normalization to ensure sum is exactly 1.0
    clampedSum = clamped.reduce((acc, p) => acc + p, 0);
    if (clampedSum > 0) {
      probabilities = clamped.map((p) => p / clampedSum);
      // Final clamp check (shouldn't be needed, but safety check)
      probabilities = probabilities.map((p) => clamp(p, 0.01, 0.99));
      const finalSum = probabilities.reduce((acc, p) => acc + p, 0);
      if (finalSum > 0) {
        probabilities = probabilities.map((p) => p / finalSum);
      }
    } else {
      probabilities = [0.5, 0.5];
    }

    return { device: 'coin', labels, probabilities, cdf: buildCdf(probabilities) };
  }

  if (config.device === 'die') {
    const labels = ['1', '2', '3', '4', '5', '6'];
    let probabilities;

    probabilities = config.dieProbabilities ?? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];

    // Ensure all probabilities are clamped and normalized
    // First, normalize the input probabilities
    let sum = probabilities.reduce((acc, p) => acc + p, 0);
    if (sum <= 0) {
      probabilities = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
      return { device: 'die', labels, probabilities, cdf: buildCdf(probabilities) };
    }

    let normalized = probabilities.map((p) => p / sum);

    // Clamp values that are out of bounds and redistribute excess
    let clamped = normalized.map((p) => clamp(p, 0.01, 0.8));
    let clampedSum = clamped.reduce((acc, p) => acc + p, 0);

    // If clamping reduced the sum, redistribute the difference proportionally
    if (clampedSum < 1.0) {
      const excess = 1.0 - clampedSum;
      // Find values that can accept more probability (those below 0.8)
      const canAcceptMore = clamped.map((p, i) => p < 0.8 ? i : -1).filter(i => i >= 0);
      if (canAcceptMore.length > 0) {
        // Distribute excess proportionally among values that can accept more
        const weights = canAcceptMore.map(i => clamped[i]);
        const weightSum = weights.reduce((acc, w) => acc + w, 0);
        if (weightSum > 0) {
          canAcceptMore.forEach((idx, i) => {
            clamped[idx] = Math.min(0.8, clamped[idx] + (weights[i] / weightSum) * excess);
          });
        } else {
          // Equal distribution if weights are zero
          const perValue = excess / canAcceptMore.length;
          canAcceptMore.forEach(idx => {
            clamped[idx] = Math.min(0.8, clamped[idx] + perValue);
          });
        }
      }
    }

    // Final normalization to ensure sum is exactly 1.0
    clampedSum = clamped.reduce((acc, p) => acc + p, 0);
    if (clampedSum > 0) {
      probabilities = clamped.map((p) => p / clampedSum);
      // Final clamp check (shouldn't be needed, but safety check)
      probabilities = probabilities.map((p) => clamp(p, 0.01, 0.8));
      const finalSum = probabilities.reduce((acc, p) => acc + p, 0);
      if (finalSum > 0) {
        probabilities = probabilities.map((p) => p / finalSum);
      }
    } else {
      probabilities = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    }

    return { device: 'die', labels, probabilities, cdf: buildCdf(probabilities) };
  }

  const sectors = clamp(config.spinnerSectors ?? 8, 2, 12);
  const skew = clamp(config.spinnerSkew ?? 0, -1, 1);
  const labels = Array.from({ length: sectors }, (_, i) => String(i + 1));

  const center = (sectors - 1) / 2;
  const weights = labels.map((_, i) => Math.exp(skew * (i - center)));
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  const probabilities = weights.map((w) => w / weightSum);
  return { device: 'spinner', labels, probabilities, cdf: buildCdf(probabilities), sectors, skew };
}

