"use client";

import React, { useMemo, useState } from "react";
import { calculateCategoryStats } from "../engine/categoryStats";
import { calculateDraftCapital } from "../engine/draftCapital";
import { buildRosterSlots, canPlayerUseRosterSlot, ROSTER_SLOTS, SlotAssignment } from "../engine/rosterSlots";
import type { LeagueTargets } from "../engine/config";
import { Player, PlayerStats } from "../types/draft";
import {
  CategoryProjections,
  DraftCapitalPanel,
  ProjectionEditorModal,
  RosterSlotList,
} from "./roster-tracker";

interface RosterTrackerProps {
  teamIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number; round?: number; overallPick?: number }[];
  onSelectTeam: (index: number) => void;
  numRounds: number;
  projectionOverrides?: Record<string, Partial<PlayerStats>>;
  onUpdateProjectionOverride?: (playerId: string, stats: Partial<PlayerStats>) => void;
  onResetProjectionOverride?: (playerId: string) => void;
  targets: LeagueTargets;
}

export default function RosterTracker({
  teamIndex,
  teamNames,
  userTeamIndex,
  draftedPlayers,
  onSelectTeam,
  numRounds,
  projectionOverrides = {},
  onUpdateProjectionOverride,
  onResetProjectionOverride,
  targets,
}: RosterTrackerProps) {
  const [slotAssignmentsByTeam, setSlotAssignmentsByTeam] = useState<Record<number, Record<string, SlotAssignment>>>({});
  const [editingProjectionPlayerId, setEditingProjectionPlayerId] = useState<string | null>(null);

  const isUser = teamIndex === userTeamIndex;

  const selectedDraftedPlayers = useMemo(() => {
    return draftedPlayers.filter((dp) => dp.teamIndex === teamIndex);
  }, [draftedPlayers, teamIndex]);

  const sourceDrafted = useMemo(() => {
    return selectedDraftedPlayers.map((dp) => dp.player);
  }, [selectedDraftedPlayers]);

  // For the user's team, apply any custom projection overrides on top of source stats.
  const myDrafted = useMemo(() => {
    if (!isUser) return sourceDrafted;

    return sourceDrafted.map((player) => ({
      ...player,
      stats: {
        ...player.stats,
        ...(projectionOverrides[player.id] || {}),
      },
    }));
  }, [sourceDrafted, isUser, projectionOverrides]);

  const sourcePlayerMap = useMemo(
    () => new Map(sourceDrafted.map((player) => [player.id, player])),
    [sourceDrafted]
  );

  const draftCapital = useMemo(() => calculateDraftCapital(selectedDraftedPlayers), [selectedDraftedPlayers]);

  const editingProjectionPlayer = editingProjectionPlayerId
    ? sourcePlayerMap.get(editingProjectionPlayerId) || null
    : null;

  const slotAssignments = useMemo(() => {
    const teamAssignments = slotAssignmentsByTeam[teamIndex] || {};
    const validPlayerIds = new Set(sourceDrafted.map((player) => player.id));

    return Object.fromEntries(
      Object.entries(teamAssignments).filter(([playerId]) => validPlayerIds.has(playerId))
    );
  }, [slotAssignmentsByTeam, sourceDrafted, teamIndex]);

  const roster = useMemo(() => {
    return buildRosterSlots(myDrafted, numRounds, slotAssignments);
  }, [myDrafted, numRounds, slotAssignments]);

  const stats = useMemo(() => calculateCategoryStats(myDrafted), [myDrafted]);

  const movePlayer = (player: Player, destination: SlotAssignment) => {
    if (!isUser) return;

    const sourceSlot = roster.active.find((slot) => slot.player?.id === player.id);
    const destinationSlot =
      destination === "bench" ? null : roster.active.find((slot) => slot.id === destination);
    const displacedPlayer = destinationSlot?.player;

    setSlotAssignmentsByTeam((current) => {
      const teamAssignments = { ...(current[teamIndex] || {}) };
      teamAssignments[player.id] = destination;

      if (displacedPlayer && displacedPlayer.id !== player.id) {
        const sourceSlotIndex = sourceSlot ? Number(sourceSlot.id.replace("slot-", "")) : -1;
        const canSwapIntoSource =
          sourceSlotIndex >= 0 && canPlayerUseRosterSlot(displacedPlayer, ROSTER_SLOTS[sourceSlotIndex]);

        if (canSwapIntoSource) {
          teamAssignments[displacedPlayer.id] = sourceSlot!.id;
        } else {
          delete teamAssignments[displacedPlayer.id];
        }
      }

      return { ...current, [teamIndex]: teamAssignments };
    });
  };

  return (
    <div className="card glow-panel" style={{ flexGrow: 1 }}>
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
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Team Rosters
        </h3>
        <select
          className="premium-input"
          value={teamIndex}
          onChange={(e) => onSelectTeam(parseInt(e.target.value))}
          aria-label="Select team roster to view"
          style={{ padding: "4px 8px", fontSize: "0.8rem", width: "160px" }}
        >
          {teamNames.map((name, idx) => (
            <option key={idx} value={idx}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <CategoryProjections stats={stats} targets={targets} />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <RosterSlotList
            roster={roster}
            isUser={isUser}
            rosterCount={myDrafted.length}
            numRounds={numRounds}
            projectionOverrides={projectionOverrides}
            onEditProjection={(player) => setEditingProjectionPlayerId(player.id)}
            onMovePlayer={movePlayer}
          />

          <DraftCapitalPanel draftCapital={draftCapital} />
        </div>
      </div>

      {editingProjectionPlayer && onUpdateProjectionOverride && onResetProjectionOverride && (
        <ProjectionEditorModal
          key={editingProjectionPlayer.id}
          player={editingProjectionPlayer}
          override={projectionOverrides[editingProjectionPlayer.id]}
          onSave={onUpdateProjectionOverride}
          onResetOverride={onResetProjectionOverride}
          onClose={() => setEditingProjectionPlayerId(null)}
        />
      )}
    </div>
  );
}
