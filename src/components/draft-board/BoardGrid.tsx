"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";
import { getPositionColor, getPrimaryPosition } from "./positionDisplay";

interface BoardGridProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  playerMap: Map<string, Player>;
  picksUntilUser: number;
}

function getAbbreviatedName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 1) return name;

  const firstInitial = parts[0][0];
  const lastName = parts.slice(1).join(" ");
  return `${firstInitial}. ${lastName}`;
}

export default function BoardGrid({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  playerMap,
  picksUntilUser,
}: BoardGridProps) {
  const activeGridCellRef = useRef<HTMLTableCellElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      if (activeGridCellRef.current && gridContainerRef.current) {
        const container = gridContainerRef.current;
        const cell = activeGridCellRef.current;

        const containerHeight = container.clientHeight;
        const cellTop = cell.offsetTop;
        const cellHeight = cell.clientHeight;

        const containerWidth = container.clientWidth;
        const cellLeft = cell.offsetLeft;
        const cellWidth = cell.clientWidth;

        container.scrollTo({
          top: cellTop - containerHeight / 2 + cellHeight / 2,
          left: cellLeft - containerWidth / 2 + cellWidth / 2,
          behavior: "smooth",
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [currentPickIndex]);

  const gridMap = useMemo(() => {
    const map = new Map<string, DraftPick>();
    picks.forEach((pick) => {
      map.set(`${pick.round}-${pick.teamIndex}`, pick);
    });
    return map;
  }, [picks]);

  const numTeams = teamNames.length;
  const numRounds = picks[picks.length - 1]?.round || 30;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", padding: "6px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.7rem" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Position Legend:</span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#60a5fa" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#60a5fa", display: "inline-block" }}></span> SP
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#22d3ee" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22d3ee", display: "inline-block" }}></span> RP
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#34d399" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", display: "inline-block" }}></span> C
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fbbf24" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fbbf24", display: "inline-block" }}></span> IF
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#a78bfa" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a78bfa", display: "inline-block" }}></span> OF
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#d1d5db" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d1d5db", display: "inline-block" }}></span> UT/Other
          </span>
        </div>

        {picksUntilUser !== -1 && (
          <span
            className={`badge ${
              picksUntilUser === 0
                ? "badge-primary"
                : picksUntilUser <= 5
                ? "badge-warning"
                : "badge-secondary"
            }`}
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
          >
            {picksUntilUser === 0
              ? "Your Turn!"
              : `${picksUntilUser} pick${picksUntilUser > 1 ? "s" : ""} until your turn`}
          </span>
        )}
      </div>

      <div
        ref={gridContainerRef}
        style={{
          overflowX: "auto",
          overflowY: "auto",
          flexGrow: 1,
          minHeight: 0,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          background: "rgba(0,0,0,0.2)",
          padding: "4px",
        }}
      >
        <table
          style={{
            width: "max-content",
            borderCollapse: "collapse",
            fontSize: "0.68rem",
            color: "var(--text-secondary)",
          }}
        >
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#161821",
                  zIndex: 2,
                  padding: "10px 12px",
                  textAlign: "center",
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                  fontWeight: 600,
                }}
              >
                Round
              </th>
              {teamNames.map((name, idx) => {
                const isUser = idx === userTeamIndex;
                return (
                  <th
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      minWidth: "120px",
                      maxWidth: "120px",
                      fontWeight: 600,
                      color: isUser ? "var(--primary)" : "var(--text-secondary)",
                      borderBottom: isUser ? "2px solid var(--primary)" : "none",
                      backgroundColor: isUser ? "rgba(99, 102, 241, 0.03)" : "transparent",
                      borderLeft: isUser ? "2px solid rgba(99, 102, 241, 0.45)" : "none",
                      borderRight: isUser ? "2px solid rgba(99, 102, 241, 0.45)" : "none",
                    }}
                  >
                    {name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRounds }).map((_, rIdx) => {
              const round = rIdx + 1;
              const isLeftToRight = round % 2 === 1;
              return (
                <tr
                  key={round}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: round % 2 === 0 ? "rgba(255,255,255,0.005)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "#161821",
                      zIndex: 1,
                      padding: "8px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text-muted)",
                      fontSize: "0.68rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Rd {round} <span style={{ color: isLeftToRight ? "var(--success)" : "var(--primary)", opacity: 0.85, fontSize: "0.6rem", marginLeft: "2px" }}>{isLeftToRight ? ">" : "<"}</span>
                  </td>
                  {Array.from({ length: numTeams }).map((_, tIdx) => {
                    const pick = gridMap.get(`${round}-${tIdx}`);
                    if (!pick) {
                      return <td key={tIdx} style={{ minWidth: "120px", maxWidth: "120px", padding: "6px" }} />;
                    }

                    const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
                    const pickIndex = picks.findIndex((draftPick) => draftPick.overallPick === pick.overallPick);
                    const isCurrent = pickIndex === currentPickIndex;
                    const isUser = tIdx === userTeamIndex;

                    let cellBg = "transparent";
                    let cellBorder = "1px solid rgba(255,255,255,0.03)";
                    let textColor = "var(--text-secondary)";
                    let posText = "";
                    let allPosText = "";

                    if (draftedPlayer) {
                      posText = getPrimaryPosition(draftedPlayer);
                      allPosText = draftedPlayer.positions.join("/");
                      const colors = getPositionColor(posText);
                      cellBg = colors.bg;
                      cellBorder = `1px solid ${colors.border}`;
                      textColor = colors.color;
                    } else if (isCurrent) {
                      cellBg = "rgba(255, 193, 7, 0.05)";
                      cellBorder = "1px solid var(--warning)";
                      textColor = "var(--warning)";
                    } else if (isUser) {
                      cellBg = "rgba(99, 102, 241, 0.02)";
                    }

                    let borderLeftStyle = cellBorder;
                    let borderRightStyle = cellBorder;
                    if (isUser) {
                      borderLeftStyle = "2px solid rgba(99, 102, 241, 0.45)";
                      borderRightStyle = "2px solid rgba(99, 102, 241, 0.45)";
                    }

                    let tooltipText = "";
                    if (draftedPlayer) {
                      tooltipText = `${draftedPlayer.name} (${allPosText}) - Drafted by ${teamNames[tIdx]} (Value: $${draftedPlayer.value.toFixed(1)}) - Rd ${pick.round}, Pick ${pick.pickInRound} (Overall #${pick.overallPick})`;
                    } else if (isCurrent) {
                      tooltipText = `${teamNames[tIdx]} is ON THE CLOCK - Rd ${pick.round}, Pick ${pick.pickInRound} (Overall #${pick.overallPick})`;
                    } else {
                      tooltipText = `Queued pick for ${teamNames[tIdx]} - Rd ${pick.round}, Pick ${pick.pickInRound} (Overall #${pick.overallPick})`;
                    }

                    return (
                      <td
                        key={tIdx}
                        ref={isCurrent ? activeGridCellRef : null}
                        title={tooltipText}
                        style={{
                          minWidth: "120px",
                          maxWidth: "120px",
                          height: "48px",
                          padding: "4px 8px",
                          textAlign: "center",
                          background: cellBg,
                          borderTop: cellBorder,
                          borderBottom: cellBorder,
                          borderLeft: borderLeftStyle,
                          borderRight: borderRightStyle,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: "2px" }}>
                          {draftedPlayer ? (
                            <>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  fontSize: "0.75rem",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {getAbbreviatedName(draftedPlayer.name)}
                              </span>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.62rem" }}>
                                <span
                                  style={{
                                    color: textColor,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    padding: "2px 5px",
                                    borderRadius: "4px",
                                    border: `1px solid ${getPositionColor(posText).border}`,
                                    background: "rgba(0, 0, 0, 0.18)",
                                    minWidth: "24px",
                                    textAlign: "center",
                                  }}
                                >
                                  {posText}
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>${draftedPlayer.value.toFixed(0)}</span>
                              </div>
                            </>
                          ) : isCurrent ? (
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                color: "var(--warning)",
                                letterSpacing: "0.02em",
                              }}
                            >
                              ON CLOCK
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                              {pick.round}.{pick.pickInRound} <span style={{ fontSize: "0.58rem", opacity: 0.7 }}>(#{pick.overallPick})</span>
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
