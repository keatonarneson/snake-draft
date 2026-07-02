"use client";

import React, { useCallback, useMemo, useState } from "react";
import styles from "./DashboardSummary.module.css";
import { CategoryNeeds, Recommendation, ScarcityInfo, TargetMetrics, calculateTargetMetrics, DraftPick } from "../engine";
import { Player } from "../types/draft";

type RecommendationFocus =
  | "all"
  | "hitters"
  | "pitchers"
  | `position:${string}`
  | `category:${string}`;

type RecommendationDecision = "draft" | "consider" | "wait";
type DashboardSummaryMode = "all" | "draft" | "plan";

const POSITION_FOCUSES = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];
const HITTING_CATEGORY_FOCUSES = ["R", "HR", "RBI", "SB", "AVG"];
const PITCHING_CATEGORY_FOCUSES = ["W", "SV", "SO", "ERA", "WHIP"];

interface DashboardSummaryProps {
  recommendations: Recommendation[];
  scarcityMap: Record<string, ScarcityInfo>;
  onDraftPlayer: (playerId: string) => void;
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

  const categoryContribution = (player: Player, category: string) => {
    const stats = player.stats;

    switch (category) {
      case "AVG":
        return ((stats.AVG || 0) - 0.260) * (stats.AB || 500);
      case "ERA":
        return (4.00 - (stats.ERA || 4.00)) * (stats.IP || 100);
      case "WHIP":
        return (1.25 - (stats.WHIP || 1.25)) * (stats.IP || 100) * 4;
      default:
        return Number(stats[category as keyof typeof stats] || 0);
    }
  };

  const currentOverallPick = (currentPickIndex ?? 0) + 1;
  const nextUserPick = userPicks.find((pick) => pick.overallPick > currentOverallPick);
  const picksUntilNextTurn = nextUserPick
    ? Math.max(1, nextUserPick.overallPick - currentOverallPick)
    : 12;
  const bestOverallScore = sortedRecommendations[0]?.score ?? 0;

  const getDecision = useCallback((recommendation: Recommendation): RecommendationDecision => {
    const picksAheadOfMarket = recommendation.player.adp - currentOverallPick;
    const scoreGap = bestOverallScore - recommendation.score;
    const likelyToReturn = recommendation.pReturn >= 0.70;
    const clearReach =
      picksAheadOfMarket > Math.max(10, picksUntilNextTurn * 0.7) ||
      recommendation.reachPenalty <= -4;

    if (likelyToReturn && clearReach) return "wait";
    if (recommendation.pReturn < 0.40 && scoreGap <= 8) return "draft";
    if (picksAheadOfMarket <= 6 && scoreGap <= 5) return "draft";
    if (recommendation.pReturn < 0.72 || scoreGap <= 10) return "consider";
    return "wait";
  }, [bestOverallScore, currentOverallPick, picksUntilNextTurn]);

  const focusedRecommendations = useMemo(() => {
    if (recommendationFocus === "all") return displayRecs;

    let eligible = sortedRecommendations;
    if (recommendationFocus === "hitters") {
      eligible = eligible.filter((recommendation) => !recommendation.player.isPitcher);
    } else if (recommendationFocus === "pitchers") {
      eligible = eligible.filter((recommendation) => recommendation.player.isPitcher);
    } else if (recommendationFocus.startsWith("position:")) {
      const position = recommendationFocus.slice("position:".length);
      eligible = eligible.filter((recommendation) => recommendation.player.positions.includes(position));
    } else if (recommendationFocus.startsWith("category:")) {
      const category = recommendationFocus.slice("category:".length);
      const isPitchingCategory = PITCHING_CATEGORY_FOCUSES.includes(category);
      const decisionOrder: Record<RecommendationDecision, number> = {
        draft: 0,
        consider: 0,
        wait: 1,
      };

      eligible = eligible
        .filter((recommendation) => recommendation.player.isPitcher === isPitchingCategory)
        .sort((a, b) => {
          const timingDifference = decisionOrder[getDecision(a)] - decisionOrder[getDecision(b)];
          if (timingDifference !== 0) return timingDifference;

          const contributionDifference =
            categoryContribution(b.player, category) - categoryContribution(a.player, category);
          return contributionDifference || b.score - a.score;
        });
    }

    return eligible.slice(0, 4);
  }, [
    recommendationFocus,
    sortedRecommendations,
    displayRecs,
    getDecision,
  ]);

  const getDecisionReason = (recommendation: Recommendation, decision: RecommendationDecision) => {
    const picksAheadOfMarket = Math.round(recommendation.player.adp - currentOverallPick);

    if (decision === "wait") {
      if (recommendation.pReturn >= 0.70) {
        return `${formatPercent(recommendation.pReturn)} chance to reach your next pick`;
      }
      if (picksAheadOfMarket > 0) return `Market is about ${picksAheadOfMarket} picks away`;
      return "Better overall values are available now";
    }
    if (decision === "draft") {
      return recommendation.pReturn < 0.40
        ? "Unlikely to make it back"
        : "Fits the current pick range";
    }
    return recommendation.pReturn >= 0.50
      ? "Viable, but waiting may preserve value"
      : "Reasonable fit if this is your priority";
  };

  const focusLabel = recommendationFocus.startsWith("position:")
    ? recommendationFocus.slice("position:".length)
    : recommendationFocus.startsWith("category:")
      ? recommendationFocus.slice("category:".length)
      : recommendationFocus === "all"
        ? "Overall"
        : recommendationFocus[0].toUpperCase() + recommendationFocus.slice(1);

  const overallAlternatives = recommendationFocus === "all"
    ? []
    : displayRecs
        .filter((recommendation) => !focusedRecommendations.some((focused) => focused.player.id === recommendation.player.id))
        .slice(0, 2);

  const categoryNeedSummary = useMemo(() => {
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

  const targetBoardData = useMemo(() => {
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

  const getScarcityLevel = (pressureScore: number) => {
    if (pressureScore >= 5.0) return "high";
    if (pressureScore >= 1.5) return "med";
    return "low";
  };

  const getMarketLevelColor = (level: "low" | "medium" | "high") => {
    if (level === "high") return "var(--danger)";
    if (level === "medium") return "var(--warning)";
    return "var(--success)";
  };

  const getMarketLevelLabel = (level: "low" | "medium" | "high") => {
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Low";
  };

  const getReturnLevel = (p: number) => {
    if (p >= 0.70) return "high";
    if (p >= 0.30) return "med";
    return "low";
  };

  const getCategoryNeedLabel = (need: number) => {
    if (need >= 1.0) return "High";
    if (need >= 0.45) return "Medium";
    return "Light";
  };

  const getCategoryNeedColor = (need: number) => {
    if (need >= 1.0) return "var(--danger)";
    if (need >= 0.45) return "var(--warning)";
    return "var(--secondary)";
  };

  const formatPercent = (p: number) => {
    return `${Math.round(p * 100)}%`;
  };

  const renderRecommendation = (rec: Recommendation, index: number, compact = false) => {
    const returnLevel = getReturnLevel(rec.pReturn);
    const scarcityPremium = rec.scarcityDropOff * (1.0 - rec.pReturn) * rec.weights.scarcity;
    const decision = getDecision(rec);
    const decisionLabel = decision === "draft" ? "Draft Now" : decision === "consider" ? "Consider" : "Wait";
    const focusedCategory = recommendationFocus.startsWith("category:")
      ? recommendationFocus.slice("category:".length)
      : null;

    return (
      <div key={rec.player.id} className={styles.recItem} data-decision={decision}>
        <div className={styles.recItemLeft}>
          <span className={styles.recRank}>{index + 1}</span>
          <div className={styles.recInfo}>
            <div className={styles.recNameRow}>
              <span className={styles.recName}>{rec.player.name}</span>
              {!compact && (
                <span className={styles.recDecision} data-decision={decision}>
                  {decisionLabel}
                </span>
              )}
            </div>
            <span className={styles.recSub}>
              {rec.player.team} | {rec.player.positions.join("/")} | ADP {rec.player.adp.toFixed(0)}
            </span>
            {!compact && (
              <span className={styles.recDecisionReason}>
                {getDecisionReason(rec, decision)}
                {focusedCategory && (
                  <> | {focusedCategory}: {formatCategoryContribution(rec.player, focusedCategory)}</>
                )}
              </span>
            )}
          </div>
        </div>

        <div className={styles.recItemRight}>
          <div className={styles.recMetric}>
            <span className={styles.recMetricLabel}>Return</span>
            <span
              className={`${styles.recReturnGlow} ${styles.recMetricVal}`}
              data-level={returnLevel}
            >
              {formatPercent(rec.pReturn)}
            </span>
          </div>

          <div className={styles.recMetric}>
            <span className={styles.recMetricLabel}>Score</span>
            <span className={styles.recMetricVal} style={{ color: "var(--primary)" }}>
              {rec.score.toFixed(1)}
            </span>
            {!compact && (
              <span
                className={styles.recScoreDetail}
                title={`Draft Phase: ${rec.phase.toUpperCase()}\nBase Value: $${rec.player.value.toFixed(1)}\nScarcity Premium: +$${scarcityPremium.toFixed(1)}\nStats Adjustment: ${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(1)}\nUpside Bonus: +$${rec.upsideBonus.toFixed(1)}\nReach Penalty: ${rec.reachPenalty.toFixed(1)}${rec.isBench ? `\nBench Penalty: x${rec.weights.benchDiscount}` : ""}`}
              >
                {rec.reachPenalty < 0 ? `${rec.reachPenalty.toFixed(1)} reach` : rec.phase}
              </span>
            )}
          </div>

          <button
            className={`btn ${isOnClock && decision !== "wait" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
            onClick={() => onDraftPlayer(rec.player.id)}
          >
            {decision === "wait" ? "Draft Anyway" : "Draft"}
          </button>
        </div>
      </div>
    );
  };

  function formatCategoryContribution(player: Player, category: string) {
    const value = player.stats[category as keyof typeof player.stats];
    if (category === "AVG") return Number(value || 0).toFixed(3);
    if (category === "ERA" || category === "WHIP") return Number(value || 0).toFixed(2);
    return Math.round(Number(value || 0)).toString();
  }

  const showPlanCards = displayMode === "all" || displayMode === "plan";
  const showRecommendationCard = displayMode === "all" || displayMode === "draft";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {showPlanCards && (
        <>
      {/* Target Board Card */}
      <div className="card glow-panel">
        <div className="cardHeader">
          <h3 className="cardTitle">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--warning)" }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Target Board (Draft Plan)
          </h3>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-6px" }}>
          Plan your upcoming picks by targeting positions or starring groups of players for specific rounds.
        </p>

        {targetBoardData.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>No upcoming picks</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {targetBoardData.map((pick) => {
              const hasPlayerTargets = pick.players.length > 0;
              const POSITIONS = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "UT"];

              return (
                <div 
                  key={pick.round} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "8px", 
                    background: "rgba(255,255,255,0.02)", 
                    border: "1px solid rgba(255,255,255,0.05)", 
                    borderRadius: "8px", 
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                        Rd {pick.round} <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "0.75rem" }}>(Pick {pick.overallPick})</span>
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target Pos:</span>
                      {onSetRoundPositionTarget && (
                        <select
                          value={pick.positionTarget || ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : e.target.value;
                            onSetRoundPositionTarget(pick.round, val);
                          }}
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "var(--text-primary)",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            padding: "2px 4px",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">None</option>
                          {POSITIONS.map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Player targets for this round */}
                  {hasPlayerTargets ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px" }}>
                      {pick.players.map(({ player, metrics }) => {
                        const isPlayerDrafted = draftedPlayerIds.has(player.id);

                        // Build the timeline array
                        const timeline = (() => {
                          const list: { round: number; label: string; probability: number }[] = [];
                          
                          const nextPick = userPicks.find((up) => up.overallPick >= (currentPickIndex ?? 0) + 1);
                          const nextRound = nextPick ? nextPick.round : -1;
                          const optRound = metrics.optimalRound;
                          const targetRound = pick.round;
                          
                          const roundsToInclude = new Set<number>();
                          if (nextRound !== -1) roundsToInclude.add(nextRound);
                          if (optRound !== -1) roundsToInclude.add(optRound);
                          if (targetRound !== -1) roundsToInclude.add(targetRound);
                          
                          let sortedRounds = Array.from(roundsToInclude).sort((a, b) => a - b);
                          
                          if (sortedRounds.length < 3) {
                            const futureRounds = userPicks
                              .filter((up) => up.overallPick >= (currentPickIndex ?? 0) + 1)
                              .map((up) => up.round);
                              
                            for (const r of futureRounds) {
                              if (sortedRounds.length >= 3) break;
                              if (!roundsToInclude.has(r)) {
                                roundsToInclude.add(r);
                                sortedRounds.push(r);
                              }
                            }
                            sortedRounds = sortedRounds.sort((a, b) => a - b);
                          }
                          
                          sortedRounds.forEach((r) => {
                            const probEntry = metrics.survivalProbabilities.find((sp) => sp.round === r);
                            let probability = 0;
                            if (probEntry) {
                              probability = probEntry.probability;
                            } else if (r < nextRound) {
                              probability = 1.0;
                            } else {
                              probability = 0.0;
                            }
                            
                            const labels: string[] = [];
                            if (r === nextRound) labels.push("Next");
                            if (r === optRound) labels.push("Sugg");
                            if (r === targetRound) labels.push("Target");
                            
                            const labelStr = labels.length > 0 ? `Rd ${r} (${labels.join("/")})` : `Rd ${r}`;
                            
                            list.push({
                              round: r,
                              label: labelStr,
                              probability,
                            });
                          });
                          
                          return list;
                        })();
                        
                        return (
                          <div 
                            key={player.id} 
                            style={{ 
                              display: "flex", 
                              flexDirection: "column", 
                              gap: "6px", 
                              background: "rgba(255,255,255,0.012)", 
                              border: "1px dashed rgba(255,255,255,0.04)", 
                              borderRadius: "6px", 
                              padding: "8px 10px",
                              opacity: isPlayerDrafted ? 0.55 : 1,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8rem" }}>
                                  {player.name}
                                </span>
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                  ADP {player.adp.toFixed(0)} • {player.positions.join("/")}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {/* Move Round Selector */}
                                {onMoveTargetPlayer && (
                                  <select
                                    value={pick.round}
                                    onChange={(e) => {
                                      const targetRound = parseInt(e.target.value);
                                      onMoveTargetPlayer(player.id, pick.round, targetRound);
                                    }}
                                    style={{
                                      background: "rgba(0,0,0,0.35)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      color: "var(--text-primary)",
                                      borderRadius: "4px",
                                      fontSize: "0.65rem",
                                      padding: "1px 3px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {userPicks.map((up) => (
                                      <option key={up.round} value={up.round}>Rd {up.round}</option>
                                    ))}
                                  </select>
                                )}

                                {/* Unstar / Remove icon */}
                                {onToggleTargetPlayer && (
                                  <button
                                    onClick={() => onToggleTargetPlayer(player.id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      cursor: "pointer",
                                      color: "var(--warning)",
                                      display: "flex",
                                      alignItems: "center"
                                    }}
                                    title="Remove target"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Timeline row */}
                            {!isPlayerDrafted && (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", background: "rgba(0,0,0,0.15)", borderRadius: "4px", padding: "4px 8px", marginTop: "2px" }}>
                                <span style={{ color: "var(--text-muted)", marginRight: "4px" }}>Timeline:</span>
                                {timeline.map((step, idx) => {
                                  const isTarget = step.round === pick.round;
                                  const isOpt = step.round === metrics.optimalRound;
                                  
                                  let textColor = "var(--text-secondary)";
                                  if (step.probability >= 0.7) textColor = "var(--success)";
                                  else if (step.probability >= 0.3) textColor = "var(--warning)";
                                  else textColor = "var(--danger)";

                                  return (
                                    <React.Fragment key={step.round}>
                                      {idx > 0 && <span style={{ color: "rgba(255,255,255,0.15)" }}>➔</span>}
                                      <span 
                                        style={{ 
                                          fontWeight: isTarget ? 700 : 500, 
                                          color: isTarget ? "var(--text-primary)" : "var(--text-muted)",
                                          borderBottom: isOpt ? "1px dashed var(--warning)" : "none",
                                          paddingBottom: isOpt ? "1px" : "0",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "2px"
                                        }}
                                        title={isOpt ? "Suggested Draft Round" : undefined}
                                      >
                                        {step.label}: <span style={{ color: textColor, fontWeight: 600 }}>{Math.round(step.probability * 100)}%</span>
                                        {isTarget && <span style={{ color: "var(--warning)", fontSize: "0.55rem" }}>★</span>}
                                      </span>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Draft button if player is active and user is on clock */}
                            {!isPlayerDrafted && isOnClock && (
                              <button
                                className="btn btn-primary"
                                style={{ width: "100%", padding: "3px", fontSize: "0.7rem", marginTop: "2px" }}
                                onClick={() => onDraftPlayer(player.id)}
                              >
                                Draft {player.name}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px", fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No player targets assigned. Star players in the pool to add them.
                    </div>
                  )}

                  {/* Position Target Candidates recommendation */}
                  {pick.positionTarget && pick.candidates && pick.candidates.length > 0 && (
                    <div style={{ borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px", marginTop: "4px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
                        Suggested {pick.positionTarget} Targets:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {pick.candidates.map(({ player, roundSurvivalProb }) => (
                          <div 
                            key={player.id}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "6px", 
                              background: "rgba(255,255,255,0.025)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              borderRadius: "4px",
                              padding: "3px 6px",
                              fontSize: "0.68rem"
                            }}
                          >
                            <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{player.name}</span>
                            <span style={{ fontSize: "0.6rem", color: roundSurvivalProb >= 0.7 ? "var(--success)" : roundSurvivalProb >= 0.3 ? "var(--warning)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                              {Math.round(roundSurvivalProb * 100)}%
                            </span>
                            {onAddTargetPlayerToRound && (
                              <button
                                onClick={() => onAddTargetPlayerToRound(player.id, pick.round)}
                                style={{
                                  background: "rgba(255, 193, 7, 0.15)",
                                  border: "none",
                                  color: "var(--warning)",
                                  borderRadius: "3px",
                                  padding: "1px 4px",
                                  fontSize: "0.6rem",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(255, 193, 7, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(255, 193, 7, 0.15)";
                                }}
                                title={`Target ${player.name} for Round ${pick.round}`}
                              >
                                + Target
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Position Pressure Card */}
      <div className="card glow-panel">
        <div className="cardHeader">
          <h3 className="cardTitle">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Position Pressure
          </h3>
        </div>
        
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-6px" }}>
          Separates projection value loss from ADP market pressure. RP pressure only counts save sources.
        </p>

        <div className={styles.scarcityGrid}>
          {Object.entries(scarcityMap).map(([pos, info], index) => {
            const valueLevel = getScarcityLevel(info.valueDropOff);
            const marketColor = getMarketLevelColor(info.marketPressureLevel);
            const totalItems = Object.keys(scarcityMap).length;
            const isLeft = index <= 1;
            const isRight = index >= totalItems - 2;
            const tooltipClass = isLeft 
              ? `${styles.scarcityTooltip} ${styles.scarcityTooltipLeft}` 
              : isRight 
                ? `${styles.scarcityTooltip} ${styles.scarcityTooltipRight}` 
                : styles.scarcityTooltip;

            return (
              <div 
                key={pos} 
                className={styles.scarcityItem} 
                data-scarcity={valueLevel}
                style={{ cursor: "help" }}
              >
                <span className={styles.scarcityPos}>{pos}</span>
                <span
                  className={styles.scarcityDropoff}
                  style={{
                    color:
                      valueLevel === "high"
                        ? "var(--danger)"
                        : valueLevel === "med"
                        ? "var(--warning)"
                        : "var(--success)",
                  }}
                >
                  ${info.valueDropOff.toFixed(1)}
                  <span className={styles.scarcityDropoffUnit}> value</span>
                </span>
                <span className={styles.scarcityCount}>
                  Market: <span style={{ color: marketColor, fontWeight: 800 }}>{getMarketLevelLabel(info.marketPressureLevel)}</span>
                </span>

                {/* Detailed Hover Tooltip */}
                <div className={tooltipClass}>
                  <div className={styles.tooltipHeader}>
                    <span>{pos} Pressure Details</span>
                    <span className={styles.tooltipRemaining}>
                      {info.remainingCount} {pos === "RP" ? "save sources" : "left"}
                    </span>
                  </div>
                  
                  {info.bestPlayerNow ? (
                    <>
                      <div className={styles.tooltipSection}>
                        <span className={styles.tooltipSectionTitle}>Best Available Now</span>
                        <div className={styles.tooltipPlayerRow}>
                          <span className={styles.tooltipPlayerName}>{info.bestPlayerNow.name}</span>
                          <span className={styles.tooltipPlayerValue}>${info.bestPlayerNow.value.toFixed(1)}</span>
                        </div>
                      </div>

                      {info.expectedPlayersNext && info.expectedPlayersNext.length > 0 && (
                        <div className={styles.tooltipSection}>
                          <span className={styles.tooltipSectionTitle}>Expected Next Turn (if you wait)</span>
                          <div className={styles.tooltipExpectedList}>
                            {info.expectedPlayersNext.map((p, idx) => (
                              <div key={idx} className={styles.tooltipExpectedPlayer}>
                                <div className={styles.tooltipExpectedLeft}>
                                  <span className={styles.tooltipPlayerNameMini}>{p.name}</span>
                                  <span className={styles.tooltipPlayerValueMini}>${p.value.toFixed(1)}</span>
                                </div>
                                <div className={styles.tooltipExpectedRight}>
                                  <span 
                                    className={styles.tooltipProbBadge} 
                                    style={{
                                      color: p.pReturn >= 0.7 ? "var(--success)" : p.pReturn >= 0.3 ? "var(--warning)" : "var(--danger)",
                                      background: p.pReturn >= 0.7 ? "var(--success-glow)" : p.pReturn >= 0.3 ? "var(--warning-glow)" : "var(--danger-glow)"
                                    }}
                                  >
                                    {Math.round(p.pReturn * 100)}% return
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {info.marketWatchlist && info.marketWatchlist.length > 0 && (
                        <div className={styles.tooltipSection}>
                          <span className={styles.tooltipSectionTitle}>ADP Market Watch</span>
                          <div className={styles.tooltipExpectedList}>
                            {info.marketWatchlist.map((p, idx) => (
                              <div key={`${p.name}-${idx}`} className={styles.tooltipExpectedPlayer}>
                                <div className={styles.tooltipExpectedLeft}>
                                  <span className={styles.tooltipPlayerNameMini}>{p.name}</span>
                                  <span className={styles.tooltipPlayerValueMini}>ADP {p.adp.toFixed(0)}</span>
                                </div>
                                <div className={styles.tooltipExpectedRight}>
                                  <span
                                    className={styles.tooltipProbBadge}
                                    style={{
                                      color: p.pReturn >= 0.7 ? "var(--success)" : p.pReturn >= 0.3 ? "var(--warning)" : "var(--danger)",
                                      background: p.pReturn >= 0.7 ? "var(--success-glow)" : p.pReturn >= 0.3 ? "var(--warning-glow)" : "var(--danger-glow)"
                                    }}
                                  >
                                    {Math.round(p.pReturn * 100)}% return
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={styles.tooltipFooter}>
                        <div className={styles.tooltipFooterRow}>
                          <span>Value Drop:</span>
                          <span>${info.valueDropOff.toFixed(1)}</span>
                        </div>
                        <div className={styles.tooltipFooterRow}>
                          <span>Market Pressure:</span>
                          <span style={{ color: marketColor, fontWeight: 700 }}>
                            {getMarketLevelLabel(info.marketPressureLevel)} ({info.marketPlayersAtRisk.toFixed(1)} expected gone)
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
                      No players remaining at this position.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {showRecommendationCard && (
        <>
        {/* Recommended Picks Card */}
        <div className="card glow-panel">
        <div className="cardHeader">
          <h3 className="cardTitle">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Draft Recommendations
          </h3>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-6px" }}>
          Focus on a roster goal without losing draft timing or the best overall alternatives.
        </p>

        <div className={styles.recFocusToolbar}>
          <div className={styles.recFocusTabs} aria-label="Recommendation player type">
            {([
              { id: "all", label: "All" },
              { id: "hitters", label: "Hitters" },
              { id: "pitchers", label: "Pitchers" },
            ] as const).map((focus) => (
              <button
                key={focus.id}
                type="button"
                className={styles.recFocusTab}
                data-active={recommendationFocus === focus.id}
                onClick={() => setRecommendationFocus(focus.id)}
              >
                {focus.label}
              </button>
            ))}
          </div>

          <div className={styles.recFocusMenus}>
            <label className={styles.recFocusMenu}>
              <span>Position</span>
              <select
                value={recommendationFocus.startsWith("position:") ? recommendationFocus : ""}
                onChange={(event) =>
                  setRecommendationFocus((event.target.value || "all") as RecommendationFocus)
                }
              >
                <option value="">Any</option>
                {POSITION_FOCUSES.map((position) => (
                  <option key={position} value={`position:${position}`}>{position}</option>
                ))}
              </select>
            </label>

            <label className={styles.recFocusMenu}>
              <span>Category</span>
              <select
                value={recommendationFocus.startsWith("category:") ? recommendationFocus : ""}
                onChange={(event) =>
                  setRecommendationFocus((event.target.value || "all") as RecommendationFocus)
                }
              >
                <option value="">Any</option>
                <optgroup label="Hitting">
                  {HITTING_CATEGORY_FOCUSES.map((category) => (
                    <option key={category} value={`category:${category}`}>{category}</option>
                  ))}
                </optgroup>
                <optgroup label="Pitching">
                  {PITCHING_CATEGORY_FOCUSES.map((category) => (
                    <option key={category} value={`category:${category}`}>{category}</option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.recFocusSummary}>
          <span>{focusLabel} focus</span>
          <span>Timing uses ADP, return probability, reach cost, and overall value.</span>
        </div>

        <div className={styles.categoryNeedsStrip}>
          <div className={styles.categoryNeedsHeader}>
            <span>Current Category Needs</span>
            <span>
              {userRosterSize === 0
                ? "Draft a player to start tracking needs"
                : categoryNeedSummary.length > 0
                  ? "Based on roster pace vs targets"
                  : "No clear category gaps yet"}
            </span>
          </div>
          {categoryNeedSummary.length > 0 && (
            <div className={styles.categoryNeedChips}>
              {categoryNeedSummary.map((item) => {
                const color = getCategoryNeedColor(item.need);
                return (
                  <button
                    key={item.category}
                    type="button"
                    className={styles.categoryNeedChip}
                    onClick={() => setRecommendationFocus(`category:${item.category}`)}
                    style={{ borderColor: color, color }}
                    title={`${item.category} need: ${getCategoryNeedLabel(item.need)}`}
                  >
                    <span>{item.category}</span>
                    <small>{getCategoryNeedLabel(item.need)}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.recList}>
          {focusedRecommendations.map((rec, index) => renderRecommendation(rec, index))}

          {focusedRecommendations.length === 0 && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
              No available players match this focus.
            </span>
          )}
        </div>

        {overallAlternatives.length > 0 && (
          <div className={styles.recAlternatives}>
            <div className={styles.recAlternativesHeader}>
              <span>Best overall alternatives</span>
              <button type="button" onClick={() => setRecommendationFocus("all")}>
                View all
              </button>
            </div>
            <div className={styles.recList}>
              {overallAlternatives.map((rec, index) => renderRecommendation(rec, index, true))}
            </div>
          </div>
        )}
        </div>
        </>
      )}
    </div>
  );
}
