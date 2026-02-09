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

/**
 * Sanitizes and normalizes probability arrays.
 * Ensures all values are non-negative and sum to 1.0.
 *
 * @param {Array<number>} probs - Array of probabilities to sanitize
 * @param {Array<number>} fallback - Fallback array if probs is invalid
 * @returns {Array<number>} Normalized probabilities summing to 1.0
 */
function sanitizeProbabilities(probs, fallback) {
  const clamped = probs.map(p => Math.max(0, p));
  const sum = clamped.reduce((a, p) => a + p, 0);
  if (sum > 0) {
    return clamped.map(p => p / sum);
  }
  return fallback;
}

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
    probabilities = sanitizeProbabilities(probabilities, [0.5, 0.5]);
    return baseDefinition('coin', { labels, probabilities, cdf: buildCdf(probabilities) });
  }

  if (config.device === 'die') {
    const labels = ['1', '2', '3', '4', '5', '6'];
    let probabilities = config.dieProbabilities ?? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    probabilities = sanitizeProbabilities(probabilities, [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]);
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
