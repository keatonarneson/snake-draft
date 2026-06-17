"use client";

import React, { useMemo } from "react";
import styles from "../app/page.module.css";
import { Recommendation, ScarcityInfo } from "../utils/draftEngine";

interface DashboardSummaryProps {
  recommendations: Recommendation[];
  scarcityMap: Record<string, ScarcityInfo>;
  onDraftPlayer: (playerId: string) => void;
  isOnClock: boolean;
}

export default function DashboardSummary({
  recommendations,
  scarcityMap,
  onDraftPlayer,
  isOnClock,
}: DashboardSummaryProps) {
  // Sort recommendations by score descending and get top 4
  const topRecommendations = useMemo(() => {
    return recommendations
      .filter((r) => r.pReturn < 1.0) // only players who aren't guaranteed to return (i.e. exclude players we can definitely get later if they aren't the best value)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [recommendations]);

  // If no recommendations (e.g. draft finished), fallback to all available
  const displayRecs = topRecommendations.length > 0 
    ? topRecommendations 
    : recommendations.sort((a, b) => b.score - a.score).slice(0, 4);

  const getScarcityLevel = (dropOff: number) => {
    if (dropOff >= 5.0) return "high";
    if (dropOff >= 1.5) return "med";
    return "low";
  };

  const getReturnLevel = (p: number) => {
    if (p >= 0.70) return "high";
    if (p >= 0.30) return "med";
    return "low";
  };

  const formatPercent = (p: number) => {
    return `${Math.round(p * 100)}%`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Position Scarcity Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
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
            Position Scarcity (VBD Drop-off)
          </h3>
        </div>
        
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-6px" }}>
          Expected drop in player value ($) if you wait on this position until your next pick.
        </p>

        <div className={styles.scarcityGrid}>
          {Object.entries(scarcityMap).map(([pos, info], index) => {
            const level = getScarcityLevel(info.dropOff);
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
                data-scarcity={level} 
                style={{ cursor: "help" }}
              >
                <span className={styles.scarcityPos}>{pos}</span>
                <span
                  className={styles.scarcityDropoff}
                  style={{
                    color:
                      level === "high"
                        ? "var(--danger)"
                        : level === "med"
                        ? "var(--warning)"
                        : "var(--success)",
                  }}
                >
                  ${info.dropOff.toFixed(1)}
                  <span className={styles.scarcityDropoffUnit}> drop</span>
                </span>
                <span className={styles.scarcityCount}>{info.remainingCount} left</span>

                {/* Detailed Hover Tooltip */}
                <div className={tooltipClass}>
                  <div className={styles.tooltipHeader}>
                    <span>{pos} Scarcity Details</span>
                    <span className={styles.tooltipRemaining}>{info.remainingCount} left</span>
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

                      <div className={styles.tooltipFooter}>
                        <div className={styles.tooltipFooterRow}>
                          <span>Value Drop:</span>
                          <span>${Math.max(0, info.bestValueNow - info.expectedBestValueNext).toFixed(1)}</span>
                        </div>
                        <div className={styles.tooltipFooterRow}>
                          <span>Scarcity Premium:</span>
                          <span>+${Math.max(0, info.dropOff - Math.max(0, info.bestValueNow - info.expectedBestValueNext)).toFixed(1)}</span>
                        </div>
                        <div className={`${styles.tooltipFooterRow} ${styles.tooltipFooterTotal}`}>
                          <span>Total VBD Drop-off:</span>
                          <span style={{ 
                            color: level === "high" ? "var(--danger)" : level === "med" ? "var(--warning)" : "var(--success)",
                            fontWeight: 700 
                          }}>
                            ${info.dropOff.toFixed(1)}
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

      {/* Recommended Picks Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
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
          Smart ranking combining baseline Auction value, Scarcity drop-off, and Probability of return.
        </p>

        <div className={styles.recList}>
          {displayRecs.map((rec, index) => {
            const returnLevel = getReturnLevel(rec.pReturn);
            const scarcityPremium = rec.scarcityDropOff * (1.0 - rec.pReturn) * rec.weights.scarcity;
            
            return (
              <div key={rec.player.id} className={styles.recItem}>
                <div className={styles.recItemLeft}>
                  <span className={styles.recRank}>{index + 1}</span>
                  <div className={styles.recInfo}>
                    <span className={styles.recName}>{rec.player.name}</span>
                    <span className={styles.recSub}>
                      {rec.player.team} • {rec.player.positions.join("/")} • ADP {rec.player.adp.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div className={styles.recItemRight}>
                  {/* Return Prob */}
                  <div className={styles.recMetric} style={{ marginRight: "4px" }}>
                    <span className={styles.recMetricLabel}>Return%</span>
                    <span className={`${styles.recReturnGlow} ${styles.recMetricVal}`} data-level={returnLevel} style={{ fontSize: "0.75rem", padding: "1px 5px", marginTop: "2px" }}>
                      {formatPercent(rec.pReturn)}
                    </span>
                  </div>

                  {/* Score */}
                  <div className={styles.recMetric} style={{ alignItems: "center" }}>
                    <span className={styles.recMetricLabel}>Score ({rec.phase})</span>
                    <span className={styles.recMetricVal} style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.95rem" }}>
                      {rec.score.toFixed(1)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.62rem",
                        color: rec.isBench ? "var(--warning)" : "var(--text-secondary)",
                        marginTop: "2px",
                        whiteSpace: "nowrap"
                      }}
                      title={`Draft Phase: ${rec.phase.toUpperCase()}\nBase Value: $${rec.player.value.toFixed(1)}\nScarcity Premium: +$${scarcityPremium.toFixed(1)} (wt: ${rec.weights.scarcity})\nStats Adjustment: ${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(1)} (wt: ${rec.weights.needs})\nUpside Bonus: +$${rec.upsideBonus.toFixed(1)} (wt: ${rec.weights.upside})\nReach Penalty: ${rec.reachPenalty < 0 ? "" : "+"}$${rec.reachPenalty.toFixed(1)} (wt: ${rec.weights.reach})${rec.isBench ? `\nBench Penalty: x${rec.weights.benchDiscount}` : ""}`}
                    >
                      {rec.isBench 
                        ? `($${rec.player.value.toFixed(0)} + $${scarcityPremium.toFixed(0)} ${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(0)}${rec.upsideBonus > 0 ? ` +$${rec.upsideBonus.toFixed(0)}` : ""}${rec.reachPenalty < 0 ? ` -$${Math.abs(rec.reachPenalty).toFixed(0)}` : ""}) * ${rec.weights.benchDiscount}`
                        : `$${rec.player.value.toFixed(1)} + $${scarcityPremium.toFixed(1)} ${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(1)}${rec.upsideBonus > 0 ? ` +$${rec.upsideBonus.toFixed(1)}` : ""}${rec.reachPenalty < 0 ? ` -$${Math.abs(rec.reachPenalty).toFixed(1)}` : ""}`
                      }
                    </span>
                  </div>

                  {/* Draft direct button */}
                  <button
                    className={`btn ${isOnClock ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    onClick={() => onDraftPlayer(rec.player.id)}
                  >
                    Draft
                  </button>
                </div>
              </div>
            );
          })}

          {displayRecs.length === 0 && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
              No available recommendations. Draft may be complete.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
