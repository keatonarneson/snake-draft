"use client";

import React, { useMemo, useState } from "react";
import styles from "../DashboardSummary.module.css";
import {
  Recommendation,
  RecommendationDecision,
} from "../../engine";

export type RecommendationFocus =
  | "all"
  | "targets"
  | "hitters"
  | "pitchers"
  | `position:${string}`;

const POSITION_FOCUSES = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];

// Timing tiers drive row order: the pick you should make sits at the top.
const DECISION_ORDER: Record<RecommendationDecision, number> = {
  draft: 0,
  consider: 1,
  wait: 2,
};

interface RecommendationCardProps {
  sortedRecommendations: Recommendation[];
  recommendationFocus: RecommendationFocus;
  setRecommendationFocus: (focus: RecommendationFocus) => void;
  getDecision: (recommendation: Recommendation) => RecommendationDecision;
  currentOverallPick: number;
  onFocusPlayer?: (playerId: string) => void;
  targetRoundByPlayerId?: Map<string, number>;
  isDraftStarted?: boolean;
  isOnClock?: boolean;
  onDraftPlayer?: (playerId: string) => void;
  draftActionLabel?: string;
}

// Keep the card short by default; the deeper list is one click away.
const COLLAPSED_COUNT = 4;
const EXPANDED_COUNT = 10;

const getReturnLevel = (p: number) => {
  if (p >= 0.70) return "high";
  if (p >= 0.30) return "med";
  return "low";
};

const formatPercent = (p: number) => {
  return `${Math.round(p * 100)}%`;
};

export function RecommendationCard({
  sortedRecommendations,
  recommendationFocus,
  setRecommendationFocus,
  getDecision,
  currentOverallPick,
  onFocusPlayer,
  targetRoundByPlayerId,
  isDraftStarted = true,
  isOnClock = false,
  onDraftPlayer,
  draftActionLabel,
}: RecommendationCardProps) {
  const targetCount = targetRoundByPlayerId?.size ?? 0;
  // Before the draft starts, timing (return %, draft/consider/wait) is undefined,
  // so the card degrades to a plain value ranking instead of asserting nonsense.
  const preDraft = !isDraftStarted;
  const [isExpanded, setIsExpanded] = useState(false);

  const focusedRecommendations = useMemo(() => {
    let eligible = sortedRecommendations;
    if (recommendationFocus === "targets") {
      eligible = eligible.filter((recommendation) => targetRoundByPlayerId?.has(recommendation.player.id));
    } else if (recommendationFocus === "hitters") {
      eligible = eligible.filter((recommendation) => !recommendation.player.isPitcher);
    } else if (recommendationFocus === "pitchers") {
      eligible = eligible.filter((recommendation) => recommendation.player.isPitcher);
    } else if (recommendationFocus.startsWith("position:")) {
      const position = recommendationFocus.slice("position:".length);
      eligible = eligible.filter((recommendation) => recommendation.player.positions.includes(position));
    }

    // Pre-draft: score order only. Live: order by timing tier, then score, so a
    // "Draft Now" always outranks a "Wait" regardless of raw score.
    const ordered = preDraft
      ? [...eligible].sort((a, b) => b.score - a.score)
      : [...eligible].sort((a, b) => {
          const tierGap = DECISION_ORDER[getDecision(a)] - DECISION_ORDER[getDecision(b)];
          return tierGap !== 0 ? tierGap : b.score - a.score;
        });

    return ordered.slice(0, EXPANDED_COUNT);
  }, [
    recommendationFocus,
    sortedRecommendations,
    targetRoundByPlayerId,
    preDraft,
    getDecision,
  ]);

  const visibleRecommendations = isExpanded
    ? focusedRecommendations
    : focusedRecommendations.slice(0, COLLAPSED_COUNT);
  const hiddenCount = focusedRecommendations.length - visibleRecommendations.length;

  // When a filter is active, surface the best overall player if it isn't
  // already in the narrowed list, so a clearly superior BPA is never hidden.
  const bestAvailable = sortedRecommendations[0];
  const showBestAvailable =
    recommendationFocus !== "all" &&
    bestAvailable !== undefined &&
    !visibleRecommendations.some((rec) => rec.player.id === bestAvailable.player.id);

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
    : recommendationFocus === "all"
        ? "Overall"
        : recommendationFocus[0].toUpperCase() + recommendationFocus.slice(1);

  const renderName = (rec: Recommendation) =>
    onFocusPlayer ? (
      <button
        type="button"
        className={`${styles.recName} ${styles.recNameButton}`}
        onClick={(event) => {
          event.stopPropagation();
          onFocusPlayer(rec.player.id);
        }}
        title={`Inspect ${rec.player.name} in Player Focus`}
      >
        {rec.player.name}
      </button>
    ) : (
      <span className={styles.recName}>{rec.player.name}</span>
    );

  const renderRecommendation = (rec: Recommendation) => {
    const targetRound = targetRoundByPlayerId?.get(rec.player.id);

    // Pre-draft: value-ranking row — no timing badges, reasons, or draft action.
    if (preDraft) {
      return (
        <div
          key={rec.player.id}
          className={styles.recItem}
          onClick={() => onFocusPlayer?.(rec.player.id)}
        >
          <div className={styles.recItemLeft}>
            <div className={styles.recInfo}>
              <div className={styles.recNameRow}>
                {renderName(rec)}
                {targetRound !== undefined && (
                  <span className={styles.recTargetBadge} title={`Queued as a Round ${targetRound} target`}>
                    ★ R{targetRound}
                  </span>
                )}
              </div>
              <span className={styles.recSub}>
                {rec.player.team} | {rec.player.positions.join("/")} | ADP {rec.player.adp.toFixed(0)}
              </span>
            </div>
          </div>

          <div className={styles.recItemRight}>
            <div className={styles.recMetric}>
              <span className={styles.recMetricLabel}>Value</span>
              <span className={styles.recMetricVal} style={{ color: "var(--primary)" }}>
                {rec.score.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    const decision = getDecision(rec);
    // Low return argues *for* drafting a "draft" pick, so don't flag it red there.
    const returnLevel = decision === "draft" ? "neutral" : getReturnLevel(rec.pReturn);
    const decisionLabel = decision === "draft" ? "Draft Now" : decision === "consider" ? "Consider" : "Wait";

    return (
      <div
        key={rec.player.id}
        className={styles.recItem}
        data-decision={decision}
        onClick={() => onFocusPlayer?.(rec.player.id)}
      >
        <div className={styles.recItemLeft}>
          <div className={styles.recInfo}>
            <div className={styles.recNameRow}>
              {renderName(rec)}
              {targetRound !== undefined && (
                <span className={styles.recTargetBadge} title={`Queued as a Round ${targetRound} target`}>
                  ★ R{targetRound}
                </span>
              )}
              <span className={styles.recDecision} data-decision={decision}>
                {decisionLabel}
              </span>
            </div>
            <span className={styles.recSub}>
              {rec.player.team} | {rec.player.positions.join("/")} | ADP {rec.player.adp.toFixed(0)}
              <span className={styles.recDecisionReason}> — {getDecisionReason(rec, decision)}</span>
            </span>
          </div>
        </div>

        <div className={styles.recItemRight}>
          <div className={styles.recMetric}>
            <span
              className={styles.recMetricLabel}
              title="Chance this player is still available at your next pick"
            >
              Return
            </span>
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
          </div>

          {onDraftPlayer && isOnClock && (
            <button
              type="button"
              className={`btn ${decision !== "wait" ? "btn-primary" : "btn-secondary"} ${styles.recDraftButton}`}
              onClick={(event) => {
                event.stopPropagation();
                onDraftPlayer(rec.player.id);
              }}
            >
              {draftActionLabel ?? (decision === "wait" ? "Draft Anyway" : "Draft")}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`card glow-panel ${styles.recommendationCard}`}>
      <div className="cardHeader">
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
      </div>

      <div className={styles.recFocusToolbar}>
        <div className={styles.recFocusTabs} aria-label="Recommendation player type">
          {([
            { id: "all", label: "All" },
            { id: "targets", label: targetCount > 0 ? `Targets (${targetCount})` : "Targets" },
            { id: "hitters", label: "Hitters" },
            { id: "pitchers", label: "Pitchers" },
          ] as const).map((focus) => (
            <button
              key={focus.id}
              type="button"
              className={styles.recFocusTab}
              data-active={recommendationFocus === focus.id}
              disabled={focus.id === "targets" && targetCount === 0}
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
        </div>
      </div>

      <div className={styles.recFocusSummary}>
        <span>{focusLabel} focus</span>
        <span>
          {preDraft
            ? "Draft not started — showing value ranking."
            : "Ordered by draft timing. Click a name to inspect in Player Focus."}
        </span>
      </div>

      <div className={styles.recList}>
        {visibleRecommendations.map((rec) => renderRecommendation(rec))}

        {focusedRecommendations.length === 0 && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
            No available players match this focus.
          </span>
        )}
      </div>

      {(hiddenCount > 0 || isExpanded) && (
        <button
          type="button"
          className={styles.recShowMore}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      )}

      {showBestAvailable && (
        <button
          type="button"
          className={styles.recBestAvailable}
          onClick={() => onFocusPlayer?.(bestAvailable.player.id)}
          title="Best player available overall — click to inspect"
        >
          <span className={styles.recBestAvailableLabel}>Best available</span>
          <span className={styles.recBestAvailableName}>{bestAvailable.player.name}</span>
          <span className={styles.recBestAvailableSub}>
            {bestAvailable.player.positions.join("/")} · {bestAvailable.score.toFixed(1)}
          </span>
        </button>
      )}
    </div>
  );
}
