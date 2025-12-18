/**
 * Device definition builder
 */
import { clamp } from '../../shared/math.js';
import { buildCdf } from './cdf.js';

export function buildDeviceDefinition(config) {
  if (config.device === 'coin') {
    const pHeads = clamp(config.coinPHeads ?? 0.5, 0.01, 0.99);
    const labels = ['Heads', 'Tails'];
    const probabilities = [pHeads, 1 - pHeads];
    return { device: 'coin', labels, probabilities, cdf: buildCdf(probabilities) };
  }

  if (config.device === 'die') {
    const pSix = clamp(config.diePSix ?? 1 / 6, 1 / 6, 0.8);
    const other = (1 - pSix) / 5;
    const labels = ['1', '2', '3', '4', '5', '6'];
    const probabilities = [other, other, other, other, other, pSix];
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

