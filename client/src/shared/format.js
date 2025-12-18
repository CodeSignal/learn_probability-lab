/**
 * Formatting utilities
 */

const numberFormatter = new Intl.NumberFormat(undefined);

export function formatCount(value) {
  return numberFormatter.format(value);
}

export function formatProbability(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedProbability(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  const pct = (value * 100).toFixed(digits);
  const sign = value > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

