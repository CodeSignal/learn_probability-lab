/**
 * Device definition builder
 */
import { clamp } from '../../shared/math.js';
import { buildCdf } from './cdf.js';

const DEVICE_META = {
  coin: { name: 'Coin', icon: '🪙' },
  die: { name: 'Die', icon: '🎲' },
  spinner: { name: 'Spinner', icon: '⭕' },
};

const MAX_CUSTOM_OUTCOMES = 50;

function baseDefinition(kind, extra = {}) {
  const meta = DEVICE_META[kind] ?? {};
  return {
    kind,
    id: kind,
    device: kind,
    name: meta.name ?? kind,
    icon: meta.icon ?? '',
    ...extra,
  };
}

function normalizeCustomSettings(settings = {}) {
  const name = typeof settings.name === 'string' && settings.name.trim().length > 0
    ? settings.name.trim()
    : 'Custom Device';
  const icon = typeof settings.icon === 'string' && settings.icon.trim().length > 0
    ? settings.icon.trim()
    : '';

  const rawOutcomes = Array.isArray(settings.outcomes) ? settings.outcomes : [];
  const seen = new Set();
  const labels = [];
  const rawProbabilities = Array.isArray(settings.probabilities) ? settings.probabilities : null;
  const probabilitiesRaw = rawProbabilities ? [] : null;

  for (let i = 0; i < rawOutcomes.length; i += 1) {
    const label = String(rawOutcomes[i] ?? '').trim();
    if (!label) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (probabilitiesRaw) probabilitiesRaw.push(rawProbabilities[i]);
  }

  if (labels.length < 2) {
    labels.length = 0;
    labels.push('Outcome 1', 'Outcome 2');
    if (probabilitiesRaw) probabilitiesRaw.length = 0;
  }

  if (labels.length > MAX_CUSTOM_OUTCOMES) {
    labels.length = MAX_CUSTOM_OUTCOMES;
    if (probabilitiesRaw) probabilitiesRaw.length = MAX_CUSTOM_OUTCOMES;
  }

  let probabilities = null;
  if (probabilitiesRaw && probabilitiesRaw.length === labels.length) {
    const numeric = probabilitiesRaw.map((value) => Number(value));
    const invalid = numeric.some((value) => !Number.isFinite(value) || value < 0);
    const sum = numeric.reduce((acc, value) => acc + value, 0);
    if (!invalid && sum > 0) {
      probabilities = numeric.map((value) => value / sum);
    }
  }

  if (!probabilities) {
    const p = 1 / labels.length;
    probabilities = Array.from({ length: labels.length }, () => p);
  }

  return { name, icon, labels, probabilities };
}

export function buildDeviceDefinition(config) {
  if (config.device === 'coin') {
    const labels = ['Heads', 'Tails'];
    let probabilities = config.coinProbabilities ?? [0.5, 0.5];

    // Ensure all probabilities are clamped and normalized
    // First, normalize the input probabilities
    let sum = probabilities.reduce((acc, p) => acc + p, 0);
    if (sum <= 0) {
      probabilities = [0.5, 0.5];
      return baseDefinition('coin', { labels, probabilities, cdf: buildCdf(probabilities) });
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

    return baseDefinition('coin', { labels, probabilities, cdf: buildCdf(probabilities) });
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
      return baseDefinition('die', { labels, probabilities, cdf: buildCdf(probabilities) });
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

    return baseDefinition('die', { labels, probabilities, cdf: buildCdf(probabilities) });
  }

  if (config.device === 'custom') {
    const settings = normalizeCustomSettings(config.deviceSettings ?? {});
    return baseDefinition('custom', {
      name: settings.name,
      icon: settings.icon,
      labels: settings.labels,
      probabilities: settings.probabilities,
      cdf: buildCdf(settings.probabilities),
    });
  }

  const sectors = clamp(config.spinnerSectors ?? 8, 2, 12);
  const skew = clamp(config.spinnerSkew ?? 0, -1, 1);
  const labels = Array.from({ length: sectors }, (_, i) => String(i + 1));

  const center = (sectors - 1) / 2;
  const weights = labels.map((_, i) => Math.exp(skew * (i - center)));
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  const probabilities = weights.map((w) => w / weightSum);
  return baseDefinition('spinner', { labels, probabilities, cdf: buildCdf(probabilities), sectors, skew });
}
