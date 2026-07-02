import { useCallback, useMemo, useState } from "react";
import { CpuScoreDetails, DraftPick, generateDraftSequence } from "../engine";

interface PickScoreDetails {
  finalCpuScore?: number;
  finalCpuScoreDetails?: CpuScoreDetails;
}

type CalculatePickScoreDetails = (
  playerId: string,
  pickIndex: number,
  draftPicks: DraftPick[],
  cpuScore?: number,
  cpuScoreDetails?: CpuScoreDetails
) => PickScoreDetails;

interface UseDraftStateOptions {
  calculatePickScoreDetails: CalculatePickScoreDetails;
  initialNumRounds?: number;
  initialNumTeams?: number;
  onUndoLastPick?: () => void;
}

interface UseDraftStateResult {
  picks: DraftPick[];
  currentPickIndex: number;
  currentPick: DraftPick | undefined;
  draftedPlayerIds: Set<string>;
  isDraftStarted: boolean;
  isDraftComplete: boolean;
  setIsDraftStarted: (started: boolean) => void;
  resetDraftSequence: (teamsCount: number, roundsCount: number) => void;
  draftPlayer: (playerId: string, cpuScore?: number, cpuScoreDetails?: CpuScoreDetails) => void;
  setPickPlayer: (pickIndex: number, playerId: string) => void;
  undoLastPick: () => void;
}

export function useDraftState({
  calculatePickScoreDetails,
  initialNumRounds = 30,
  initialNumTeams = 12,
  onUndoLastPick,
}: UseDraftStateOptions): UseDraftStateResult {
  const [picks, setPicks] = useState<DraftPick[]>(() => generateDraftSequence(initialNumTeams, initialNumRounds));
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  const draftedPlayerIds = useMemo(() => {
    return new Set(picks.slice(0, currentPickIndex).map((p) => p.playerDraftedId).filter(Boolean) as string[]);
  }, [picks, currentPickIndex]);

  const currentPick = picks[currentPickIndex];
  const isDraftComplete = currentPickIndex >= picks.length;

  const resetDraftSequence = useCallback((teamsCount: number, roundsCount: number) => {
    setPicks(generateDraftSequence(teamsCount, roundsCount));
    setCurrentPickIndex(0);
    setIsDraftStarted(false);
  }, []);

  const draftPlayer = useCallback((playerId: string, cpuScore?: number, cpuScoreDetails?: CpuScoreDetails) => {
    if (currentPickIndex >= picks.length) return;

    const { finalCpuScore, finalCpuScoreDetails } = calculatePickScoreDetails(
      playerId,
      currentPickIndex,
      picks,
      cpuScore,
      cpuScoreDetails
    );

    setPicks((prevPicks) => {
      const copy = [...prevPicks];
      copy[currentPickIndex] = {
        ...copy[currentPickIndex],
        playerDraftedId: playerId,
        cpuScore: finalCpuScore,
        cpuScoreDetails: finalCpuScoreDetails,
      };
      return copy;
    });

    setCurrentPickIndex((prev) => prev + 1);
  }, [currentPickIndex, picks, calculatePickScoreDetails]);

  const setPickPlayer = useCallback((pickIndex: number, playerId: string) => {
    if (pickIndex < 0 || pickIndex >= picks.length) return;

    const { finalCpuScore, finalCpuScoreDetails } = calculatePickScoreDetails(playerId, pickIndex, picks);
    const nextPicks = picks.map((pick, index) => {
      if (index === pickIndex) {
        return {
          ...pick,
          playerDraftedId: playerId,
          cpuScore: finalCpuScore,
          cpuScoreDetails: finalCpuScoreDetails,
        };
      }

      if (pick.playerDraftedId === playerId) {
        return {
          ...pick,
          playerDraftedId: null,
          cpuScore: undefined,
          cpuScoreDetails: undefined,
        };
      }

      return pick;
    });

    const firstEmptyIndex = nextPicks.findIndex((pick) => !pick.playerDraftedId);
    setPicks(nextPicks);
    setCurrentPickIndex(firstEmptyIndex === -1 ? nextPicks.length : firstEmptyIndex);
  }, [picks, calculatePickScoreDetails]);

  const undoLastPick = useCallback(() => {
    if (currentPickIndex <= 0) return;

    const lastPickIndex = currentPickIndex - 1;
    setPicks((prevPicks) => {
      const copy = [...prevPicks];
      copy[lastPickIndex] = {
        ...copy[lastPickIndex],
        playerDraftedId: null,
        cpuScore: undefined,
        cpuScoreDetails: undefined,
      };
      return copy;
    });
    setCurrentPickIndex(lastPickIndex);
    onUndoLastPick?.();
  }, [currentPickIndex, onUndoLastPick]);

  return {
    picks,
    currentPickIndex,
    currentPick,
    draftedPlayerIds,
    isDraftStarted,
    isDraftComplete,
    setIsDraftStarted,
    resetDraftSequence,
    draftPlayer,
    setPickPlayer,
    undoLastPick,
  };
}
