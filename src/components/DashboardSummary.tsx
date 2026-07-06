"use client";

import React, { useCallback, useMemo, useState } from "react";
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
  CategoryNeedSummaryItem,
  PositionPressureCard,
  RecommendationCard,
  RecommendationFocus,
  TargetBoardCard,
  TargetBoardPick,
} from "./dashboard-summary";

type DashboardSummaryMode = "all" | "draft" | "plan";

const HITTING_CATEGORY_FOCUSES = ["R", "HR", "RBI", "SB", "AVG"];
const PITCHING_CATEGORY_FOCUSES = ["W", "SV", "SO", "ERA", "WHIP"];

interface DashboardSummaryProps {
  recommendations: Recommendation[];
  scarcityMap: Record<string, ScarcityInfo>;
  onDraftPlayer: (playerId: string) => void;
  draftActionLabel?: string;
  isOnClock: boolean;
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
  recommendations,
  scarcityMap,
  onDraftPlayer,
  draftActionLabel,
  isOnClock,
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
  categoryNeeds,
  userRosterSize = 0,
}: DashboardSummaryProps) {
  const [recommendationFocus, setRecommendationFocus] = useState<RecommendationFocus>("all");

  const sortedRecommendations = useMemo(
    () => [...recommendations].sort((a, b) => b.score - a.score),
    [recommendations]
  );

  const displayRecs = useMemo(() => {
    const urgent = sortedRecommendations.filter((recommendation) => recommendation.pReturn < 1.0);
    const urgentIds = new Set(urgent.map((recommendation) => recommendation.player.id));
    const likelyToReturn = sortedRecommendations.filter((recommendation) => !urgentIds.has(recommendation.player.id));

    return [...urgent, ...likelyToReturn].slice(0, 4);
  }, [sortedRecommendations]);

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

  const categoryNeedSummary = useMemo<CategoryNeedSummaryItem[]>(() => {
    if (!categoryNeeds || userRosterSize === 0) return [];

    const categories = [
      ...HITTING_CATEGORY_FOCUSES.map((category) => ({ category, group: "Hit" as const })),
      ...PITCHING_CATEGORY_FOCUSES.map((category) => ({ category, group: "Pit" as const })),
    ];

    return categories
      .map(({ category, group }) => ({
        category,
        group,
        need: categoryNeeds[category as keyof CategoryNeeds],
      }))
      .filter((item) => item.need > 0.15)
      .sort((a, b) => b.need - a.need)
      .slice(0, 6);
  }, [categoryNeeds, userRosterSize]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {showPlanCards && (
        <>
          <TargetBoardCard
            targetBoardData={targetBoardData}
            userPicks={userPicks}
            currentPickIndex={currentPickIndex}
            draftedPlayerIds={draftedPlayerIds}
            isOnClock={isOnClock}
            onDraftPlayer={onDraftPlayer}
            draftActionLabel={draftActionLabel}
            onSetRoundPositionTarget={onSetRoundPositionTarget}
            onMoveTargetPlayer={onMoveTargetPlayer}
            onToggleTargetPlayer={onToggleTargetPlayer}
            onAddTargetPlayerToRound={onAddTargetPlayerToRound}
          />

          <PositionPressureCard scarcityMap={scarcityMap} />
        </>
      )}

      {showRecommendationCard && (
        <RecommendationCard
          sortedRecommendations={sortedRecommendations}
          displayRecs={displayRecs}
          recommendationFocus={recommendationFocus}
          setRecommendationFocus={setRecommendationFocus}
          getDecision={getDecision}
          currentOverallPick={currentOverallPick}
          onDraftPlayer={onDraftPlayer}
          draftActionLabel={draftActionLabel}
          isOnClock={isOnClock}
          categoryNeedSummary={categoryNeedSummary}
          userRosterSize={userRosterSize}
        />
      )}
    </div>
  );
}
