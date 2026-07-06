"use client";

import React from "react";
import styles from "../DashboardSummary.module.css";
import { ScarcityInfo } from "../../engine";

interface PositionPressureCardProps {
  scarcityMap: Record<string, ScarcityInfo>;
}

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

export function PositionPressureCard({ scarcityMap }: PositionPressureCardProps) {
  return (
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
  );
}
