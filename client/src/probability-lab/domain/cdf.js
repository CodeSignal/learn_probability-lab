/**
 * Cumulative Distribution Function utilities
 */

export function buildCdf(probabilities) {
  const cdf = [];
  let total = 0;
  for (const p of probabilities) {
    total += p;
    cdf.push(total);
  }
  const last = cdf.at(-1) ?? 1;
  if (last <= 0) return cdf.map(() => 0);
  return cdf.map((v) => v / last);
}

export function sampleIndex(rng, cdf) {
  const r = rng();
  for (let i = 0; i < cdf.length; i += 1) {
    if (r < cdf[i]) return i;
  }
  return Math.max(0, cdf.length - 1);
}

