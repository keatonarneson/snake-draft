"use client";

import React, { useCallback, useMemo, useState } from "react";
import styles from "./DashboardSummary.module.css";
import {
  CategoryNeeds,
  Recommendation,
  RecommendationDecision,
  ScarcityInfo,
  TargetMetrics,
  calculateTargetMetrics,
  getRecommendationTiming,
  DraftPick,
} from "../engine";
import { Player } from "../types/draft";
import {
  PlayerFocusBar,
  PositionPressureCard,
  RecommendationCard,
  RecommendationFocus,
  TargetBoardCard,
  TargetBoardPick,
  TargetQueueCard,
} from "./dashboard-summary";

type DashboardSummaryMode = "all" | "draft" | "plan";

interface DashboardSummaryProps {
  draftedPlayers?: { player: Player; overallPick: number; round: number; teamName: string; teamIndex: number }[];
  recommendations: Recommendation[];
  scarcityMap: Record<string, ScarcityInfo>;
  onDraftPlayer: (playerId: string) => void;
  focusedPlayerId?: string | null;
  onFocusPlayer?: (playerId: string) => void;
  draftActionLabel?: string;
  isOnClock: boolean;
  isDraftStarted?: boolean;
  roundTargets?: Record<number, { position: string | null; playerIds: string[] }>;
  onSetRoundPositionTarget?: (round: number, position: string | null) => void;
  onMoveTargetPlayer?: (playerId: string, fromRound: number, toRound: number) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  onAddTargetPlayerToRound?: (playerId: string, round: number) => void;
  userPicks?: DraftPick[];
  draftedPlayerIds?: Set<string>;
  currentPickIndex?: number;
  allPlayers?: Player[];
  displayMode?: DashboardSummaryMode;
  categoryNeeds?: CategoryNeeds;
  userRosterSize?: number;
}

export default function DashboardSummary({
  draftedPlayers = [],
  recommendations,
  scarcityMap,
  onDraftPlayer,
  focusedPlayerId,
  onFocusPlayer,
  draftActionLabel,
  isOnClock,
  isDraftStarted = true,
  roundTargets = {},
  onSetRoundPositionTarget,
  onMoveTargetPlayer,
  onToggleTargetPlayer,
  onAddTargetPlayerToRound,
  userPicks = [],
  draftedPlayerIds = new Set(),
  currentPickIndex = 0,
  allPlayers = [],
  displayMode = "all",
}: DashboardSummaryProps) {
  const [recommendationFocus, setRecommendationFocus] = useState<RecommendationFocus>("all");

  const sortedRecommendations = useMemo(
    () => [...recommendations].sort((a, b) => b.score - a.score),
    [recommendations]
  );
  const recommendationMap = useMemo(() => {
    return new Map(sortedRecommendations.map((recommendation) => [recommendation.player.id, recommendation]));
  }, [sortedRecommendations]);
  const draftedPlayerMap = useMemo(() => {
    return new Map(draftedPlayers.map((draftedPlayer) => [draftedPlayer.player.id, draftedPlayer]));
  }, [draftedPlayers]);

  // playerId -> earliest round it is queued as a target, so recommendations can
  // badge queued players and filter to them without re-walking roundTargets.
  const targetRoundByPlayerId = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(roundTargets).forEach(([round, target]) => {
      const roundNumber = Number(round);
      target.playerIds.forEach((playerId) => {
        const existing = map.get(playerId);
        if (existing === undefined || roundNumber < existing) {
          map.set(playerId, roundNumber);
        }
      });
    });
    return map;
  }, [roundTargets]);

  const currentOverallPick = (currentPickIndex ?? 0) + 1;
  const nextUserPick = userPicks.find((pick) => pick.overallPick > currentOverallPick);
  const picksUntilNextTurn = nextUserPick
    ? Math.max(1, nextUserPick.overallPick - currentOverallPick)
    : 12;
  const bestOverallScore = sortedRecommendations[0]?.score ?? 0;

  const getDecision = useCallback((recommendation: Recommendation): RecommendationDecision =>
    getRecommendationTiming(recommendation, {
      currentOverallPick,
      bestOverallScore,
      picksUntilNextTurn,
    }),
  [bestOverallScore, currentOverallPick, picksUntilNextTurn]);

  const targetBoardData = useMemo<TargetBoardPick[]>(() => {
    const futureUserPicks = userPicks.filter((p) => p.overallPick >= currentPickIndex + 1);
    const nextUserPicks = futureUserPicks.slice(0, 4);

    const otherPicksWithTargets = futureUserPicks.slice(4).filter((p) => {
      const target = roundTargets[p.round];
      return target && (target.position !== null || target.playerIds.length > 0);
    });

    const allVisiblePicks = [...nextUserPicks, ...otherPicksWithTargets];

    return allVisiblePicks.map((pick) => {
      const target = roundTargets[pick.round] || { position: null, playerIds: [] };

      const resolvedPlayers = target.playerIds
        .map((id) => {
          const player = allPlayers.find((p) => p.id === id);
          if (!player) return null;

          const metrics = calculateTargetMetrics(
            player,
            (currentPickIndex ?? 0) + 1,
            userPicks,
            draftedPlayerIds ?? new Set()
          );

          const roundProbEntry = metrics.survivalProbabilities.find(sp => sp.round === pick.round);
          const roundSurvivalProb = roundProbEntry
            ? roundProbEntry.probability
            : (pick.overallPick < (currentPickIndex ?? 0) + 1 ? 1.0 : 0.0);

          return { player, metrics, roundSurvivalProb };
        })
        .filter((item): item is { player: Player; metrics: TargetMetrics; roundSurvivalProb: number } => item !== null);

      const positionCandidates = target.position
        ? recommendations
            .filter((rec) => {
              const p = rec.player;
              const matchesPos = target.position === "UT" ? !p.isPitcher : p.positions.includes(target.position!);
              const alreadyTargeted = Object.values(roundTargets).some((t) => t.playerIds.includes(p.id));
              return matchesPos && !alreadyTargeted;
            })
            .slice(0, 3)
            .map((rec) => {
              const player = rec.player;
              const metrics = calculateTargetMetrics(
                player,
                (currentPickIndex ?? 0) + 1,
                userPicks,
                draftedPlayerIds ?? new Set()
              );
              const roundProbEntry = metrics.survivalProbabilities.find(sp => sp.round === pick.round);
              const roundSurvivalProb = roundProbEntry
                ? roundProbEntry.probability
                : (pick.overallPick < (currentPickIndex ?? 0) + 1 ? 1.0 : 0.0);
              return { player, roundSurvivalProb };
            })
        : [];

      return {
        round: pick.round,
        overallPick: pick.overallPick,
        positionTarget: target.position,
        players: resolvedPlayers,
        candidates: positionCandidates,
      };
    });
  }, [userPicks, currentPickIndex, roundTargets, allPlayers, draftedPlayerIds, recommendations]);

  const showPlanCards = displayMode === "all" || displayMode === "plan";
  const showRecommendationCard = displayMode === "all" || displayMode === "draft";
  // Both the live and planning workspaces inspect players, so both get the bar.
  const showFocusBar = displayMode === "draft" || displayMode === "plan";
  const focusedPlayer = focusedPlayerId ? allPlayers.find((player) => player.id === focusedPlayerId) : null;
  const focusedTargetRound = focusedPlayerId
    ? targetBoardData.find((pick) => pick.players.some(({ player }) => player.id === focusedPlayerId))?.round
    : undefined;

  return (
    <div className={styles.summaryStack}>
      {showFocusBar && (
        <PlayerFocusBar
          player={focusedPlayer}
          recommendation={focusedPlayer ? recommendationMap.get(focusedPlayer.id) : undefined}
          draftedDetail={focusedPlayer ? draftedPlayerMap.get(focusedPlayer.id) : undefined}
          targetRound={focusedTargetRound}
          isTargeted={focusedTargetRound !== undefined}
          isOnClock={isOnClock}
          draftActionLabel={draftActionLabel}
          onDraftPlayer={onDraftPlayer}
          onToggleTargetPlayer={onToggleTargetPlayer}
        />
      )}

      {showPlanCards && (
        <>
          {/* The board is the point of this tab, so it leads; pressure is context. */}
          <TargetBoardCard
            targetBoardData={targetBoardData}
            userPicks={userPicks}
            currentPickIndex={currentPickIndex}
            draftedPlayerIds={draftedPlayerIds}
            isOnClock={isOnClock}
            onDraftPlayer={onDraftPlayer}
            draftActionLabel={draftActionLabel}
            scarcityMap={scarcityMap}
            onFocusPlayer={onFocusPlayer}
            onSetRoundPositionTarget={onSetRoundPositionTarget}
            onMoveTargetPlayer={onMoveTargetPlayer}
            onToggleTargetPlayer={onToggleTargetPlayer}
            onAddTargetPlayerToRound={onAddTargetPlayerToRound}
          />

          <PositionPressureCard scarcityMap={scarcityMap} />
        </>
      )}

      {displayMode === "draft" ? (
        <>
          <TargetQueueCard
            targetBoardData={targetBoardData}
            draftedPlayerIds={draftedPlayerIds}
            userPicks={userPicks}
            currentPickIndex={currentPickIndex}
            onFocusPlayer={onFocusPlayer}
            onToggleTargetPlayer={onToggleTargetPlayer}
            onMoveTargetPlayer={onMoveTargetPlayer}
          />

          <RecommendationCard
            sortedRecommendations={sortedRecommendations}
            recommendationFocus={recommendationFocus}
            setRecommendationFocus={setRecommendationFocus}
            getDecision={getDecision}
            currentOverallPick={currentOverallPick}
            onFocusPlayer={onFocusPlayer}
            targetRoundByPlayerId={targetRoundByPlayerId}
            isDraftStarted={isDraftStarted}
            isOnClock={isOnClock}
            onDraftPlayer={onDraftPlayer}
            draftActionLabel={draftActionLabel}
          />
        </>
      ) : showRecommendationCard && (
          <RecommendationCard
            sortedRecommendations={sortedRecommendations}
            recommendationFocus={recommendationFocus}
            setRecommendationFocus={setRecommendationFocus}
            getDecision={getDecision}
            currentOverallPick={currentOverallPick}
            onFocusPlayer={onFocusPlayer}
            targetRoundByPlayerId={targetRoundByPlayerId}
            isDraftStarted={isDraftStarted}
          />
      )}
    </div>
  );
}
