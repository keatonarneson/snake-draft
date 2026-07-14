"use client";

import React, { useMemo, useState } from "react";
import type { LeagueTargets } from "../../engine/config";
import { calculateCategoryStats } from "../../engine/categoryStats";
import { calculateDraftCapital } from "../../engine/draftCapital";
import {
  buildRosterSlots,
  canPlayerUseRosterSlot,
  ROSTER_SLOTS,
  SLOT_DISPLAY_LABELS,
  type SlotAssignment,
  type TeamSlotAssignments,
} from "../../engine/rosterSlots";
import { calculateProjectedStandings } from "../../engine/standings";
import type { Player, PlayerStats } from "../../types/draft";
import CategoryProjections from "./CategoryProjections";
import DraftCapitalPanel from "./DraftCapitalPanel";
import LeagueRosterBoard from "./LeagueRosterBoard";
import ProjectionEditorModal from "./ProjectionEditorModal";
import styles from "./RosterWorkspace.module.css";

interface DraftedPlayer {
  player: Player;
  teamIndex: number;
  round?: number;
  overallPick?: number;
}

interface RosterWorkspaceProps {
  teamNames: string[];
  selectedTeamIndex: number;
  userTeamIndex: number;
  draftedPlayers: DraftedPlayer[];
  numRounds: number;
  targets: LeagueTargets;
  projectionOverrides: Record<string, Partial<PlayerStats>>;
  slotAssignmentsByTeam: TeamSlotAssignments;
  onSelectTeam: (teamIndex: number) => void;
  onMovePlayer: (teamIndex: number, playerId: string, destination: SlotAssignment) => void;
  onResetAssignments: (teamIndex: number) => void;
  onUpdateProjectionOverride: (playerId: string, stats: Partial<PlayerStats>) => void;
  onResetProjectionOverride: (playerId: string) => void;
}

function formatProjection(player: Player) {
  const stat = player.stats;
  if (player.isPitcher) {
    return `${stat.W ?? 0} W  ·  ${stat.SV ?? 0} SV  ·  ${stat.SO ?? 0} K  ·  ${(stat.ERA ?? 0).toFixed(2)} ERA  ·  ${(stat.WHIP ?? 0).toFixed(2)} WHIP`;
  }
  return `${stat.R ?? 0} R  ·  ${stat.HR ?? 0} HR  ·  ${stat.RBI ?? 0} RBI  ·  ${stat.SB ?? 0} SB  ·  ${(stat.AVG ?? 0).toFixed(3)} AVG`;
}

export default function RosterWorkspace({
  teamNames,
  selectedTeamIndex,
  userTeamIndex,
  draftedPlayers,
  numRounds,
  targets,
  projectionOverrides,
  slotAssignmentsByTeam,
  onSelectTeam,
  onMovePlayer,
  onResetAssignments,
  onUpdateProjectionOverride,
  onResetProjectionOverride,
}: RosterWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"team" | "league">("team");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dropSlotId, setDropSlotId] = useState<string | null>(null);
  const isUser = selectedTeamIndex === userTeamIndex;

  const selectedPicks = useMemo(
    () => draftedPlayers.filter((drafted) => drafted.teamIndex === selectedTeamIndex),
    [draftedPlayers, selectedTeamIndex]
  );
  const pickByPlayer = useMemo(
    () => new Map(selectedPicks.map((drafted) => [drafted.player.id, drafted])),
    [selectedPicks]
  );
  const sourcePlayerMap = useMemo(
    () => new Map(selectedPicks.map((drafted) => [drafted.player.id, drafted.player])),
    [selectedPicks]
  );
  const players = useMemo(
    () => selectedPicks.map(({ player }) => {
      if (!isUser || !projectionOverrides[player.id]) return player;
      return { ...player, stats: { ...player.stats, ...projectionOverrides[player.id] } };
    }),
    [selectedPicks, isUser, projectionOverrides]
  );
  const assignments = useMemo(
    () => slotAssignmentsByTeam[selectedTeamIndex] || {},
    [slotAssignmentsByTeam, selectedTeamIndex]
  );
  const roster = useMemo(
    () => buildRosterSlots(players, numRounds, assignments),
    [players, numRounds, assignments]
  );
  const rows = useMemo(() => [...roster.active, ...roster.bench], [roster]);
  const starters = useMemo(
    () => roster.active.flatMap((slot) => (slot.player ? [slot.player] : [])),
    [roster]
  );
  const stats = useMemo(() => calculateCategoryStats(starters), [starters]);
  const draftCapital = useMemo(() => calculateDraftCapital(selectedPicks), [selectedPicks]);
  const standings = useMemo(
    () => calculateProjectedStandings({
      teamNames,
      userTeamIndex,
      draftedPlayers,
      numRounds,
      projectionOverrides,
      slotAssignmentsByTeam,
    }),
    [teamNames, userTeamIndex, draftedPlayers, numRounds, projectionOverrides, slotAssignmentsByTeam]
  );
  const standing = standings.find((row) => row.teamIndex === selectedTeamIndex);
  const editingPlayer = editingPlayerId ? sourcePlayerMap.get(editingPlayerId) || null : null;
  const emptyActiveSlots = roster.active.filter((slot) => !slot.player).length;

  const canDropPlayer = (slotId: string) => {
    if (!draggedPlayerId) return false;
    if (slotId.startsWith("bench-")) return true;
    const player = players.find((candidate) => candidate.id === draggedPlayerId);
    const slotIndex = Number(slotId.replace("slot-", ""));
    return Boolean(player && ROSTER_SLOTS[slotIndex] && canPlayerUseRosterSlot(player, ROSTER_SLOTS[slotIndex]));
  };

  return (
    <div className={`${styles.workspace} ${viewMode === "team" ? "card glow-panel" : ""}`}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={`premium-input ${styles.teamSelect}`}
            value={selectedTeamIndex}
            onChange={(event) => onSelectTeam(Number(event.target.value))}
            aria-label="Select team roster"
          >
            {teamNames.map((name, index) => <option key={index} value={index}>{name}</option>)}
          </select>
          {viewMode === "team" && isUser && (
            <button type="button" className={styles.secondaryButton} onClick={() => onResetAssignments(selectedTeamIndex)}>
              Auto-optimize lineup
            </button>
          )}
        </div>
        <div className={styles.viewToggle} aria-label="Roster view mode">
          <button type="button" data-active={viewMode === "team"} onClick={() => setViewMode("team")}>Team View</button>
          <button type="button" data-active={viewMode === "league"} onClick={() => setViewMode("league")}>League Grid</button>
        </div>
      </div>

      {viewMode === "league" ? (
        <LeagueRosterBoard
          teamNames={teamNames}
          userTeamIndex={userTeamIndex}
          draftedPlayers={draftedPlayers}
          numRounds={numRounds}
          slotAssignmentsByTeam={slotAssignmentsByTeam}
          onSelectTeam={(teamIndex) => {
            onSelectTeam(teamIndex);
            setViewMode("team");
          }}
        />
      ) : (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span>Overall</span><strong>#{standing?.rank ?? "—"}</strong><small>league rank</small></div>
            <div className={styles.summaryCard}><span>Roto Points</span><strong>{standing?.points.toFixed(1) ?? "0.0"}</strong></div>
            <div className={styles.summaryCard}><span>Hitting / Pitching</span><strong>{standing?.hitterPoints.toFixed(1) ?? "0.0"} / {standing?.pitcherPoints.toFixed(1) ?? "0.0"}</strong></div>
            <div className={styles.summaryCard}><span>Roster Value</span><strong>${stats.value.toFixed(0)}</strong></div>
            <div className={styles.summaryCard}><span>Roster Fit</span><strong>{starters.length}/{roster.active.length}</strong><small>{emptyActiveSlots} open</small></div>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.rosterTable}>
              <thead><tr><th>Slot</th><th>Player</th><th>Projection</th><th>Drafted</th><th>Value</th><th>Position</th></tr></thead>
              <tbody>
                {rows.map((slot) => {
                  const player = slot.player;
                  const drafted = player ? pickByPlayer.get(player.id) : undefined;
                  const isBench = slot.id.startsWith("bench-");
                  const destination = isBench ? "bench" : slot.id;
                  const isDropTarget = isUser && canDropPlayer(slot.id);
                  return (
                    <tr
                      key={slot.id}
                      className={styles.rosterRow}
                      data-bench={isBench}
                      data-drop={dropSlotId === slot.id && isDropTarget}
                      onDragOver={(event) => {
                        if (!isDropTarget) return;
                        event.preventDefault();
                        setDropSlotId(slot.id);
                      }}
                      onDragLeave={() => setDropSlotId((current) => current === slot.id ? null : current)}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedPlayerId && isDropTarget) onMovePlayer(selectedTeamIndex, draggedPlayerId, destination);
                        setDraggedPlayerId(null);
                        setDropSlotId(null);
                      }}
                    >
                      <td className={styles.slotLabel}>{isBench ? "BN" : SLOT_DISPLAY_LABELS[Number(slot.id.replace("slot-", ""))]}</td>
                      <td>
                        {player ? (
                          <div
                            className={styles.playerMain}
                            draggable={isUser}
                            data-draggable={isUser}
                            title={isUser ? `Drag ${player.name} to another eligible slot` : undefined}
                            onDragStart={() => setDraggedPlayerId(player.id)}
                            onDragEnd={() => { setDraggedPlayerId(null); setDropSlotId(null); }}
                          >
                            <div>
                              <div className={styles.playerName}>{player.name}</div>
                              <div className={styles.playerMeta}>
                                <span>{player.team}</span>
                                <span className={styles.badge}>{player.positions.join("/")}</span>
                                {isUser && projectionOverrides[player.id] && <span className={styles.badge}>Custom</span>}
                              </div>
                            </div>
                          </div>
                        ) : <span className={styles.empty}>Empty slot</span>}
                      </td>
                      <td className={styles.projection}>{player ? formatProjection(player) : "—"}</td>
                      <td className={styles.numeric}>{drafted?.round ? `R${drafted.round} · #${drafted.overallPick}` : "—"}</td>
                      <td className={styles.value}>{player ? `$${player.value.toFixed(1)}` : "—"}</td>
                      <td>
                        {player && isUser ? (
                          <div className={styles.rowActions}>
                            <select
                              className={styles.slotSelect}
                              value={destination}
                              onChange={(event) => onMovePlayer(selectedTeamIndex, player.id, event.target.value as SlotAssignment)}
                              aria-label={`Move ${player.name}`}
                            >
                              {ROSTER_SLOTS.map((candidate, index) => canPlayerUseRosterSlot(player, candidate) ? (
                                <option key={index} value={`slot-${index}`}>{SLOT_DISPLAY_LABELS[index]}</option>
                              ) : null)}
                              <option value="bench">BN</option>
                            </select>
                            <button type="button" className={styles.editButton} onClick={() => setEditingPlayerId(player.id)} title={`Edit ${player.name} projections`} aria-label={`Edit ${player.name} projections`}>
                              ✎
                            </button>
                          </div>
                        ) : <span className={styles.numeric}>{player ? player.positions.join("/") : "—"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.detailGrid}>
            <CategoryProjections stats={stats} targets={targets} />
            <div className={styles.capitalShell}><DraftCapitalPanel draftCapital={draftCapital} /></div>
          </div>
        </>
      )}

      {editingPlayer && (
        <ProjectionEditorModal
          key={editingPlayer.id}
          player={editingPlayer}
          override={projectionOverrides[editingPlayer.id]}
          onSave={onUpdateProjectionOverride}
          onResetOverride={onResetProjectionOverride}
          onClose={() => setEditingPlayerId(null)}
        />
      )}
    </div>
  );
}
