"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import styles from "../app/page.module.css";
import { DraftPick, getCpuArchetype } from "../utils/draftEngine";
import { Player } from "../utils/sampleData";

interface DraftBoardProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  players: Player[];
  cpuSavesStrategies?: string[];
}

export default function DraftBoard({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  players,
  cpuSavesStrategies = [],
}: DraftBoardProps) {
  const activePickRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeGridCellRef = useRef<HTMLTableCellElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [debugSearchQuery, setDebugSearchQuery] = useState("");
  const [debugFilterType, setDebugFilterType] = useState<"all" | "drafted" | "undrafted">("all");
  const [expandedPickIndex, setExpandedPickIndex] = useState<number | null>(null);

  // Auto-scroll the pick sequence to keep the current pick centered
  useEffect(() => {
    if (activePickRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeElement = activePickRef.current;
      
      const containerHeight = container.clientHeight;
      const activeTop = activeElement.offsetTop;
      const activeHeight = activeElement.clientHeight;

      container.scrollTo({
        top: activeTop - containerHeight / 2 + activeHeight / 2,
        behavior: "smooth",
      });
    }
  }, [currentPickIndex]);

  // Auto-scroll the grid board to keep the active cell centered
  useEffect(() => {
    if (isModalOpen) {
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
    }
  }, [currentPickIndex, isModalOpen]);

  const playerMap = useMemo(() => {
    return new Map(players.map((p) => [p.id, p]));
  }, [players]);

  // Calculate picks until user's turn
  const currentPick = picks[currentPickIndex];
  let picksUntilUser = -1;
  
  if (currentPick) {
    if (currentPick.teamIndex === userTeamIndex) {
      picksUntilUser = 0;
    } else {
      let count = 0;
      for (let i = currentPickIndex; i < picks.length; i++) {
        if (picks[i].teamIndex === userTeamIndex) {
          picksUntilUser = count;
          break;
        }
        count++;
      }
    }
  }

  const gridMap = useMemo(() => {
    const map = new Map<string, DraftPick>();
    picks.forEach((p) => {
      map.set(`${p.round}-${p.teamIndex}`, p);
    });
    return map;
  }, [picks]);

  const filteredPicks = useMemo(() => {
    return picks.filter((pick) => {
      // 1. Filter type
      if (debugFilterType === "drafted" && !pick.playerDraftedId) return false;
      if (debugFilterType === "undrafted" && pick.playerDraftedId) return false;

      // 2. Search query
      if (debugSearchQuery.trim() !== "") {
        const query = debugSearchQuery.toLowerCase();
        
        // Match team name
        const teamName = teamNames[pick.teamIndex]?.toLowerCase() || "";
        
        // Match player name
        let playerName = "";
        if (pick.playerDraftedId) {
          const player = playerMap.get(pick.playerDraftedId);
          if (player) {
            playerName = player.name.toLowerCase();
          }
        }
        
        return teamName.includes(query) || playerName.includes(query);
      }

      return true;
    });
  }, [picks, debugFilterType, debugSearchQuery, teamNames, playerMap]);

  const numTeams = teamNames.length;
  const numRounds = picks[picks.length - 1]?.round || 30;

  const getPositionColor = (p: Player) => {
    if (p.isPitcher) {
      if (p.positions.includes("RP")) {
        return {
          bg: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.25)",
          color: "#22d3ee"
        };
      }
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.25)",
        color: "#60a5fa"
      };
    }
    
    if (p.positions.includes("C")) {
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.25)",
        color: "#34d399"
      };
    }
    
    if (p.positions.some(pos => ["1B", "2B", "3B", "SS"].includes(pos))) {
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.25)",
        color: "#fbbf24"
      };
    }
    
    if (p.positions.includes("OF")) {
      return {
        bg: "rgba(139, 92, 246, 0.12)",
        border: "rgba(139, 92, 246, 0.25)",
        color: "#a78bfa"
      };
    }
    
    return {
      bg: "rgba(156, 163, 175, 0.08)",
      border: "rgba(156, 163, 175, 0.2)",
      color: "#d1d5db"
    };
  };

  return (
    <div className={styles.card} style={{ flexGrow: 1 }}>
      <div className={styles.cardHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className={styles.cardTitle} style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Draft Tracker
        </h3>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "var(--primary)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)";
              e.currentTarget.style.color = "var(--primary)";
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Board
          </button>

          <button
            onClick={() => setIsDebugModalOpen(true)}
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "var(--success)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--success)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.12)";
              e.currentTarget.style.color = "var(--success)";
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Draft Log
          </button>

          {picksUntilUser !== -1 && (
            <span
              className={`badge ${
                picksUntilUser === 0
                  ? "badge-primary"
                  : picksUntilUser <= 5
                  ? "badge-warning"
                  : "badge-secondary"
              }`}
              style={{ fontSize: "0.68rem", padding: "3px 6px", whiteSpace: "nowrap" }}
            >
              {picksUntilUser === 0 ? "You!" : `${picksUntilUser} till you`}
            </span>
          )}
        </div>
      </div>

      <div ref={containerRef} className={styles.draftSeqList}>
        {picks.map((pick, index) => {
          const isCurrent = index === currentPickIndex;
          const isDrafted = index < currentPickIndex;
          const isUser = pick.teamIndex === userTeamIndex;
          const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
          
          let itemClass = styles.draftSeqItem;
          if (isCurrent) itemClass += ` ${styles.draftSeqItemActive}`;
          if (isDrafted) itemClass += ` ${styles.draftSeqItemDrafted}`;

          const styleOverride: React.CSSProperties = {};
          if (isUser && !isDrafted && !isCurrent) {
            styleOverride.borderColor = "rgba(99, 102, 241, 0.2)";
            styleOverride.backgroundColor = "rgba(99, 102, 241, 0.02)";
          }

          return (
            <div
              key={pick.overallPick}
              ref={isCurrent ? activePickRef : null}
              className={itemClass}
              style={styleOverride}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    color: isCurrent ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: 600,
                    width: "48px",
                  }}
                >
                  {pick.round}-{pick.pickInRound}
                </span>
                
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span className={styles.draftSeqTeamName}>
                    {teamNames[pick.teamIndex]}
                    {isUser && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          marginLeft: "4px",
                          color: "var(--primary)",
                          fontWeight: 700,
                        }}
                      >
                        (YOU)
                      </span>
                    )}
                  </span>
                  {draftedPlayer ? (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {draftedPlayer.name} ({draftedPlayer.positions.join("/")})
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {isCurrent ? "ON THE CLOCK" : "Queued"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                {draftedPlayer ? (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      color: draftedPlayer.value >= 0 ? "var(--success)" : "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    ${draftedPlayer.value.toFixed(1)}
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    #{pick.overallPick}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Grid Board Modal Popup */}
      {isModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(10, 11, 18, 0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              background: "#161821",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              width: "95vw",
              maxWidth: "1600px",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "24px",
              boxShadow: "0 24px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-outfit)", color: "var(--text-primary)" }}>
                  League Draft Board
                </h2>
                <span className="badge badge-primary" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Grid View</span>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  color: "var(--text-muted)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1rem",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.color = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                ✕
              </button>
            </div>

            {/* Position Legend & Meta Info */}
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

            {/* Scrollable Table Viewport */}
            <div 
              ref={gridContainerRef}
              style={{ 
                overflowX: "auto", 
                overflowY: "auto",
                flexGrow: 1,
                border: "1px solid rgba(255,255,255,0.06)", 
                borderRadius: "10px", 
                background: "rgba(0,0,0,0.2)",
                padding: "4px"
              }}
            >
              <table 
                style={{ 
                  width: "max-content", 
                  borderCollapse: "collapse", 
                  fontSize: "0.68rem",
                  color: "var(--text-secondary)"
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
                        fontWeight: 600
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
                            borderRight: isUser ? "2px solid rgba(99, 102, 241, 0.45)" : "none"
                          }}
                        >
                          {name} {isUser && "(YOU)"}
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
                          background: round % 2 === 0 ? "rgba(255,255,255,0.005)" : "transparent"
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
                            whiteSpace: "nowrap"
                          }}
                        >
                          Rd {round} <span style={{ color: isLeftToRight ? "var(--success)" : "var(--primary)", opacity: 0.85, fontSize: "0.6rem", marginLeft: "2px" }}>{isLeftToRight ? "▶" : "◀"}</span>
                        </td>
                        {Array.from({ length: numTeams }).map((_, tIdx) => {
                          const pick = gridMap.get(`${round}-${tIdx}`);
                          if (!pick) {
                            return <td key={tIdx} style={{ minWidth: "120px", maxWidth: "120px", padding: "6px" }} />;
                          }

                          const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
                          const pickIndex = picks.findIndex(p => p.overallPick === pick.overallPick);
                          const isDrafted = pickIndex < currentPickIndex;
                          const isCurrent = pickIndex === currentPickIndex;
                          const isUser = tIdx === userTeamIndex;

                          let cellBg = "transparent";
                          let cellBorder = "1px solid rgba(255,255,255,0.03)";
                          let textColor = "var(--text-secondary)";
                          let posText = "";

                          if (draftedPlayer) {
                            const colors = getPositionColor(draftedPlayer);
                            cellBg = colors.bg;
                            cellBorder = `1px solid ${colors.border}`;
                            textColor = colors.color;
                            posText = draftedPlayer.positions.join("/");
                          } else if (isCurrent) {
                            cellBg = "rgba(255, 193, 7, 0.05)";
                            cellBorder = "1px solid var(--warning)";
                            textColor = "var(--warning)";
                          } else if (isUser) {
                            cellBg = "rgba(99, 102, 241, 0.02)";
                          }

                          const getAbbreviatedName = (name: string) => {
                            const parts = name.split(" ");
                            if (parts.length <= 1) return name;
                            const firstInitial = parts[0][0];
                            const lastName = parts.slice(1).join(" ");
                            return `${firstInitial}. ${lastName}`;
                          };

                          // Highlight user column vertical channel
                          let borderLeftStyle = cellBorder;
                          let borderRightStyle = cellBorder;
                          if (isUser) {
                            borderLeftStyle = "2px solid rgba(99, 102, 241, 0.45)";
                            borderRightStyle = "2px solid rgba(99, 102, 241, 0.45)";
                          }

                          // Tooltips
                          let tooltipText = "";
                          if (draftedPlayer) {
                            tooltipText = `${draftedPlayer.name} (${posText}) - Drafted by ${teamNames[tIdx]} (Value: $${draftedPlayer.value.toFixed(1)}) - Rd ${pick.round}, Pick ${pick.pickInRound} (Overall #${pick.overallPick})`;
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
                                        textOverflow: "ellipsis"
                                      }}
                                    >
                                      {getAbbreviatedName(draftedPlayer.name)}
                                    </span>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.62rem" }}>
                                      <span style={{ color: textColor, fontWeight: 700 }}>{posText}</span>
                                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>${draftedPlayer.value.toFixed(0)}</span>
                                    </div>
                                  </>
                                ) : isCurrent ? (
                                  <span 
                                    style={{ 
                                      fontWeight: 700, 
                                      fontSize: "0.65rem",
                                      color: "var(--warning)",
                                      letterSpacing: "0.02em"
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
          </div>
        </div>
      )}

      {/* Draft Log & Picker Debugger Modal */}
      {isDebugModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(10, 11, 18, 0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setIsDebugModalOpen(false)}
        >
          <div 
            style={{
              background: "#161821",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              width: "95vw",
              maxWidth: "1200px",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "24px",
              boxShadow: "0 24px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.15)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-outfit)", color: "var(--text-primary)" }}>
                  Draft Log & CPU Picker Debugger
                </h2>
                <span className="badge badge-success" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Debug View</span>
              </div>

              <button 
                onClick={() => setIsDebugModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  color: "var(--text-muted)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.color = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                &times;
              </button>
            </div>

            {/* Filter and Search Controls */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", gap: "8px", flexGrow: 1, maxWidth: "400px" }}>
                <input
                  type="text"
                  placeholder="Search by player or team name..."
                  value={debugSearchQuery}
                  onChange={(e) => setDebugSearchQuery(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    width: "100%",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                {(["all", "drafted", "undrafted"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDebugFilterType(type)}
                    style={{
                      background: debugFilterType === type ? "var(--success)" : "rgba(255,255,255,0.05)",
                      border: "none",
                      color: debugFilterType === type ? "#ffffff" : "var(--text-secondary)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {type === "all" ? "All Picks" : type === "drafted" ? "Drafted Only" : "Pending Only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Container */}
            <div style={{ flexGrow: 1, overflowY: "auto", background: "rgba(0, 0, 0, 0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Pick #</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Round</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Team</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Player Drafted</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>ADP</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Min/Max</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "right" }}>CPU Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPicks.map((pick) => {
                    const isDrafted = pick.playerDraftedId !== null;
                    const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
                    const isUser = pick.teamIndex === userTeamIndex;
                    const isExpanded = expandedPickIndex === pick.overallPick;
                    
                    const cpuDetails = pick.cpuScoreDetails;
                    const cpuArchetype = isUser ? "USER" : getCpuArchetype(pick.teamIndex, userTeamIndex);
                    
                    let rowBg = "transparent";
                    if (isUser) {
                      rowBg = "rgba(99, 102, 241, 0.03)";
                    } else if (pick.overallPick === currentPickIndex + 1) {
                      rowBg = "rgba(245, 158, 11, 0.05)"; // Active
                    }

                    return (
                      <React.Fragment key={pick.overallPick}>
                        <tr 
                          onClick={() => {
                            if (isDrafted && cpuDetails) {
                              setExpandedPickIndex(isExpanded ? null : pick.overallPick);
                            }
                          }}
                          style={{
                            background: rowBg,
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            cursor: isDrafted && cpuDetails ? "pointer" : "default",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                            #{pick.overallPick}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            Round {pick.round}, Pick {pick.pickInRound}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: isUser ? 700 : 500, color: isUser ? "var(--primary)" : "var(--text-primary)" }}>
                                {teamNames[pick.teamIndex]}
                              </span>
                              <span 
                                className={`badge ${
                                  isUser 
                                    ? "badge-primary" 
                                    : cpuArchetype === "market"
                                    ? "badge-secondary"
                                    : cpuArchetype === "projection"
                                    ? "badge-accent"
                                    : cpuArchetype === "need"
                                    ? "badge-warning"
                                    : cpuArchetype === "upside"
                                    ? "badge-danger"
                                    : "badge-outline"
                                }`} 
                                style={{ fontSize: "0.55rem", padding: "1px 5px", textTransform: "uppercase" }}
                              >
                                {cpuArchetype}
                              </span>
                              {!isUser && (
                                <span 
                                  className={`badge ${
                                    (cpuSavesStrategies[pick.teamIndex] || "balanced") === "aggressive"
                                      ? "badge-danger"
                                      : (cpuSavesStrategies[pick.teamIndex] || "balanced") === "wait"
                                      ? "badge-secondary"
                                      : "badge-outline"
                                  }`}
                                  style={{ fontSize: "0.55rem", padding: "1px 5px", textTransform: "uppercase" }}
                                >
                                  {(cpuSavesStrategies[pick.teamIndex] || "balanced")} SV
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {draftedPlayer ? (
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  {draftedPlayer.name}
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                  {draftedPlayer.positions.join("/")} — {draftedPlayer.team}
                                </span>
                              </div>
                            ) : pick.overallPick === currentPickIndex + 1 ? (
                              <span style={{ color: "var(--warning)", fontWeight: 700 }}>
                                ON THE CLOCK
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>
                            {draftedPlayer ? draftedPlayer.adp.toFixed(1) : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            {draftedPlayer ? `${draftedPlayer.minPick || 1}-${draftedPlayer.maxPick || 350}` : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                            {isDrafted ? (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                <span style={{ fontWeight: 700, color: pick.cpuScore !== undefined && pick.cpuScore >= 30 ? "var(--success)" : pick.cpuScore !== undefined && pick.cpuScore >= 15 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                  {pick.cpuScore !== undefined ? pick.cpuScore.toFixed(2) : "—"}
                                </span>
                                {cpuDetails && (
                                  <svg 
                                    width="10" 
                                    height="10" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", color: "var(--text-muted)" }}
                                  >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                )}
                              </div>
                            ) : "—"}
                          </td>
                        </tr>

                        {/* Expanded Breakdown */}
                        {isExpanded && cpuDetails && (
                          <tr style={{ background: "rgba(255,255,255,0.01)" }}>
                            <td colSpan={7} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Base Value</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700 }}>
                                    ${cpuDetails.baseValue.toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                    ADP: ${cpuDetails.adpDollars.toFixed(1)} | Consensus: ${cpuDetails.consensusDollars.toFixed(1)}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Positional scarcity</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: cpuDetails.scarcityBonus > 0 ? "var(--primary)" : "var(--text-secondary)" }}>
                                    +{cpuDetails.scarcityBonus.toFixed(2)}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Roster, Cat & Saves</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.rosterNeedBonus + cpuDetails.categoryNeedBonus + (cpuDetails.savesStrategyBonus || 0)) > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                                    +{(cpuDetails.rosterNeedBonus + cpuDetails.categoryNeedBonus + (cpuDetails.savesStrategyBonus || 0)).toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                    Roster: +{cpuDetails.rosterNeedBonus.toFixed(1)} | Cat: +{cpuDetails.categoryNeedBonus.toFixed(1)} | SV: {cpuDetails.savesStrategyBonus > 0 ? "+" : ""}{(cpuDetails.savesStrategyBonus || 0).toFixed(1)}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Upside & Urgency</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.upsideBonus + cpuDetails.positionRunBonus + (cpuDetails.urgencyBonus || 0)) > 0 ? "var(--accent)" : "var(--text-secondary)" }}>
                                    +{(cpuDetails.upsideBonus + cpuDetails.positionRunBonus + (cpuDetails.urgencyBonus || 0)).toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                    Upside: +{cpuDetails.upsideBonus.toFixed(1)} | Runs: +{cpuDetails.positionRunBonus.toFixed(1)} | Urg: +{(cpuDetails.urgencyBonus || 0).toFixed(1)}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Playing Time / Noise</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.roleSecurityBonus + cpuDetails.randomNoise) >= 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                    +{(cpuDetails.roleSecurityBonus + cpuDetails.randomNoise).toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                    PT: +{cpuDetails.roleSecurityBonus.toFixed(1)} | Noise: {cpuDetails.randomNoise >= 0 ? "+" : ""}{cpuDetails.randomNoise.toFixed(1)}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--danger)", textTransform: "uppercase" }}>Penalties</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: "var(--danger)" }}>
                                    -{(cpuDetails.reachPenalty + cpuDetails.rosterPenalty).toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                    Reach: -{cpuDetails.reachPenalty.toFixed(1)} | Roster: -{cpuDetails.rosterPenalty.toFixed(1)}
                                  </span>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredPicks.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                        No picks matched your search/filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
