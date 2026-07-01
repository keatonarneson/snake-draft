"use client";

import React from "react";
import styles from "../../app/page.module.css";

interface DraftTrackerHeaderProps {
  currentPickIndex: number;
  picksUntilUser: number;
  onUndoLastPick?: () => void;
  onOpenBoard: () => void;
  onOpenProfiles: () => void;
  onOpenDraftLog: () => void;
}

export default function DraftTrackerHeader({
  currentPickIndex,
  picksUntilUser,
  onUndoLastPick,
  onOpenBoard,
  onOpenProfiles,
  onOpenDraftLog,
}: DraftTrackerHeaderProps) {
  return (
    <div className={`${styles.cardHeader} ${styles.draftTrackerHeader}`}>
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

      <div className={styles.draftTrackerActions}>
        <button
          className={styles.draftTrackerActionButton}
          onClick={onUndoLastPick}
          disabled={!onUndoLastPick || currentPickIndex <= 0}
          style={{
            background: currentPickIndex <= 0 ? "rgba(255, 255, 255, 0.03)" : "rgba(245, 158, 11, 0.12)",
            border: currentPickIndex <= 0 ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(245, 158, 11, 0.3)",
            color: currentPickIndex <= 0 ? "var(--text-muted)" : "var(--warning)",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: currentPickIndex <= 0 ? "not-allowed" : "pointer",
            gap: "4px",
            transition: "all 0.15s ease",
          }}
          title="Undo the most recent completed pick and pause CPU auto-picking"
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
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
          </svg>
          Undo
        </button>

        <button
          className={styles.draftTrackerActionButton}
          onClick={onOpenBoard}
          style={{
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "var(--primary)",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
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
          className={styles.draftTrackerActionButton}
          onClick={onOpenProfiles}
          style={{
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            color: "var(--accent)",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
            gap: "4px",
            transition: "all 0.15s ease",
          }}
          title="View CPU team profiles and behavior weights"
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          CPU Profiles
        </button>

        <button
          className={styles.draftTrackerActionButton}
          onClick={onOpenDraftLog}
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "var(--success)",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
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
            className={`${styles.draftTrackerStatus} badge ${
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
  );
}
