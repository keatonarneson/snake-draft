"use client";

import React, { useState } from "react";
import { CpuProfile, DraftPick } from "../engine";
import { Player } from "../types/draft";
import {
  CpuProfilesModal,
  DraftPickSequence,
  DraftTrackerHeader,
  EditPickModal,
  useEditPickState,
  usePicksUntilUser,
  usePlayerMap,
} from "./draft-board";

interface DraftBoardProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  players: Player[];
  cpuProfiles?: CpuProfile[];
  isLiveDraftMode?: boolean;
  onUndoLastPick?: () => void;
  onEditPick?: (pickIndex: number, playerId: string) => void;
  onFocusPlayer?: (playerId: string) => void;
}

export default function DraftBoard({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  players,
  cpuProfiles = [],
  isLiveDraftMode = false,
  onUndoLastPick,
  onEditPick,
  onFocusPlayer,
}: DraftBoardProps) {
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);

  const playerMap = usePlayerMap(players);

  const picksUntilUser = usePicksUntilUser({ picks, currentPickIndex, userTeamIndex });

  const {
    editingPick,
    editPlayerId,
    setEditPlayerId,
    editPlayerOptions,
    openEditPick,
    closeEditPick,
    saveEditedPick,
  } = useEditPickState({ picks, players, onEditPick });

  return (
    <div className="card glow-panel" style={{ flexGrow: 1 }}>
      <DraftTrackerHeader
        currentPickIndex={currentPickIndex}
        picksUntilUser={picksUntilUser}
        onUndoLastPick={onUndoLastPick}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        isLiveDraftMode={isLiveDraftMode}
      />

      <DraftPickSequence
        picks={picks}
        currentPickIndex={currentPickIndex}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        isLiveDraftMode={isLiveDraftMode}
        playerMap={playerMap}
        canEditPicks={Boolean(onEditPick)}
        onEditPick={openEditPick}
        onFocusPlayer={onFocusPlayer}
      />

      <CpuProfilesModal
        isOpen={isProfilesModalOpen}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        cpuProfiles={cpuProfiles}
        onClose={() => setIsProfilesModalOpen(false)}
      />

      <EditPickModal
        key={editingPick ? editingPick.overallPick : "closed"}
        editingPick={editingPick}
        teamName={editingPick ? teamNames[editingPick.teamIndex] : ""}
        editPlayerId={editPlayerId}
        editPlayerOptions={editPlayerOptions}
        canSave={Boolean(onEditPick)}
        onPlayerChange={setEditPlayerId}
        onSave={saveEditedPick}
        onClose={closeEditPick}
      />
    </div>
  );
}
