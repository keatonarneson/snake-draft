"use client";

import React, { useState } from "react";
import { CpuProfile, DraftPick } from "../engine";
import { Player } from "../types/draft";
import {
  BoardGridModal,
  CpuProfilesModal,
  DraftLogModal,
  DraftPickSequence,
  DraftTrackerHeader,
  EditPickModal,
  useDraftLogState,
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
  cpuSavesStrategies?: string[];
  cpuProfiles?: CpuProfile[];
  onUndoLastPick?: () => void;
  onEditPick?: (pickIndex: number, playerId: string) => void;
}

export default function DraftBoard({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  players,
  cpuSavesStrategies = [],
  cpuProfiles = [],
  onUndoLastPick,
  onEditPick,
}: DraftBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);

  const playerMap = usePlayerMap(players);

  const {
    debugSearchQuery,
    setDebugSearchQuery,
    debugFilterType,
    setDebugFilterType,
    debugSortKey,
    expandedPickIndex,
    setExpandedPickIndex,
    filteredPicks,
    setDraftLogSort,
    getDraftLogSortLabel,
  } = useDraftLogState({ picks, teamNames, playerMap });

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
        onOpenBoard={() => setIsModalOpen(true)}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        onOpenDraftLog={() => setIsDebugModalOpen(true)}
      />

      <DraftPickSequence
        picks={picks}
        currentPickIndex={currentPickIndex}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        playerMap={playerMap}
        canEditPicks={Boolean(onEditPick)}
        onEditPick={openEditPick}
      />

      <BoardGridModal
        isOpen={isModalOpen}
        picks={picks}
        currentPickIndex={currentPickIndex}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        playerMap={playerMap}
        picksUntilUser={picksUntilUser}
        onClose={() => setIsModalOpen(false)}
      />
      <DraftLogModal
        isOpen={isDebugModalOpen}
        currentPickIndex={currentPickIndex}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        playerMap={playerMap}
        cpuSavesStrategies={cpuSavesStrategies}
        cpuProfiles={cpuProfiles}
        debugSearchQuery={debugSearchQuery}
        setDebugSearchQuery={setDebugSearchQuery}
        debugFilterType={debugFilterType}
        setDebugFilterType={setDebugFilterType}
        debugSortKey={debugSortKey}
        expandedPickIndex={expandedPickIndex}
        setExpandedPickIndex={setExpandedPickIndex}
        filteredPicks={filteredPicks}
        setDraftLogSort={setDraftLogSort}
        getDraftLogSortLabel={getDraftLogSortLabel}
        onClose={() => setIsDebugModalOpen(false)}
      />
      <CpuProfilesModal
        isOpen={isProfilesModalOpen}
        teamNames={teamNames}
        userTeamIndex={userTeamIndex}
        cpuProfiles={cpuProfiles}
        onClose={() => setIsProfilesModalOpen(false)}
      />

      <EditPickModal
        editingPick={editingPick}
        teamName={editingPick ? teamNames[editingPick.teamIndex] : ""}
        editPlayerId={editPlayerId}
        editPlayerOptions={editPlayerOptions}
        canSave={Boolean(editPlayerId && onEditPick)}
        onPlayerChange={setEditPlayerId}
        onSave={saveEditedPick}
        onClose={closeEditPick}
      />
    </div>
  );
}
