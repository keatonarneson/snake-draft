"use client";

import React, { useMemo, useState } from "react";
import styles from "../DashboardSummary.module.css";
import { DraftPick, ScarcityInfo, TargetMetrics } from "../../engine";
import { Player } from "../../types/draft";

interface TargetBoardPickPlayer {
  player: Player;
  metrics: TargetMetrics;
  roundSurvivalProb: number;
}

interface TargetBoardPickCandidate {
  player: Player;
  roundSurvivalProb: number;
}

interface TargetBoardPick {
  round: number;
  overallPick: number;
  positionTarget: string | null;
  players: TargetBoardPickPlayer[];
  candidates: TargetBoardPickCandidate[];
}

interface TargetBoardCardProps {
  targetBoardData: TargetBoardPick[];
  userPicks: DraftPick[];
  currentPickIndex: number;
  draftedPlayerIds: Set<string>;
  isOnClock: boolean;
  onDraftPlayer: (playerId: string) => void;
  draftActionLabel?: string;
  scarcityMap?: Record<string, ScarcityInfo>;
  onFocusPlayer?: (playerId: string) => void;
  onSetRoundPositionTarget?: (round: number, position: string | null) => void;
  onMoveTargetPlayer?: (playerId: string, fromRound: number, toRound: number) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  onAddTargetPlayerToRound?: (playerId: string, round: number) => void;
}

const POSITIONS = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "UT"];

const getSurvivalLevel = (probability: number) => {
  if (probability >= 0.7) return "high";
  if (probability >= 0.3) return "medium";
  return "low";
};

const getPressureLevel = (valueDropOff: number) => {
  if (valueDropOff >= 5.0) return "high";
  if (valueDropOff >= 1.5) return "med";
  return "low";
};

export function TargetBoardCard({
  targetBoardData,
  userPicks,
  currentPickIndex,
  draftedPlayerIds,
  isOnClock,
  onDraftPlayer,
  draftActionLabel,
  scarcityMap,
  onFocusPlayer,
  onSetRoundPositionTarget,
  onMoveTargetPlayer,
  onToggleTargetPlayer,
  onAddTargetPlayerToRound,
}: TargetBoardCardProps) {
  const [dragOverRound, setDragOverRound] = useState<number | null>(null);

  // Rounds the user can still slot a target into, in pick order — the axis
  // for both the lane layout and the nudge arrows.
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
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--warning)" }}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Target Board (Draft Plan)
        </h3>
        <span className={styles.targetQueueHint}>
          Drag targets between rounds (or use the arrows). Set a position goal per round for suggestions.
        </span>
      </div>

      {targetBoardData.length === 0 ? (
        <div className={styles.targetQueueEmpty}>No upcoming picks.</div>
      ) : (
        <div className={styles.planBoard}>
          {targetBoardData.map((pick, laneIndex) => {
            const isNextLane = laneIndex === 0;
            const pressure = pick.positionTarget ? scarcityMap?.[pick.positionTarget] : undefined;

            return (
              <div
                key={pick.round}
                className={styles.planLane}
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
                <div className={styles.planLaneHead}>
                  <strong>R{pick.round}</strong>
                  <span>Pick #{pick.overallPick}</span>
                  {onSetRoundPositionTarget && (
                    <select
                      className={styles.planLaneSelect}
                      value={pick.positionTarget || ""}
                      title="Position goal for this round"
                      onChange={(event) =>
                        onSetRoundPositionTarget(pick.round, event.target.value === "" ? null : event.target.value)
                      }
                    >
                      <option value="">Pos: any</option>
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Scarcity signal sits next to the decision it informs. */}
                {pressure && (
                  <div className={styles.planPressureHint} data-pressure={getPressureLevel(pressure.valueDropOff)}>
                    <b>${pressure.valueDropOff.toFixed(1)} drop</b>
                    <span>Market {pressure.marketPressureLevel}</span>
                  </div>
                )}

                {pick.players.length > 0 ? (
                  <div className={styles.planLaneBody}>
                    {pick.players.map(({ player, metrics, roundSurvivalProb }) => {
                      const isPlayerDrafted = draftedPlayerIds.has(player.id);
                      const pct = Math.round(roundSurvivalProb * 100);
                      const level = getSurvivalLevel(roundSurvivalProb);
                      const roundIdx = futureRounds.indexOf(pick.round);

                      // Engine's suggested round, translated to plain words.
                      const suggRound = metrics.optimalRound;
                      const suggProb = metrics.survivalProbabilities.find((sp) => sp.round === suggRound)?.probability;
                      const showSugg = !isPlayerDrafted && suggRound !== -1 && suggRound !== pick.round;
                      const suggTone = suggRound < pick.round ? "earlier" : "later";

                      return (
                        <div
                          key={player.id}
                          className={styles.planChip}
                          data-survival={isPlayerDrafted ? undefined : level}
                          data-drafted={isPlayerDrafted}
                          draggable={!isPlayerDrafted && !!onMoveTargetPlayer}
                          onClick={() => onFocusPlayer?.(player.id)}
                          title={onFocusPlayer ? `Inspect ${player.name} in Player Focus` : undefined}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", `${player.id}:${pick.round}`);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDragOverRound(null)}
                        >
                          <div className={styles.planChipTop}>
                            <span className={styles.planChipName}>{player.name}</span>
                            {isPlayerDrafted ? (
                              <span className={styles.planChipGone}>Drafted</span>
                            ) : (
                              <span
                                className={styles.targetChipPct}
                                data-survival={level}
                                title={`${pct}% chance to reach Round ${pick.round} (Pick #${pick.overallPick})`}
                              >
                                {pct}%
                              </span>
                            )}
                            {onToggleTargetPlayer && (
                              <button
                                type="button"
                                className={styles.targetChipRemove}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onToggleTargetPlayer(player.id);
                                }}
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

                          <div className={styles.planChipBottom}>
                            <span className={styles.planChipSub}>
                              ADP {player.adp.toFixed(0)} · {player.positions.join("/")}
                            </span>
                            {showSugg && (
                              <span
                                className={styles.planChipSugg}
                                data-tone={suggTone}
                                title={
                                  suggTone === "earlier"
                                    ? `Unlikely to last this long — engine suggests taking him by Round ${suggRound}`
                                    : `Likely still available later — engine suggests waiting until Round ${suggRound}`
                                }
                              >
                                {suggTone === "earlier" ? "Take by" : "Could wait to"} R{suggRound}
                                {suggProb !== undefined ? ` · ${Math.round(suggProb * 100)}%` : ""}
                              </span>
                            )}
                            {!isPlayerDrafted && onMoveTargetPlayer && (
                              <span className={styles.planChipMoves}>
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
                          </div>

                          {/* Drafting is the Draft Room's job; only the on-deck lane gets a button. */}
                          {!isPlayerDrafted && isOnClock && isNextLane && (
                            <button
                              type="button"
                              className={`btn btn-primary ${styles.planDraftButton}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDraftPlayer(player.id);
                              }}
                            >
                              {draftActionLabel ?? "Draft"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.planLaneEmpty}>
                    {onMoveTargetPlayer
                      ? "No targets — star players in the pool, or drag one here."
                      : "No targets — star players in the pool."}
                  </div>
                )}

                {pick.positionTarget && pick.candidates.length > 0 && (
                  <div className={styles.planCandidates}>
                    <span className={styles.planCandidatesTitle}>Suggested {pick.positionTarget}</span>
                    {pick.candidates.map(({ player, roundSurvivalProb }) => (
                      <div
                        key={player.id}
                        className={styles.planCandidateChip}
                        onClick={() => onFocusPlayer?.(player.id)}
                        title={onFocusPlayer ? `Inspect ${player.name} in Player Focus` : undefined}
                        style={onFocusPlayer ? { cursor: "pointer" } : undefined}
                      >
                        <span className={styles.planCandidateName}>{player.name}</span>
                        <span
                          className={styles.targetChipPct}
                          data-survival={getSurvivalLevel(roundSurvivalProb)}
                          title={`${Math.round(roundSurvivalProb * 100)}% chance to reach Round ${pick.round}`}
                        >
                          {Math.round(roundSurvivalProb * 100)}%
                        </span>
                        {onAddTargetPlayerToRound && (
                          <button
                            type="button"
                            className={styles.planCandidateAdd}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddTargetPlayerToRound(player.id, pick.round);
                            }}
                            title={`Target ${player.name} for Round ${pick.round}`}
                          >
                            + Target
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { TargetBoardPick, TargetBoardPickPlayer, TargetBoardPickCandidate };
