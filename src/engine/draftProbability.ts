import { Player } from "../types/draft";

/**
 * High-precision numerical approximation of the error function (erf).
 * Accurate to ~1.5e-7.
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));

  return sign * y;
}

/**
 * Standard Normal Cumulative Distribution Function (CDF).
 */
export function normalCDF(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

/**
 * Truncated Normal Cumulative Distribution Function (CDF).
 */
export function truncatedNormalCDF(
  p: number,
  adp: number,
  minPick: number,
  maxPick: number
): number {
  if (p <= minPick) return 0;
  if (p >= maxPick) return 1;
  if (minPick >= maxPick) return p >= minPick ? 1 : 0;

  const stdDev = Math.max(1.0, (maxPick - minPick) / 4.0);

  const phiP = normalCDF((p - adp) / stdDev);
  const phiMin = normalCDF((minPick - adp) / stdDev);
  const phiMax = normalCDF((maxPick - adp) / stdDev);

  const denom = phiMax - phiMin;
  if (denom <= 0) {
    return (p - minPick) / (maxPick - minPick);
  }

  const result = (phiP - phiMin) / denom;
  return Math.min(1.0, Math.max(0.0, result));
}

/**
 * Calculate the probability that a player will still be available at the user's next pick.
 */
export function calculateReturnProbability(
  pCurr: number,
  pNext: number,
  player: Player
): number {
  if (pNext <= pCurr) return 1.0;
  if (pNext >= player.maxPick) return 0.0;
  if (pCurr <= player.minPick) {
    return 1.0 - truncatedNormalCDF(pNext, player.adp, player.minPick, player.maxPick);
  }

  const fCurr = truncatedNormalCDF(pCurr, player.adp, player.minPick, player.maxPick);
  const fNext = truncatedNormalCDF(pNext, player.adp, player.minPick, player.maxPick);

  if (fCurr >= 1.0) return 0.0;

  const pReturn = (1.0 - fNext) / (1.0 - fCurr);
  return Math.min(1.0, Math.max(0.0, pReturn));
}

