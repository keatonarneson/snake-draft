"use client";

import { useMemo, useState } from "react";
import { Player } from "../types/draft";
import { Recommendation, DraftPick, ScarcityInfo, CpuProfile } from "../engine";
import { PlayerListToolbar, PlayerPoolRow, PlayerTableHeader, usePlayerListTable } from "./player-list";

const PLAYER_ROW_HEIGHT = 42;
const PLAYER_TABLE_HEIGHT = 580;
const PLAYER_ROW_OVERSCAN = 12;

interface PlayerListProps {
  availablePlayers: Player[];
  draftedPlayers: { player: Player; overallPick: number; round: number; teamName: string; teamIndex: number }[];
  recommendations: Recommendation[];
  onDraftPlayer: (playerId: string) => void;
  draftActionLabel?: string;
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
  focusedPlayerId?: string | null;
  onFocusPlayer?: (playerId: string) => void;
}

export default function PlayerList({
  availablePlayers,
  draftedPlayers,
  recommendations,
  onDraftPlayer,
  draftActionLabel,
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
  focusedPlayerId,
  onFocusPlayer,
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
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const draftedPlayerMap = useMemo(() => {
    return new Map(draftedPlayers.map((draftedPlayer) => [draftedPlayer.player.id, draftedPlayer]));
  }, [draftedPlayers]);
  const targetedPlayerIds = useMemo(() => {
    return new Set(Object.values(roundTargets).flatMap((target) => target.playerIds));
  }, [roundTargets]);
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(tableScrollTop / PLAYER_ROW_HEIGHT) - PLAYER_ROW_OVERSCAN);
    const visibleCount = Math.ceil(PLAYER_TABLE_HEIGHT / PLAYER_ROW_HEIGHT) + PLAYER_ROW_OVERSCAN * 2;
    const end = Math.min(sortedPlayers.length, start + visibleCount);

    return { start, end };
  }, [sortedPlayers.length, tableScrollTop]);
  const visiblePlayers = sortedPlayers.slice(visibleRange.start, visibleRange.end);
  const topSpacerHeight = visibleRange.start * PLAYER_ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (sortedPlayers.length - visibleRange.end) * PLAYER_ROW_HEIGHT);

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
      <div
        className="premium-table-container"
        style={{ maxHeight: `${PLAYER_TABLE_HEIGHT}px`, overflowY: "auto" }}
        onScroll={(event) => setTableScrollTop(event.currentTarget.scrollTop)}
      >
        <table className="premium-table">
          <PlayerTableHeader handleSort={handleSort} sortField={sortField} sortOrder={sortOrder} />
          <tbody>
            {topSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td colSpan={9} style={{ height: `${topSpacerHeight}px`, padding: 0, border: 0 }} />
              </tr>
            )}
            {visiblePlayers.map((player) => (
              <PlayerPoolRow
                key={player.id}
                availablePlayers={availablePlayers}
                cpuProfiles={cpuProfiles}
                cpuSavesStrategies={cpuSavesStrategies}
                currentPickIndex={currentPickIndex}
                currentTeamIndex={currentTeamIndex}
                currentTeamName={currentTeamName}
                draftDetail={draftedPlayerMap.get(player.id)}
                draftedPlayers={draftedPlayers}
                isDraftComplete={isDraftComplete}
                isDraftStarted={isDraftStarted}
                isExpanded={expandedPlayerId === player.id}
                isFocused={focusedPlayerId === player.id}
                isOnClock={isOnClock}
                isPlayerTargeted={targetedPlayerIds.has(player.id)}
                draftActionLabel={draftActionLabel}
                numRounds={numRounds}
                onDraftPlayer={onDraftPlayer}
                onFocusPlayer={onFocusPlayer}
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
            {bottomSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td colSpan={9} style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
