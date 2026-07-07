import { useMemo } from "react";
import { Player } from "../types/draft";

/** Memoized id → player lookup, shared by the draft board and draft room. */
export function usePlayerMap(players: Player[]) {
  return useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
}
