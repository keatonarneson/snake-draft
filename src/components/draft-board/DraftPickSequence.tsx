"use client";

import React, { useEffect, useRef } from "react";
import styles from "../../app/page.module.css";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

interface DraftPickSequenceProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  playerMap: Map<string, Player>;
  canEditPicks: boolean;
  onEditPick: (pickIndex: number) => void;
}

export default function DraftPickSequence({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  playerMap,
  canEditPicks,
  onEditPick,
}: DraftPickSequenceProps) {
  const activePickRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  return (
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

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {canEditPicks && index <= currentPickIndex && (
                <button
                  onClick={() => onEditPick(index)}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--text-secondary)",
                    padding: "2px 6px",
                    borderRadius: "5px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title={draftedPlayer ? "Change this pick" : "Set this pick manually"}
                >
                  Edit
                </button>
              )}
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
  );
}
