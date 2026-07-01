import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { DraftPick, calculateTargetMetrics } from "../engine";
import { Player } from "../types/draft";

export interface RoundTarget {
  position: string | null;
  playerIds: string[];
}

export type RoundTargets = Record<number, RoundTarget>;

interface UseDraftTargetsOptions {
  players: Player[];
  currentPickIndex: number;
  picks: DraftPick[];
  userPosition: number;
  draftedPlayerIds: Set<string>;
}

interface UseDraftTargetsResult {
  roundTargets: RoundTargets;
  setRoundTargets: Dispatch<SetStateAction<RoundTargets>>;
  toggleTargetPlayer: (playerId: string) => void;
  setRoundPositionTarget: (round: number, position: string | null) => void;
  moveTargetPlayer: (playerId: string, fromRound: number, toRound: number) => void;
  addTargetPlayerToRound: (playerId: string, round: number) => void;
}

export function useDraftTargets({
  players,
  currentPickIndex,
  picks,
  userPosition,
  draftedPlayerIds,
}: UseDraftTargetsOptions): UseDraftTargetsResult {
  const [roundTargets, setRoundTargets] = useState<RoundTargets>({});

  const toggleTargetPlayer = useCallback((playerId: string) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };
      let found = false;

      Object.keys(copy).forEach((roundStr) => {
        const round = parseInt(roundStr);
        if (copy[round]?.playerIds.includes(playerId)) {
          copy[round] = {
            ...copy[round],
            playerIds: copy[round].playerIds.filter((id) => id !== playerId),
          };
          found = true;
        }
      });

      if (found) {
        return copy;
      }

      const player = players.find((p) => p.id === playerId);
      if (!player) return prev;

      const pCurr = currentPickIndex + 1;
      const userPicks = picks.filter((p) => p.teamIndex === userPosition - 1);
      const metrics = calculateTargetMetrics(player, pCurr, userPicks, draftedPlayerIds);
      const optRound = metrics.optimalRound;

      if (optRound !== -1) {
        copy[optRound] = {
          position: copy[optRound]?.position ?? null,
          playerIds: [...(copy[optRound]?.playerIds ?? []), playerId],
        };
      }

      return copy;
    });
  }, [players, currentPickIndex, picks, userPosition, draftedPlayerIds]);

  const setRoundPositionTarget = useCallback((round: number, position: string | null) => {
    setRoundTargets((prev) => ({
      ...prev,
      [round]: {
        position,
        playerIds: prev[round]?.playerIds ?? [],
      },
    }));
  }, []);

  const moveTargetPlayer = useCallback((playerId: string, fromRound: number, toRound: number) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };

      if (copy[fromRound]) {
        copy[fromRound] = {
          ...copy[fromRound],
          playerIds: copy[fromRound].playerIds.filter((id) => id !== playerId),
        };
      }

      copy[toRound] = {
        position: copy[toRound]?.position ?? null,
        playerIds: [...(copy[toRound]?.playerIds ?? []), playerId],
      };

      return copy;
    });
  }, []);

  const addTargetPlayerToRound = useCallback((playerId: string, round: number) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };

      Object.keys(copy).forEach((roundStr) => {
        const r = parseInt(roundStr);
        if (copy[r]?.playerIds.includes(playerId)) {
          copy[r] = {
            ...copy[r],
            playerIds: copy[r].playerIds.filter((id) => id !== playerId),
          };
        }
      });

      copy[round] = {
        position: copy[round]?.position ?? null,
        playerIds: [...(copy[round]?.playerIds ?? []).filter((id) => id !== playerId), playerId],
      };

      return copy;
    });
  }, []);

  return {
    roundTargets,
    setRoundTargets,
    toggleTargetPlayer,
    setRoundPositionTarget,
    moveTargetPlayer,
    addTargetPlayerToRound,
  };
}
