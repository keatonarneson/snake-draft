import { Player } from "../types/draft";

export function isDraftableCloser(player: Player): boolean {
  return player.positions.includes("RP") && (player.stats.SV || 0) >= 12;
}

export function isPremiumCloser(player: Player): boolean {
  return isDraftableCloser(player) && (player.adp <= 100 || player.value >= 5 || (player.stats.SV || 0) >= 28);
}

