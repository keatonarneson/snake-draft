import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  loadDraft: (picks: DraftPick[], currentPickIndex: number, isDraftStarted: boolean) => void;
}

// picks and currentPickIndex are kept in a single state object so they always
// advance together — updating them as two separate useState values let the
// cursor drift out of sync with the picks array between renders.
interface DraftSequenceState {
  picks: DraftPick[];
  currentPickIndex: number;
}

export function useDraftState({
  calculatePickScoreDetails,
  initialNumRounds = 30,
  initialNumTeams = 12,
  onUndoLastPick,
}: UseDraftStateOptions): UseDraftStateResult {
  const [draft, setDraft] = useState<DraftSequenceState>(() => ({
    picks: generateDraftSequence(initialNumTeams, initialNumRounds),
    currentPickIndex: 0,
  }));
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  const { picks, currentPickIndex } = draft;

  // calculatePickScoreDetails closes over live projection/scarcity state and so
  // is a new function every render. Reading it through a ref keeps the draft
  // mutators (draftPlayer/setPickPlayer) stable, which is what stops the CPU
  // auto-pick effect from re-subscribing — and re-firing — on every render.
  const calcRef = useRef(calculatePickScoreDetails);
  // Latest committed state, for read-only guards that must not add `draft` to a
  // callback's dependency list (which would defeat the stability above).
  const draftRef = useRef(draft);

  // Refs are synced after commit (not during render). Every call site of the
  // mutators below runs after the effect has flushed — user clicks, timers, and
  // the CPU-pick effect (registered after this hook) — so the refs are current.
  useEffect(() => {
    calcRef.current = calculatePickScoreDetails;
    draftRef.current = draft;
  });

  const draftedPlayerIds = useMemo(() => {
    return new Set(picks.slice(0, currentPickIndex).map((p) => p.playerDraftedId).filter(Boolean) as string[]);
  }, [picks, currentPickIndex]);

  const currentPick = picks[currentPickIndex];
  const isDraftComplete = currentPickIndex >= picks.length;

  const resetDraftSequence = useCallback((teamsCount: number, roundsCount: number) => {
    setDraft({ picks: generateDraftSequence(teamsCount, roundsCount), currentPickIndex: 0 });
    setIsDraftStarted(false);
  }, []);

  const loadDraft = useCallback((nextPicks: DraftPick[], nextIndex: number, started: boolean) => {
    setDraft({ picks: nextPicks, currentPickIndex: nextIndex });
    setIsDraftStarted(started);
  }, []);

  const draftPlayer = useCallback((playerId: string, cpuScore?: number, cpuScoreDetails?: CpuScoreDetails) => {
    setDraft((prev) => {
      if (prev.currentPickIndex >= prev.picks.length) return prev;

      const { finalCpuScore, finalCpuScoreDetails } = calcRef.current(
        playerId,
        prev.currentPickIndex,
        prev.picks,
        cpuScore,
        cpuScoreDetails
      );

      const nextPicks = prev.picks.slice();
      nextPicks[prev.currentPickIndex] = {
        ...nextPicks[prev.currentPickIndex],
        playerDraftedId: playerId,
        cpuScore: finalCpuScore,
        cpuScoreDetails: finalCpuScoreDetails,
      };

      return { picks: nextPicks, currentPickIndex: prev.currentPickIndex + 1 };
    });
  }, []);

  const setPickPlayer = useCallback((pickIndex: number, playerId: string) => {
    setDraft((prev) => {
      if (pickIndex < 0 || pickIndex >= prev.picks.length) return prev;

      const { finalCpuScore, finalCpuScoreDetails } = calcRef.current(playerId, pickIndex, prev.picks);
      const nextPicks = prev.picks.map((pick, index) => {
        if (index === pickIndex) {
          return {
            ...pick,
            playerDraftedId: playerId,
            cpuScore: finalCpuScore,
            cpuScoreDetails: finalCpuScoreDetails,
          };
        }

        // Prevent the same player occupying two picks.
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

      // Editing an already-completed pick must never rewind the draft cursor.
      // Only recompute it when the edit fills the pick at (or past) the cursor.
      let nextIndex = prev.currentPickIndex;
      if (pickIndex >= prev.currentPickIndex) {
        const firstEmptyIndex = nextPicks.findIndex((pick) => !pick.playerDraftedId);
        nextIndex = firstEmptyIndex === -1 ? nextPicks.length : firstEmptyIndex;
      }

      return { picks: nextPicks, currentPickIndex: nextIndex };
    });
  }, []);

  const undoLastPick = useCallback(() => {
    if (draftRef.current.currentPickIndex <= 0) return;

    setDraft((prev) => {
      if (prev.currentPickIndex <= 0) return prev;

      const lastPickIndex = prev.currentPickIndex - 1;
      const nextPicks = prev.picks.slice();
      nextPicks[lastPickIndex] = {
        ...nextPicks[lastPickIndex],
        playerDraftedId: null,
        cpuScore: undefined,
        cpuScoreDetails: undefined,
      };
      return { picks: nextPicks, currentPickIndex: lastPickIndex };
    });
    onUndoLastPick?.();
  }, [onUndoLastPick]);

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
    loadDraft,
  };
}
