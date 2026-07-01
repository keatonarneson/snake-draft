import { useMemo } from "react";
import { Player } from "../../types/draft";

export function usePlayerMap(players: Player[]) {
  return useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
}
