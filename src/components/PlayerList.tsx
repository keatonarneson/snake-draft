"use client";

import { Player } from "../types/draft";
import { Recommendation, DraftPick, ScarcityInfo, CpuProfile } from "../engine";
import { PlayerListToolbar, PlayerPoolRow, PlayerTableHeader, usePlayerListTable } from "./player-list";

interface PlayerListProps {
  availablePlayers: Player[];
  draftedPlayers: { player: Player; overallPick: number; round: number; teamName: string; teamIndex: number }[];
  recommendations: Recommendation[];
  onDraftPlayer: (playerId: string) => void;
  isOnClock: boolean; // Is user on the clock?
  currentTeamName: string; // Name of the team currently picking
  currentPickIndex?: number;
  currentTeamIndex?: number;
  numRounds?: number;
  isDraftStarted?: boolean;
  isDraftComplete?: boolean;
  roundTargets?: Record<number, { position: string | null; playerIds: string[] }>;
  onToggleTargetPlayer?: (playerId: string) => void;
  picks?: DraftPick[];
  userTeamIndex?: number;
  scarcityMap?: Record<string, ScarcityInfo>;
  cpuSavesStrategies?: string[];
  cpuProfiles?: CpuProfile[];
}

export default function PlayerList({
  availablePlayers,
  draftedPlayers,
  recommendations,
  onDraftPlayer,
  isOnClock,
  currentTeamName,
  currentPickIndex,
  currentTeamIndex,
  numRounds,
  isDraftStarted,
  isDraftComplete,
  roundTargets = {},
  onToggleTargetPlayer,
  picks = [],
  userTeamIndex = 0,
  scarcityMap = {},
  cpuSavesStrategies = [],
  cpuProfiles = [],
}: PlayerListProps) {
  const {
    expandedPlayerId,
    handleSort,
    positionFilterOptions,
    recMap,
    searchTerm,
    selectedPosition,
    setSearchTerm,
    setSelectedPosition,
    setShowDrafted,
    showDrafted,
    sortField,
    sortedPlayers,
    sortOrder,
    toggleExpand,
  } = usePlayerListTable({
    availablePlayers,
    draftedPlayers,
    recommendations,
  });

  return (
    <div className="card glow-panel" style={{ flexGrow: 1 }}>
      <PlayerListToolbar
        positionFilterOptions={positionFilterOptions}
        searchTerm={searchTerm}
        selectedPosition={selectedPosition}
        setSearchTerm={setSearchTerm}
        setSelectedPosition={setSelectedPosition}
        setShowDrafted={setShowDrafted}
        showDrafted={showDrafted}
      />

      {/* Player Pool Table */}
      <div className="premium-table-container" style={{ maxHeight: "580px", overflowY: "auto" }}>
        <table className="premium-table">
          <PlayerTableHeader handleSort={handleSort} sortField={sortField} sortOrder={sortOrder} />
          <tbody>
            {sortedPlayers.map((player) => (
              <PlayerPoolRow
                key={player.id}
                availablePlayers={availablePlayers}
                cpuProfiles={cpuProfiles}
                cpuSavesStrategies={cpuSavesStrategies}
                currentPickIndex={currentPickIndex}
                currentTeamIndex={currentTeamIndex}
                currentTeamName={currentTeamName}
                draftedPlayers={draftedPlayers}
                isDraftComplete={isDraftComplete}
                isDraftStarted={isDraftStarted}
                isExpanded={expandedPlayerId === player.id}
                isOnClock={isOnClock}
                numRounds={numRounds}
                onDraftPlayer={onDraftPlayer}
                onToggleTargetPlayer={onToggleTargetPlayer}
                picks={picks}
                player={player}
                rec={recMap.get(player.id)}
                roundTargets={roundTargets}
                scarcityMap={scarcityMap}
                toggleExpand={toggleExpand}
                userTeamIndex={userTeamIndex}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
