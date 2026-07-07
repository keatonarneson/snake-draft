import { Player } from "../types/draft";
import {
  CLOSER_MIN_SAVES,
  PREMIUM_CLOSER_ELITE_SAVES,
  PREMIUM_CLOSER_MAX_ADP,
  PREMIUM_CLOSER_MIN_VALUE,
} from "./config";

export function isDraftableCloser(player: Player): boolean {
  return player.positions.includes("RP") && (player.stats.SV || 0) >= CLOSER_MIN_SAVES;
}

export function isPremiumCloser(player: Player): boolean {
  return (
    isDraftableCloser(player) &&
    (player.adp <= PREMIUM_CLOSER_MAX_ADP ||
      player.value >= PREMIUM_CLOSER_MIN_VALUE ||
      (player.stats.SV || 0) >= PREMIUM_CLOSER_ELITE_SAVES)
  );
}

