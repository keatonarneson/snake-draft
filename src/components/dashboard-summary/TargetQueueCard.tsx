"use client";

import React, { useMemo, useState } from "react";
import styles from "../DashboardSummary.module.css";
import { DraftPick } from "../../engine";
import { TargetBoardPick } from "./TargetBoardCard";

interface TargetQueueCardProps {
  draftedPlayerIds: Set<string>;
  userPicks: DraftPick[];
  currentPickIndex: number;
  onFocusPlayer?: (playerId: string) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  onMoveTargetPlayer?: (playerId: string, fromRound: number, toRound: number) => void;
  targetBoardData: TargetBoardPick[];
}

const getSurvivalLevel = (probability: number) => {
  if (probability >= 0.7) return "high";
  if (probability >= 0.3) return "medium";
  return "low";
};

export function TargetQueueCard({
  draftedPlayerIds,
  userPicks,
  currentPickIndex,
  onFocusPlayer,
  onToggleTargetPlayer,
  onMoveTargetPlayer,
  targetBoardData,
}: TargetQueueCardProps) {
  const [dragOverRound, setDragOverRound] = useState<number | null>(null);

  // Every round the user can still slot into, in pick order — the axis the
  // nudge arrows step along (so a target can reach empty rounds not shown here).
  const futureRounds = useMemo(
    () =>
      userPicks
        .filter((up) => up.overallPick >= currentPickIndex + 1)
        .map((up) => up.round),
    [userPicks, currentPickIndex]
  );

  const nudgeTarget = (playerId: string, fromRound: number, direction: -1 | 1) => {
    const idx = futureRounds.indexOf(fromRound);
    if (idx === -1) return;
    const toRound = futureRounds[idx + direction];
    if (toRound !== undefined) onMoveTargetPlayer?.(playerId, fromRound, toRound);
  };

  // Only rounds with something to show earn a lane; the arrows reach the rest.
  const queuePicks = targetBoardData
    .slice(0, 6)
    .map((pick) => ({
      ...pick,
      liveTargets: pick.players.filter(({ player }) => !draftedPlayerIds.has(player.id)),
    }))
    .filter((pick) => pick.liveTargets.length > 0 || pick.positionTarget);

  const handleDrop = (event: React.DragEvent, toRound: number) => {
    event.preventDefault();
    setDragOverRound(null);
    const payload = event.dataTransfer.getData("text/plain");
    const [playerId, fromRoundRaw] = payload.split(":");
    const fromRound = Number(fromRoundRaw);
    if (!playerId || Number.isNaN(fromRound) || fromRound === toRound) return;
    onMoveTargetPlayer?.(playerId, fromRound, toRound);
  };

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
        <span className={styles.targetQueueHint}>
          {onMoveTargetPlayer
            ? "Odds each target reaches its pick — drag between rounds or use the arrows"
            : "Your targets and their odds of reaching each upcoming pick"}
        </span>
      </div>

      {queuePicks.length === 0 ? (
        <div className={styles.targetQueueEmpty}>
          {targetBoardData.length === 0
            ? "No upcoming picks."
            : "No targets queued — star players in the pool to track them here."}
        </div>
      ) : (
        <div className={styles.targetQueueRail}>
          {queuePicks.map((pick) => {
            const sortedTargets = [...pick.liveTargets].sort(
              (a, b) => a.roundSurvivalProb - b.roundSurvivalProb
            );
            const hasTargets = sortedTargets.length > 0;
            const roundIdx = futureRounds.indexOf(pick.round);

            return (
              <div
                key={pick.round}
                className={styles.targetRoundGroup}
                data-drop-target={dragOverRound === pick.round}
                onDragOver={(event) => {
                  if (!onMoveTargetPlayer) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverRound(pick.round);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDragOverRound(null);
                  }
                }}
                onDrop={(event) => handleDrop(event, pick.round)}
              >
                <div className={styles.targetRoundHead}>
                  <strong>R{pick.round}</strong>
                  <span>Pick #{pick.overallPick}</span>
                  <span className={styles.targetRoundCount}>
                    {hasTargets
                      ? `${sortedTargets.length} target${sortedTargets.length === 1 ? "" : "s"}`
                      : pick.positionTarget
                        ? `Need ${pick.positionTarget}`
                        : "No targets"}
                  </span>
                </div>

                {hasTargets ? (
                  <div className={styles.targetChipGrid}>
                    {sortedTargets.map(({ player, roundSurvivalProb }) => {
                      const pct = Math.round(roundSurvivalProb * 100);
                      const level = getSurvivalLevel(roundSurvivalProb);
                      const positions = player.positions.join("/");
                      const title = `${player.name}: ${pct}% chance to reach Round ${pick.round}${
                        onMoveTargetPlayer ? " - drag or use arrows to move" : onFocusPlayer ? " - click to inspect" : ""
                      }`;

                      return (
                        <div
                          key={player.id}
                          className={styles.targetChip}
                          data-survival={level}
                          title={title}
                          draggable={!!onMoveTargetPlayer}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", `${player.id}:${pick.round}`);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDragOverRound(null)}
                        >
                          {onFocusPlayer ? (
                            <button
                              type="button"
                              className={styles.targetChipInspect}
                              onClick={() => onFocusPlayer(player.id)}
                            >
                              <span className={styles.targetChipName}>{player.name}</span>
                              <span className={styles.targetChipPosition}>{positions}</span>
                            </button>
                          ) : (
                            <span className={styles.targetChipInspect}>
                              <span className={styles.targetChipName}>{player.name}</span>
                              <span className={styles.targetChipPosition}>{positions}</span>
                            </span>
                          )}
                          <span className={styles.targetChipPct} data-survival={level}>
                            {pct}%
                          </span>
                          {onMoveTargetPlayer && (
                            <span className={styles.targetChipMoves}>
                              <button
                                type="button"
                                disabled={roundIdx <= 0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  nudgeTarget(player.id, pick.round, -1);
                                }}
                                title="Move to your previous pick"
                                aria-label={`Move ${player.name} one round earlier`}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m15 18-6-6 6-6" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                disabled={roundIdx === -1 || roundIdx >= futureRounds.length - 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  nudgeTarget(player.id, pick.round, 1);
                                }}
                                title="Move to your next pick"
                                aria-label={`Move ${player.name} one round later`}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m9 18 6-6-6-6" />
                                </svg>
                              </button>
                            </span>
                          )}
                          {onToggleTargetPlayer && (
                            <button
                              type="button"
                              className={styles.targetChipRemove}
                              onClick={() => onToggleTargetPlayer(player.id)}
                              title={`Remove ${player.name} from targets`}
                              aria-label={`Remove ${player.name} from targets`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : pick.positionTarget ? (
                  <span className={styles.targetRailNeed}>Position need — no players queued yet</span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
