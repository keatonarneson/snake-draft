"use client";

import React, { useMemo, useState } from "react";
import styles from "../app/page.module.css";
import { Player, PlayerStats } from "../utils/sampleData";
import { fitRoster } from "../utils/draftEngine";

type CategoryKey = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "SV" | "SO" | "ERA" | "WHIP";
type SortKey = "rank" | "team" | "points" | "hitterPoints" | "pitcherPoints" | "players" | "hitters" | "pitchers" | "value" | CategoryKey;

interface StandingsViewProps {
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number }[];
  numRounds: number;
  projectionOverrides?: Record<string, Partial<PlayerStats>>;
}

interface TeamStanding {
  teamIndex: number;
  teamName: string;
  players: number;
  hitters: number;
  pitchers: number;
  value: number;
  AB: number;
  IP: number;
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  SV: number;
  SO: number;
  ERA: number;
  WHIP: number;
  categoryPoints: Record<CategoryKey, number>;
  categoryRanks: Record<CategoryKey, number>;
  points: number;
  hitterPoints: number;
  pitcherPoints: number;
  rank: number;
}

const CATEGORIES: { key: CategoryKey; label: string; lowerIsBetter?: boolean; decimals?: number }[] = [
  { key: "R", label: "R" },
  { key: "HR", label: "HR" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "SB" },
  { key: "AVG", label: "AVG", decimals: 3 },
  { key: "W", label: "W" },
  { key: "SV", label: "SV" },
  { key: "SO", label: "SO" },
  { key: "ERA", label: "ERA", lowerIsBetter: true, decimals: 2 },
  { key: "WHIP", label: "WHIP", lowerIsBetter: true, decimals: 2 },
];

const HITTER_CATEGORIES: CategoryKey[] = ["R", "HR", "RBI", "SB", "AVG"];
const PITCHER_CATEGORIES: CategoryKey[] = ["W", "SV", "SO", "ERA", "WHIP"];

const emptyCategoryRecord = (value = 0) => {
  return CATEGORIES.reduce((acc, category) => {
    acc[category.key] = value;
    return acc;
  }, {} as Record<CategoryKey, number>);
};

const formatStat = (value: number, decimals = 0) => {
  if (!Number.isFinite(value)) return decimals > 0 ? (0).toFixed(decimals) : "0";
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
};

export default function StandingsView({
  teamNames,
  userTeamIndex,
  draftedPlayers,
  numRounds,
  projectionOverrides = {},
}: StandingsViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const standings = useMemo(() => {
    const rows: TeamStanding[] = teamNames.map((teamName, teamIndex) => {
      const roster = draftedPlayers
        .filter((drafted) => drafted.teamIndex === teamIndex)
        .map((drafted) => {
          if (teamIndex !== userTeamIndex || !projectionOverrides[drafted.player.id]) {
            return drafted.player;
          }

          return {
            ...drafted.player,
            stats: {
              ...drafted.player.stats,
              ...projectionOverrides[drafted.player.id],
            },
          };
        });
      const starters = fitRoster(roster, numRounds).active;

      let R = 0;
      let HR = 0;
      let RBI = 0;
      let SB = 0;
      let totalAB = 0;
      let weightedAVG = 0;
      let W = 0;
      let SV = 0;
      let SO = 0;
      let totalIP = 0;
      let weightedERA = 0;
      let weightedWHIP = 0;
      let hitters = 0;
      let pitchers = 0;
      let value = 0;

      starters.forEach((player) => {
        value += player.value || 0;

        if (player.isPitcher) {
          pitchers += 1;
          W += player.stats.W || 0;
          SV += player.stats.SV || 0;
          SO += player.stats.SO || 0;

          if (player.stats.IP && player.stats.IP > 0) {
            totalIP += player.stats.IP;
            weightedERA += (player.stats.ERA || 0) * player.stats.IP;
            weightedWHIP += (player.stats.WHIP || 0) * player.stats.IP;
          }
          return;
        }

        hitters += 1;
        R += player.stats.R || 0;
        HR += player.stats.HR || 0;
        RBI += player.stats.RBI || 0;
        SB += player.stats.SB || 0;

        if (player.stats.AB && player.stats.AB > 0) {
          totalAB += player.stats.AB;
          weightedAVG += (player.stats.AVG || 0) * player.stats.AB;
        }
      });

      return {
        teamIndex,
        teamName,
        players: starters.length,
        hitters,
        pitchers,
        value,
        AB: totalAB,
        IP: totalIP,
        R,
        HR,
        RBI,
        SB,
        AVG: totalAB > 0 ? weightedAVG / totalAB : 0,
        W,
        SV,
        SO,
        ERA: totalIP > 0 ? weightedERA / totalIP : 0,
        WHIP: totalIP > 0 ? weightedWHIP / totalIP : 0,
        categoryPoints: emptyCategoryRecord(),
        categoryRanks: emptyCategoryRecord(),
        points: 0,
        hitterPoints: 0,
        pitcherPoints: 0,
        rank: 0,
      };
    });

    CATEGORIES.forEach((category) => {
      const sorted = [...rows].sort((a, b) => {
        const aHasVolume = category.key === "AVG" ? a.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? a.IP > 0 : true;
        const bHasVolume = category.key === "AVG" ? b.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? b.IP > 0 : true;
        const aValue = aHasVolume ? a[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        const bValue = bHasVolume ? b[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        return category.lowerIsBetter ? aValue - bValue : bValue - aValue;
      });

      let index = 0;
      while (index < sorted.length) {
        const groupStart = index;
        const current = sorted[index];
        const currentHasVolume = category.key === "AVG" ? current.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? current.IP > 0 : true;
        const currentValue = currentHasVolume ? current[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

        while (index + 1 < sorted.length) {
          const next = sorted[index + 1];
          const nextHasVolume = category.key === "AVG" ? next.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? next.IP > 0 : true;
          const nextValue = nextHasVolume ? next[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          if (Math.abs(nextValue - currentValue) > 0.0001) break;
          index += 1;
        }

        const groupEnd = index;
        const highPoints = rows.length - groupStart;
        const lowPoints = rows.length - groupEnd;
        const points = (highPoints + lowPoints) / 2;
        const rank = groupStart + 1;

        for (let groupIndex = groupStart; groupIndex <= groupEnd; groupIndex++) {
          sorted[groupIndex].categoryPoints[category.key] = points;
          sorted[groupIndex].categoryRanks[category.key] = rank;
        }

        index += 1;
      }
    });

    rows.forEach((row) => {
      row.hitterPoints = HITTER_CATEGORIES.reduce((sum, key) => sum + row.categoryPoints[key], 0);
      row.pitcherPoints = PITCHER_CATEGORIES.reduce((sum, key) => sum + row.categoryPoints[key], 0);
      row.points = row.hitterPoints + row.pitcherPoints;
    });

    [...rows]
      .sort((a, b) => b.points - a.points || b.value - a.value)
      .forEach((row, index) => {
        row.rank = index + 1;
      });

    return rows;
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
  const activeStarterCount = standings.reduce((sum, row) => sum + row.players, 0);
  const hasCustomUserProjections = Object.keys(projectionOverrides).length > 0;

  return (
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
            <path d="M3 3v18h18" />
            <path d="M7 15l4-4 3 3 5-7" />
          </svg>
          Projected Standings
        </h3>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
          {activeStarterCount} starters / {draftedPlayers.length} drafted
        </span>
      </div>

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
                <th key={column.key} style={{ padding: "9px 10px", textAlign: column.key === "team" ? "left" : "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    {column.label}{sortGlyph(column.key)}
                  </button>
                </th>
              ))}
              {CATEGORIES.map((category) => (
                <th key={category.key} style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={() => handleSort(category.key)}
                    style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                    title={`${category.label} standings rank and projected total`}
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
                          {formatStat(row[category.key], category.decimals)}
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
    </div>
  );
}
