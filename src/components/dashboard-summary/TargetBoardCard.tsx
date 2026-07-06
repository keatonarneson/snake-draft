"use client";

import React from "react";
import { DraftPick, TargetMetrics } from "../../engine";
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
  onSetRoundPositionTarget?: (round: number, position: string | null) => void;
  onMoveTargetPlayer?: (playerId: string, fromRound: number, toRound: number) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  onAddTargetPlayerToRound?: (playerId: string, round: number) => void;
}

export function TargetBoardCard({
  targetBoardData,
  userPicks,
  currentPickIndex,
  draftedPlayerIds,
  isOnClock,
  onDraftPlayer,
  draftActionLabel,
  onSetRoundPositionTarget,
  onMoveTargetPlayer,
  onToggleTargetPlayer,
  onAddTargetPlayerToRound,
}: TargetBoardCardProps) {
  return (
    <div className="card glow-panel">
      <div className="cardHeader">
        <h3 className="cardTitle">
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
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "-6px" }}>
        Plan your upcoming picks by targeting positions or starring groups of players for specific rounds.
      </p>

      {targetBoardData.length === 0 ? (
        <div style={{ border: "1px dashed rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(255,255,255,0.01)" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>No upcoming picks</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {targetBoardData.map((pick) => {
            const hasPlayerTargets = pick.players.length > 0;
            const POSITIONS = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "UT"];

            return (
              <div
                key={pick.round}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                      Rd {pick.round} <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "0.75rem" }}>(Pick {pick.overallPick})</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Target Pos:</span>
                    {onSetRoundPositionTarget && (
                      <select
                        value={pick.positionTarget || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : e.target.value;
                          onSetRoundPositionTarget(pick.round, val);
                        }}
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-primary)",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          padding: "2px 4px",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">None</option>
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Player targets for this round */}
                {hasPlayerTargets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px" }}>
                    {pick.players.map(({ player, metrics }) => {
                      const isPlayerDrafted = draftedPlayerIds.has(player.id);

                      // Build the timeline array
                      const timeline = (() => {
                        const list: { round: number; label: string; probability: number }[] = [];

                        const nextPick = userPicks.find((up) => up.overallPick >= (currentPickIndex ?? 0) + 1);
                        const nextRound = nextPick ? nextPick.round : -1;
                        const optRound = metrics.optimalRound;
                        const targetRound = pick.round;

                        const roundsToInclude = new Set<number>();
                        if (nextRound !== -1) roundsToInclude.add(nextRound);
                        if (optRound !== -1) roundsToInclude.add(optRound);
                        if (targetRound !== -1) roundsToInclude.add(targetRound);

                        let sortedRounds = Array.from(roundsToInclude).sort((a, b) => a - b);

                        if (sortedRounds.length < 3) {
                          const futureRounds = userPicks
                            .filter((up) => up.overallPick >= (currentPickIndex ?? 0) + 1)
                            .map((up) => up.round);

                          for (const r of futureRounds) {
                            if (sortedRounds.length >= 3) break;
                            if (!roundsToInclude.has(r)) {
                              roundsToInclude.add(r);
                              sortedRounds.push(r);
                            }
                          }
                          sortedRounds = sortedRounds.sort((a, b) => a - b);
                        }

                        sortedRounds.forEach((r) => {
                          const probEntry = metrics.survivalProbabilities.find((sp) => sp.round === r);
                          let probability = 0;
                          if (probEntry) {
                            probability = probEntry.probability;
                          } else if (r < nextRound) {
                            probability = 1.0;
                          } else {
                            probability = 0.0;
                          }

                          const labels: string[] = [];
                          if (r === nextRound) labels.push("Next");
                          if (r === optRound) labels.push("Sugg");
                          if (r === targetRound) labels.push("Target");

                          const labelStr = labels.length > 0 ? `Rd ${r} (${labels.join("/")})` : `Rd ${r}`;

                          list.push({
                            round: r,
                            label: labelStr,
                            probability,
                          });
                        });

                        return list;
                      })();

                      return (
                        <div
                          key={player.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            background: "rgba(255,255,255,0.012)",
                            border: "1px dashed rgba(255,255,255,0.04)",
                            borderRadius: "6px",
                            padding: "8px 10px",
                            opacity: isPlayerDrafted ? 0.55 : 1,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8rem" }}>
                                {player.name}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                ADP {player.adp.toFixed(0)} • {player.positions.join("/")}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {/* Move Round Selector */}
                              {onMoveTargetPlayer && (
                                <select
                                  value={pick.round}
                                  onChange={(e) => {
                                    const targetRound = parseInt(e.target.value);
                                    onMoveTargetPlayer(player.id, pick.round, targetRound);
                                  }}
                                  style={{
                                    background: "rgba(0,0,0,0.35)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "var(--text-primary)",
                                    borderRadius: "4px",
                                    fontSize: "0.65rem",
                                    padding: "1px 3px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {userPicks.map((up) => (
                                    <option key={up.round} value={up.round}>Rd {up.round}</option>
                                  ))}
                                </select>
                              )}

                              {/* Unstar / Remove icon */}
                              {onToggleTargetPlayer && (
                                <button
                                  onClick={() => onToggleTargetPlayer(player.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    color: "var(--warning)",
                                    display: "flex",
                                    alignItems: "center"
                                  }}
                                  title="Remove target"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Timeline row */}
                          {!isPlayerDrafted && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", background: "rgba(0,0,0,0.15)", borderRadius: "4px", padding: "4px 8px", marginTop: "2px" }}>
                              <span style={{ color: "var(--text-muted)", marginRight: "4px" }}>Timeline:</span>
                              {timeline.map((step, idx) => {
                                const isTarget = step.round === pick.round;
                                const isOpt = step.round === metrics.optimalRound;

                                let textColor = "var(--text-secondary)";
                                if (step.probability >= 0.7) textColor = "var(--success)";
                                else if (step.probability >= 0.3) textColor = "var(--warning)";
                                else textColor = "var(--danger)";

                                return (
                                  <React.Fragment key={step.round}>
                                    {idx > 0 && <span style={{ color: "rgba(255,255,255,0.15)" }}>➔</span>}
                                    <span
                                      style={{
                                        fontWeight: isTarget ? 700 : 500,
                                        color: isTarget ? "var(--text-primary)" : "var(--text-muted)",
                                        borderBottom: isOpt ? "1px dashed var(--warning)" : "none",
                                        paddingBottom: isOpt ? "1px" : "0",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "2px"
                                      }}
                                      title={isOpt ? "Suggested Draft Round" : undefined}
                                    >
                                      {step.label}: <span style={{ color: textColor, fontWeight: 600 }}>{Math.round(step.probability * 100)}%</span>
                                      {isTarget && <span style={{ color: "var(--warning)", fontSize: "0.55rem" }}>★</span>}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          )}

                          {/* Draft button if player is active and user is on clock */}
                          {!isPlayerDrafted && isOnClock && (
                            <button
                              className="btn btn-primary"
                              style={{ width: "100%", padding: "3px", fontSize: "0.7rem", marginTop: "2px" }}
                              onClick={() => onDraftPlayer(player.id)}
                            >
                              {draftActionLabel ?? `Draft ${player.name}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px", fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No player targets assigned. Star players in the pool to add them.
                  </div>
                )}

                {/* Position Target Candidates recommendation */}
                {pick.positionTarget && pick.candidates && pick.candidates.length > 0 && (
                  <div style={{ borderTop: "1px dashed rgba(255,255,255,0.04)", paddingTop: "8px", marginTop: "4px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
                      Suggested {pick.positionTarget} Targets:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {pick.candidates.map(({ player, roundSurvivalProb }) => (
                        <div
                          key={player.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "4px",
                            padding: "3px 6px",
                            fontSize: "0.68rem"
                          }}
                        >
                          <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{player.name}</span>
                          <span style={{ fontSize: "0.6rem", color: roundSurvivalProb >= 0.7 ? "var(--success)" : roundSurvivalProb >= 0.3 ? "var(--warning)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                            {Math.round(roundSurvivalProb * 100)}%
                          </span>
                          {onAddTargetPlayerToRound && (
                            <button
                              onClick={() => onAddTargetPlayerToRound(player.id, pick.round)}
                              style={{
                                background: "rgba(255, 193, 7, 0.15)",
                                border: "none",
                                color: "var(--warning)",
                                borderRadius: "3px",
                                padding: "1px 4px",
                                fontSize: "0.6rem",
                                cursor: "pointer",
                                fontWeight: 600,
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255, 193, 7, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 193, 7, 0.15)";
                              }}
                              title={`Target ${player.name} for Round ${pick.round}`}
                            >
                              + Target
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
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
