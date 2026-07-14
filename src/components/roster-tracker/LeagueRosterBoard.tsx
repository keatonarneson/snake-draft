"use client";

import React, { useMemo } from "react";
import { buildRosterSlots, ROSTER_SLOTS, SLOT_DISPLAY_LABELS } from "../../engine/rosterSlots";
import type { TeamSlotAssignments } from "../../engine/rosterSlots";
import { Player } from "../../types/draft";

interface LeagueRosterBoardProps {
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number }[];
  numRounds: number;
  slotAssignmentsByTeam?: TeamSlotAssignments;
  onSelectTeam?: (teamIndex: number) => void;
}

function abbreviateName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 1) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

const ACTIVE_SLOT_COUNT = ROSTER_SLOTS.length;

export default function LeagueRosterBoard({
  teamNames,
  userTeamIndex,
  draftedPlayers,
  numRounds,
  slotAssignmentsByTeam = {},
  onSelectTeam,
}: LeagueRosterBoardProps) {
  // Auto-fit each team's roster into the shared slot layout (no manual
  // assignments here — this is a read-only league overview).
  const teamRosters = useMemo(() => {
    return teamNames.map((_, teamIndex) => {
      const players = draftedPlayers
        .filter((drafted) => drafted.teamIndex === teamIndex)
        .map((drafted) => drafted.player);
      return buildRosterSlots(players, numRounds, slotAssignmentsByTeam[teamIndex] || {});
    });
  }, [teamNames, draftedPlayers, numRounds, slotAssignmentsByTeam]);

  const benchCount = teamRosters[0]?.bench.length ?? 0;

  const rows: { label: string; getPlayer: (teamIndex: number) => Player | null }[] = [
    ...Array.from({ length: ACTIVE_SLOT_COUNT }, (_, slotIndex) => ({
      label: SLOT_DISPLAY_LABELS[slotIndex],
      getPlayer: (teamIndex: number) => teamRosters[teamIndex]?.active[slotIndex]?.player ?? null,
    })),
    ...Array.from({ length: benchCount }, (_, benchIndex) => ({
      label: "BN",
      getPlayer: (teamIndex: number) => teamRosters[teamIndex]?.bench[benchIndex]?.player ?? null,
    })),
  ];

  const stickyHeaderCell: React.CSSProperties = {
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: "#161821",
    padding: "8px 12px",
    textAlign: "left",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 700,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  };

  return (
    <div
      className="card glow-panel"
      style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 210px)", minHeight: "520px" }}
    >
      <h3 className="cardTitle" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        League Rosters
      </h3>

      <div
        style={{
          overflow: "auto",
          flex: 1,
          minHeight: 0,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <table style={{ width: "max-content", borderCollapse: "collapse", fontSize: "0.7rem" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ ...stickyHeaderCell, zIndex: 3 }}>Slot</th>
              {teamNames.map((name, teamIndex) => {
                const isUser = teamIndex === userTeamIndex;
                return (
                  <th
                    key={teamIndex}
                    style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      minWidth: "150px",
                      maxWidth: "150px",
                      fontWeight: 700,
                      color: isUser ? "var(--primary)" : "var(--text-secondary)",
                      background: isUser ? "rgba(99, 102, 241, 0.05)" : "transparent",
                      borderBottom: isUser ? "2px solid var(--primary)" : "none",
                    }}
                  >
                    {onSelectTeam ? (
                      <button
                        type="button"
                        onClick={() => onSelectTeam(teamIndex)}
                        title={`Open ${name} team view`}
                        style={{ padding: 0, border: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer" }}
                      >
                        {name}
                      </button>
                    ) : name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isBench = row.label === "BN";
              return (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: rowIndex % 2 === 0 ? "transparent" : "rgba(255,255,255,0.005)",
                  }}
                >
                  <td style={{ ...stickyHeaderCell, fontSize: "0.68rem", color: isBench ? "var(--text-muted)" : "var(--text-secondary)", background: rowIndex % 2 === 0 ? "#161821" : "#181a24" }}>
                    {row.label}
                  </td>
                  {teamNames.map((_, teamIndex) => {
                    const player = row.getPlayer(teamIndex);
                    const isUser = teamIndex === userTeamIndex;
                    return (
                      <td
                        key={teamIndex}
                        title={player ? `${player.name} (${player.positions.join("/")}) - $${player.value.toFixed(1)}` : undefined}
                        style={{
                          padding: "6px 10px",
                          minWidth: "150px",
                          maxWidth: "150px",
                          background: isUser ? "rgba(99, 102, 241, 0.03)" : "transparent",
                          borderLeft: isUser ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                          borderRight: isUser ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                        }}
                      >
                        {player ? (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {abbreviateName(player.name)}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", flex: "0 0 auto" }}>
                              ${player.value.toFixed(0)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
