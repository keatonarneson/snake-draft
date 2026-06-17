"use client";

import React, { useRef, useEffect } from "react";
import styles from "../app/page.module.css";
import { DraftPick } from "../utils/draftEngine";
import { Player } from "../utils/sampleData";

interface DraftBoardProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  players: Player[];
}

export default function DraftBoard({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  players,
}: DraftBoardProps) {
  const activePickRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const playerMap = new Map(players.map((p) => [p.id, p]));

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

  return (
    <div className={styles.card} style={{ flexGrow: 1 }}>
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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Draft Queue
        </h3>
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
              : `${picksUntilUser} pick${picksUntilUser > 1 ? "s" : ""} until you`}
          </span>
        )}
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
    </div>
  );
}
