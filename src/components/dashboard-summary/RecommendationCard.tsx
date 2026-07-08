"use client";

import React, { useMemo, useState } from "react";
import styles from "../DashboardSummary.module.css";
import {
  Recommendation,
  RecommendationDecision,
  calculateCategoryContribution,
} from "../../engine";
import { Player } from "../../types/draft";
import { CategoryNeedsStrip, CategoryNeedSummaryItem, RecommendationFocus } from "./CategoryNeedsStrip";

const POSITION_FOCUSES = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];
const HITTING_CATEGORY_FOCUSES = ["R", "HR", "RBI", "SB", "AVG"];
const PITCHING_CATEGORY_FOCUSES = ["W", "SV", "SO", "ERA", "WHIP"];

interface RecommendationCardProps {
  sortedRecommendations: Recommendation[];
  displayRecs: Recommendation[];
  recommendationFocus: RecommendationFocus;
  setRecommendationFocus: (focus: RecommendationFocus) => void;
  getDecision: (recommendation: Recommendation) => RecommendationDecision;
  currentOverallPick: number;
  onDraftPlayer: (playerId: string) => void;
  draftActionLabel?: string;
  isOnClock: boolean;
  categoryNeedSummary: CategoryNeedSummaryItem[];
  userRosterSize: number;
}

const getReturnLevel = (p: number) => {
  if (p >= 0.70) return "high";
  if (p >= 0.30) return "med";
  return "low";
};

const formatPercent = (p: number) => {
  return `${Math.round(p * 100)}%`;
};

function formatCategoryContribution(player: Player, category: string) {
  const value = player.stats[category as keyof typeof player.stats];
  if (category === "AVG") return Number(value || 0).toFixed(3);
  if (category === "ERA" || category === "WHIP") return Number(value || 0).toFixed(2);
  return Math.round(Number(value || 0)).toString();
}

export function RecommendationCard({
  sortedRecommendations,
  displayRecs,
  recommendationFocus,
  setRecommendationFocus,
  getDecision,
  currentOverallPick,
  onDraftPlayer,
  draftActionLabel,
  isOnClock,
  categoryNeedSummary,
  userRosterSize,
}: RecommendationCardProps) {
  // Compact by default: show a short strip of top picks so the player pool
  // below gets the vertical space. Expand for filters, needs, and reasoning.
  const [expanded, setExpanded] = useState(false);

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
            calculateCategoryContribution(b.player, category) - calculateCategoryContribution(a.player, category);
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
            {draftActionLabel ?? (decision === "wait" ? "Draft Anyway" : "Draft")}
          </button>
        </div>
      </div>
    );
  };

  const renderCompactChip = (rec: Recommendation, index: number) => {
    const decision = getDecision(rec);
    const decisionLabel = decision === "draft" ? "Draft Now" : decision === "consider" ? "Consider" : "Wait";
    const returnLevel = getReturnLevel(rec.pReturn);

    return (
      <div
        key={rec.player.id}
        data-decision={decision}
        style={{
          flex: "0 0 auto",
          width: "196px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid var(--glass-border)",
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)" }}>{index + 1}</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {rec.player.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-secondary)" }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {rec.player.team} | {rec.player.positions.join("/")}
          </span>
          <span className={styles.recReturnGlow} data-level={returnLevel} style={{ flex: "0 0 auto" }}>
            {formatPercent(rec.pReturn)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
          <span className={styles.recDecision} data-decision={decision}>{decisionLabel}</span>
          <button
            className={`btn ${isOnClock && decision !== "wait" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "3px 10px", fontSize: "0.7rem" }}
            onClick={() => onDraftPlayer(rec.player.id)}
          >
            {draftActionLabel ?? "Draft"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="card glow-panel">
      <div className="cardHeader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <h3 className="cardTitle" style={{ margin: 0 }}>
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
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "8px",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {expanded ? "Compact" : "Details"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {!expanded && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {displayRecs.map((rec, index) => renderCompactChip(rec, index))}
          {displayRecs.length === 0 && (
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px" }}>
              No recommendations yet.
            </span>
          )}
        </div>
      )}

      {expanded && (
      <>
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

      <CategoryNeedsStrip
        categoryNeedSummary={categoryNeedSummary}
        userRosterSize={userRosterSize}
        setRecommendationFocus={setRecommendationFocus}
      />

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
      </>
      )}
    </div>
  );
}
