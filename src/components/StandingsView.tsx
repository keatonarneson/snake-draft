"use client";

import React, { useMemo, useState } from "react";
import styles from "./StandingsView.module.css";
import {
  CATEGORIES,
  CategoryKey,
  formatCategoryStat,
  HITTER_CATEGORIES,
  PITCHER_CATEGORIES,
} from "../engine/categoryStats";
import { calculateProjectedStandings } from "../engine/standings";
import { Player, PlayerStats } from "../types/draft";

type SortKey = "rank" | "team" | "points" | "hitterPoints" | "pitcherPoints" | "players" | "hitters" | "pitchers" | "value" | CategoryKey;

interface StandingsViewProps {
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number }[];
  numRounds: number;
  projectionOverrides?: Record<string, Partial<PlayerStats>>;
}

export default function StandingsView({
  teamNames,
  userTeamIndex,
  draftedPlayers,
  numRounds,
  projectionOverrides = {},
}: StandingsViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const standings = useMemo(() => {
    return calculateProjectedStandings({
      teamNames,
      userTeamIndex,
      draftedPlayers,
      numRounds,
      projectionOverrides,
    });
  }, [teamNames, draftedPlayers, numRounds, userTeamIndex, projectionOverrides]);

  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue = sortKey === "team" ? a.teamName : a[sortKey];
      const bValue = sortKey === "team" ? b.teamName : b[sortKey];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * direction;
      }

      return ((aValue as number) - (bValue as number)) * direction || a.rank - b.rank;
    });
  }, [standings, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "team" || key === "rank" ? "asc" : "desc");
  };

  const sortGlyph = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };
  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none";
  const activeStarterCount = standings.reduce((sum, row) => sum + row.players, 0);
  const hasCustomUserProjections = Object.keys(projectionOverrides).length > 0;

  const userStanding = useMemo(() => {
    return standings.find((row) => row.teamIndex === userTeamIndex);
  }, [standings, userTeamIndex]);

  const getCategoryMetrics = (category: typeof CATEGORIES[number]) => {
    if (!userStanding) return null;
    const key = category.key;
    const values = standings.map((row) => row[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((s, v) => s + v, 0);
    const avg = sum / values.length;

    const userVal = userStanding[key];
    const userRank = userStanding.categoryRanks[key];
    const userPoints = userStanding.categoryPoints[key];

    let minBound = 0;
    let maxBound = 100;
    let userPercent = 0;
    let avgPercent = 0;

    if (key === "AVG") {
      minBound = Math.max(0.180, min - 0.020);
      maxBound = Math.max(0.320, max + 0.020);
      userPercent = ((userVal - minBound) / (maxBound - minBound)) * 100;
      avgPercent = ((avg - minBound) / (maxBound - minBound)) * 100;
    } else if (key === "ERA") {
      minBound = Math.max(2.00, min - 0.50);
      maxBound = Math.max(6.50, max + 0.50);
      userPercent = ((maxBound - userVal) / (maxBound - minBound)) * 100;
      avgPercent = ((maxBound - avg) / (maxBound - minBound)) * 100;
    } else if (key === "WHIP") {
      minBound = Math.max(0.90, min - 0.10);
      maxBound = Math.max(1.70, max + 0.10);
      userPercent = ((maxBound - userVal) / (maxBound - minBound)) * 100;
      avgPercent = ((maxBound - avg) / (maxBound - minBound)) * 100;
    } else {
      maxBound = max * 1.1 || 1;
      userPercent = (userVal / maxBound) * 100;
      avgPercent = (avg / maxBound) * 100;
    }

    userPercent = Math.min(100, Math.max(0, userPercent));
    avgPercent = Math.min(100, Math.max(0, avgPercent));

    const leaderVal = category.lowerIsBetter ? min : max;
    const worstVal = category.lowerIsBetter ? max : min;

    return {
      userVal,
      userRank,
      userPoints,
      avgVal: avg,
      leaderVal,
      worstVal,
      userPercent,
      avgPercent,
    };
  };

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
            <path d="M3 3v18h18" />
            <path d="M7 15l4-4 3 3 5-7" />
          </svg>
          Projected Standings
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
            {activeStarterCount} starters / {draftedPlayers.length} drafted
          </span>
          <div className={styles.viewModeToggle}>
            <button
              type="button"
              className={styles.viewModeButton}
              data-active={viewMode === "table" ? "true" : "false"}
              onClick={() => setViewMode("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={styles.viewModeButton}
              data-active={viewMode === "chart" ? "true" : "false"}
              onClick={() => setViewMode("chart")}
            >
              Chart
            </button>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1120px", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { key: "rank" as SortKey, label: "#" },
                  { key: "team" as SortKey, label: "Team" },
                  { key: "points" as SortKey, label: "Pts" },
                  { key: "hitterPoints" as SortKey, label: "Hit Pts" },
                  { key: "pitcherPoints" as SortKey, label: "Pit Pts" },
                  { key: "players" as SortKey, label: "Start" },
                  { key: "hitters" as SortKey, label: "Hit" },
                  { key: "pitchers" as SortKey, label: "Pit" },
                  { key: "value" as SortKey, label: "$" },
                ].map((column) => (
                  <th key={column.key} aria-sort={ariaSort(column.key)} style={{ padding: "9px 10px", textAlign: column.key === "team" ? "left" : "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      aria-label={`Sort by ${column.label}`}
                      style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                    >
                      {column.label}{sortGlyph(column.key)}
                    </button>
                  </th>
                ))}
                {CATEGORIES.map((category) => (
                  <th key={category.key} aria-sort={ariaSort(category.key)} style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => handleSort(category.key)}
                      style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                      title={`${category.label} standings rank and projected total`}
                      aria-label={`Sort by ${category.label}`}
                    >
                      {category.label}{sortGlyph(category.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((row) => {
                const isUser = row.teamIndex === userTeamIndex;
                return (
                  <tr
                    key={row.teamIndex}
                    style={{
                      background: isUser ? "rgba(99, 102, 241, 0.08)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.045)",
                    }}
                  >
                    <td style={{ padding: "9px 10px", textAlign: "right", color: isUser ? "var(--primary)" : "var(--text-primary)", fontWeight: 800 }}>
                      {row.rank}
                    </td>
                    <td style={{ padding: "9px 10px", color: isUser ? "var(--primary)" : "var(--text-primary)", fontWeight: 800, whiteSpace: "nowrap" }}>
                      {row.teamName}
                      {isUser && hasCustomUserProjections && (
                        <span style={{ marginLeft: "6px", padding: "1px 4px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.12)", color: "var(--warning)", fontSize: "0.56rem", textTransform: "uppercase" }}>
                          Custom
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--success)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                      {row.points.toFixed(1)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {row.hitterPoints.toFixed(1)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {row.pitcherPoints.toFixed(1)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {row.players}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {row.hitters}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {row.pitchers}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {row.value.toFixed(0)}
                    </td>
                    {CATEGORIES.map((category) => (
                      <td key={category.key} style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                          <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                            {formatCategoryStat(row[category.key], category.decimals)}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.64rem" }}>
                            {row.categoryRanks[category.key]} / {row.categoryPoints[category.key].toFixed(1)}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.standingsChartsGrid}>
          {/* Hitting Column */}
          <div className={styles.standingsChartsCol}>
            <div className={styles.standingsColTitle}>Hitting Categories</div>
            {CATEGORIES.filter((c) => HITTER_CATEGORIES.includes(c.key)).map((category) => {
              const metrics = getCategoryMetrics(category);
              if (!metrics) return null;
              return (
                <div key={category.key} className={styles.categoryChartCard}>
                  <div className={styles.chartCardHeader}>
                    <span className={styles.chartCardTitle}>{category.label}</span>
                    <span className={styles.chartCardStats}>
                      Rank: <strong style={{ color: "var(--text-primary)" }}>#{metrics.userRank}</strong> ({metrics.userPoints.toFixed(1)} pts) | Value: <span className={styles.chartCardUserValue}>{formatCategoryStat(metrics.userVal, category.decimals)}</span>
                    </span>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      className={`${styles.chartFill} ${styles.chartFillHitting}`}
                      style={{ width: `${metrics.userPercent}%` }}
                    />
                    <div
                      className={styles.chartAverageMarker}
                      style={{ left: `${metrics.avgPercent}%` }}
                      title={`League Average: ${formatCategoryStat(metrics.avgVal, category.decimals)}`}
                    />
                  </div>
                  <div className={styles.chartLabels}>
                    <span>Worst: {formatCategoryStat(metrics.worstVal, category.decimals)}</span>
                    <span>Avg: {formatCategoryStat(metrics.avgVal, category.decimals)}</span>
                    <span>Leader: {formatCategoryStat(metrics.leaderVal, category.decimals)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pitching Column */}
          <div className={styles.standingsChartsCol}>
            <div className={styles.standingsColTitle}>Pitching Categories</div>
            {CATEGORIES.filter((c) => PITCHER_CATEGORIES.includes(c.key)).map((category) => {
              const metrics = getCategoryMetrics(category);
              if (!metrics) return null;
              return (
                <div key={category.key} className={styles.categoryChartCard}>
                  <div className={styles.chartCardHeader}>
                    <span className={styles.chartCardTitle}>{category.label}</span>
                    <span className={styles.chartCardStats}>
                      Rank: <strong style={{ color: "var(--text-primary)" }}>#{metrics.userRank}</strong> ({metrics.userPoints.toFixed(1)} pts) | Value: <span className={styles.chartCardUserValue}>{formatCategoryStat(metrics.userVal, category.decimals)}</span>
                    </span>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      className={`${styles.chartFill} ${styles.chartFillPitching}`}
                      style={{ width: `${metrics.userPercent}%` }}
                    />
                    <div
                      className={styles.chartAverageMarker}
                      style={{ left: `${metrics.avgPercent}%` }}
                      title={`League Average: ${formatCategoryStat(metrics.avgVal, category.decimals)}`}
                    />
                  </div>
                  <div className={styles.chartLabels}>
                    <span>Worst: {formatCategoryStat(metrics.worstVal, category.decimals)}</span>
                    <span>Avg: {formatCategoryStat(metrics.avgVal, category.decimals)}</span>
                    <span>Leader: {formatCategoryStat(metrics.leaderVal, category.decimals)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
