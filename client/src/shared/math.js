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

