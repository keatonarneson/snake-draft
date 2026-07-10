"use client";

import React from "react";
import styles from "./DraftTrackerHeader.module.css";

interface DraftTrackerHeaderProps {
  currentPickIndex: number;
  isLiveDraftMode?: boolean;
  picksUntilUser: number;
  onUndoLastPick?: () => void;
  onOpenProfiles: () => void;
  isDraftStarted: boolean;
  isDraftComplete: boolean;
  isSimulationPaused: boolean;
  canPauseSimulation: boolean;
  canStepCpu: boolean;
  onToggleSimulationPause?: () => void;
  onStepCpu?: () => void;
}

export default function DraftTrackerHeader({
  currentPickIndex,
  isLiveDraftMode = false,
  picksUntilUser,
  onUndoLastPick,
  onOpenProfiles,
  isDraftStarted,
  isDraftComplete,
  isSimulationPaused,
  canPauseSimulation,
  canStepCpu,
  onToggleSimulationPause,
  onStepCpu,
}: DraftTrackerHeaderProps) {
  const simulationControlsDisabled = !isDraftStarted || isDraftComplete;
  return (
    <div className={`cardHeader ${styles.draftTrackerHeader}`}>
      <h3 className="cardTitle" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
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
        {isLiveDraftMode ? "Live Draft Tracker" : "Draft Tracker"}
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
          title={isLiveDraftMode ? "Undo the most recent recorded pick" : "Undo the most recent completed pick and pause CPU auto-picking"}
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

        {!isLiveDraftMode && canPauseSimulation && (
          <button
            type="button"
            className={`${styles.draftTrackerActionButton} ${styles.simulationButton}`}
            onClick={onToggleSimulationPause}
            disabled={simulationControlsDisabled || !onToggleSimulationPause}
            data-active={isSimulationPaused}
            title={isSimulationPaused ? "Resume automatic CPU drafting" : "Pause automatic CPU drafting"}
          >
            {isSimulationPaused ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            )}
            {isSimulationPaused ? "Resume" : "Pause"}
          </button>
        )}

        {!isLiveDraftMode && (
          <button
            type="button"
            className={`${styles.draftTrackerActionButton} ${styles.stepButton}`}
            onClick={onStepCpu}
            disabled={simulationControlsDisabled || !canStepCpu || !onStepCpu}
            title={canStepCpu ? "Make one CPU pick and remain paused" : "Step is available when a CPU team is on the clock"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m5 5 10 7-10 7V5Zm11 0h3v14h-3V5Z" /></svg>
            Step
          </button>
        )}

        {!isLiveDraftMode && (
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
            Profiles
          </button>
        )}

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
