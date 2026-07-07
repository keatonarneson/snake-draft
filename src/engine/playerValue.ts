import { Player } from "../types/draft";

/**
 * Value accessors with the standard fallback to the player's blended `value`
 * when a projection-system-specific figure is missing. These fallbacks were
 * previously inlined at several call sites in cpuScoring.
 */
export function getConsensusValue(player: Player): number {
  return player.consensusValue ?? player.value;
}

export function getMaxSystemValue(player: Player): number {
  return player.maxSystemValue ?? player.value;
}
