"use client";

import React from "react";
import styles from "../DashboardSummary.module.css";
import { TargetBoardPick } from "./TargetBoardCard";

interface TargetQueueCardProps {
  draftedPlayerIds: Set<string>;
  onFocusPlayer?: (playerId: string) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  targetBoardData: TargetBoardPick[];
}

const getSurvivalLevel = (probability: number) => {
  if (probability >= 0.7) return "high";
  if (probability >= 0.3) return "medium";
  return "low";
};

export function TargetQueueCard({
  draftedPlayerIds,
  onFocusPlayer,
  onToggleTargetPlayer,
  targetBoardData,
}: TargetQueueCardProps) {
  const queuePicks = targetBoardData.slice(0, 4);

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
            style={{ color: "var(--warning)" }}
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Target Queue
        </h3>
      </div>

      {queuePicks.length === 0 ? (
        <div className={styles.targetQueueEmpty}>No upcoming picks.</div>
      ) : (
        <div className={styles.targetQueueList}>
          {queuePicks.map((pick) => {
            const visiblePlayers = pick.players.slice(0, 4);
            const extraCount = Math.max(0, pick.players.length - visiblePlayers.length);
            const hasTargets = visiblePlayers.length > 0 || pick.positionTarget;

            return (
              <div key={pick.round} className={styles.targetQueueRound}>
                <div className={styles.targetQueueRoundMeta}>
                  <strong>R{pick.round}</strong>
                  <span>Pick #{pick.overallPick}</span>
                </div>

                <div className={styles.targetQueueTargets}>
                  {pick.positionTarget && (
                    <span className={styles.targetQueuePosition}>{pick.positionTarget}</span>
                  )}

                  {visiblePlayers.map(({ player, roundSurvivalProb }) => {
                    const isDrafted = draftedPlayerIds.has(player.id);

                    return (
                      <span
                        key={player.id}
                        className={styles.targetQueuePlayer}
                        data-drafted={isDrafted}
                        data-survival={getSurvivalLevel(roundSurvivalProb)}
                        onClick={() => onFocusPlayer?.(player.id)}
                        role={onFocusPlayer ? "button" : undefined}
                        tabIndex={onFocusPlayer ? 0 : undefined}
                        onKeyDown={(event) => {
                          if (!onFocusPlayer) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onFocusPlayer(player.id);
                          }
                        }}
                        title={`${Math.round(roundSurvivalProb * 100)}% chance to reach Round ${pick.round}`}
                      >
                        <span className={styles.targetQueuePlayerName}>{player.name}</span>
                        <small>{player.positions.join("/")}</small>
                        <b>{Math.round(roundSurvivalProb * 100)}%</b>
                        {onToggleTargetPlayer && (
                          <button
                            type="button"
                            className={styles.targetQueueRemove}
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleTargetPlayer(player.id);
                            }}
                            aria-label={`Remove ${player.name} from target queue`}
                            title="Remove target"
                          >
                            x
                          </button>
                        )}
                      </span>
                    );
                  })}

                  {extraCount > 0 && (
                    <span className={styles.targetQueueMore}>+{extraCount}</span>
                  )}

                  {!hasTargets && (
                    <span className={styles.targetQueuePlaceholder}>No targets yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
