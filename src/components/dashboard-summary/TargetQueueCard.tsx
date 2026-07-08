"use client";

import React from "react";
import styles from "../DashboardSummary.module.css";
import { TargetBoardPick } from "./TargetBoardCard";

interface TargetQueueCardProps {
  draftedPlayerIds: Set<string>;
  onFocusPlayer?: (playerId: string) => void;
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
  targetBoardData,
}: TargetQueueCardProps) {
  const queuePicks = targetBoardData.slice(0, 6);

  return (
    <div className="card glow-panel">
      <div className="cardHeader">
        <h3 className="cardTitle" style={{ margin: 0 }}>
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
        <span className={styles.targetQueueHint}>Your targets and their odds of reaching each upcoming pick</span>
      </div>

      {queuePicks.length === 0 ? (
        <div className={styles.targetQueueEmpty}>No upcoming picks.</div>
      ) : (
        <div className={styles.targetQueueRail}>
          {queuePicks.map((pick) => {
            const liveTargets = pick.players.filter(({ player }) => !draftedPlayerIds.has(player.id));
            const sortedTargets = [...liveTargets].sort(
              (a, b) => a.roundSurvivalProb - b.roundSurvivalProb
            );
            const hasTargets = sortedTargets.length > 0;
            // Worst (lowest) survival drives the cell's at-a-glance urgency border.
            const worst = sortedTargets[0];

            return (
              <div
                key={pick.round}
                className={styles.targetRailCell}
                data-survival={worst ? getSurvivalLevel(worst.roundSurvivalProb) : undefined}
                data-empty={!hasTargets}
              >
                <div className={styles.targetRailHead}>
                  <strong>R{pick.round}</strong>
                  <span>#{pick.overallPick}</span>
                </div>

                {hasTargets ? (
                  <div className={styles.targetRailList}>
                    {sortedTargets.map(({ player, roundSurvivalProb }) => {
                      const pct = Math.round(roundSurvivalProb * 100);
                      const title = `${player.name}: ${pct}% chance to reach Round ${pick.round}${
                        onFocusPlayer ? " — click to inspect" : ""
                      }`;

                      if (onFocusPlayer) {
                        return (
                          <button
                            key={player.id}
                            type="button"
                            className={styles.targetRailPlayer}
                            data-survival={getSurvivalLevel(roundSurvivalProb)}
                            onClick={() => onFocusPlayer(player.id)}
                            title={title}
                          >
                            <span className={styles.targetRailName}>{player.name}</span>
                            <b>{pct}%</b>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={player.id}
                          className={styles.targetRailPlayer}
                          data-survival={getSurvivalLevel(roundSurvivalProb)}
                          title={title}
                        >
                          <span className={styles.targetRailName}>{player.name}</span>
                          <b>{pct}%</b>
                        </div>
                      );
                    })}
                  </div>
                ) : pick.positionTarget ? (
                  <span className={styles.targetRailNeed}>Need {pick.positionTarget}</span>
                ) : (
                  <span className={styles.targetRailNone}>No targets</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
