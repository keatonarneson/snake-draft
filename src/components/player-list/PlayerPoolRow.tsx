import React from "react";
import { CpuProfile, DraftPick, Recommendation, ScarcityInfo } from "../../engine";
import { Player } from "../../types/draft";
import { DraftActionCell } from "./DraftActionCell";
import { ExpandedPlayerRow } from "./ExpandedPlayerRow";
import { buildReturnTimeline, getReturnLevel } from "./playerListMetrics";
import { PlayerNameCell } from "./PlayerNameCell";
import { AdpCell, AuctionValueCell, ExpandIconCell, MarketValueCell, ScoreCell } from "./PlayerValueCells";
import { ProjectionSummaryCell } from "./ProjectionSummaryCell";
import { ReturnProbabilityCell } from "./ReturnProbabilityCell";
import { ProjectionView } from "./projectionColumns";

interface DraftedPlayer {
  player: Player;
  overallPick: number;
  round: number;
  teamName: string;
  teamIndex: number;
}

interface PlayerPoolRowProps {
  availablePlayers: Player[];
  compareDisabled?: boolean;
  cpuProfiles: CpuProfile[];
  cpuSavesStrategies: string[];
  currentPickIndex?: number;
  currentTeamIndex?: number;
  currentTeamName: string;
  draftDetail?: DraftedPlayer;
  draftedPlayers: DraftedPlayer[];
  draftActionLabel?: string;
  isDraftComplete?: boolean;
  isDraftStarted?: boolean;
  isExpanded: boolean;
  isCompared?: boolean;
  isFocused?: boolean;
  isOnClock: boolean;
  isPlayerTargeted: boolean;
  numRounds?: number;
  onDraftPlayer: (playerId: string) => void;
  onFocusPlayer?: (playerId: string) => void;
  onToggleCompare?: (playerId: string) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  picks: DraftPick[];
  player: Player;
  projectionView: ProjectionView;
  rec?: Recommendation;
  roundTargets: Record<number, { position: string | null; playerIds: string[] }>;
  scarcityMap: Record<string, ScarcityInfo>;
  toggleExpand: (playerId: string) => void;
  userTeamIndex: number;
}

export function PlayerPoolRow({
  availablePlayers,
  compareDisabled = false,
  cpuProfiles,
  cpuSavesStrategies,
  currentPickIndex,
  currentTeamIndex,
  currentTeamName,
  draftDetail,
  draftedPlayers,
  draftActionLabel,
  isDraftComplete,
  isDraftStarted,
  isExpanded,
  isCompared = false,
  isFocused = false,
  isOnClock,
  isPlayerTargeted,
  numRounds,
  onDraftPlayer,
  onFocusPlayer,
  onToggleCompare,
  onToggleTargetPlayer,
  picks,
  player,
  projectionView,
  rec,
  roundTargets,
  scarcityMap,
  toggleExpand,
  userTeamIndex,
}: PlayerPoolRowProps) {
  const isDrafted = Boolean(draftDetail);
  const pReturn = rec ? rec.pReturn : 0;
  const recScore = rec ? rec.score : player.value;
  const returnLevel = getReturnLevel(pReturn);
  const timeline = isExpanded
    ? buildReturnTimeline({
        currentPickIndex,
        draftedPlayers,
        isDrafted,
        picks,
        player,
        roundTargets,
        userTeamIndex,
      })
    : [];
  return (
    <React.Fragment>
      <tr
        data-focused={isFocused}
        style={{
          opacity: isDrafted ? 0.55 : 1,
          cursor: "pointer",
          outline: isFocused ? "1px solid rgba(6, 182, 212, 0.55)" : undefined,
          outlineOffset: isFocused ? "-1px" : undefined,
        }}
        onClick={() => {
          onFocusPlayer?.(player.id);
          toggleExpand(player.id);
        }}
      >
        <ExpandIconCell isExpanded={isExpanded} />
        <PlayerNameCell
          compareDisabled={compareDisabled}
          isCompared={isCompared}
          isPlayerTargeted={isPlayerTargeted}
          onToggleCompare={onToggleCompare}
          onToggleTargetPlayer={onToggleTargetPlayer}
          player={player}
        />
        <AdpCell player={player} />
        <MarketValueCell adp={player.adp} />
        <AuctionValueCell value={player.value} />
        <ProjectionSummaryCell player={player} projectionView={projectionView} />
        <ReturnProbabilityCell isDrafted={isDrafted} pReturn={pReturn} returnLevel={returnLevel} timeline={timeline} />
        <ScoreCell isDrafted={isDrafted} score={recScore} />
        <DraftActionCell
          draftActionLabel={draftActionLabel}
          draftDetail={draftDetail}
          isDrafted={isDrafted}
          isOnClock={isOnClock}
          onDraftPlayer={onDraftPlayer}
          playerId={player.id}
        />
      </tr>

      {isExpanded && (
        <ExpandedPlayerRow
          availablePlayers={availablePlayers}
          cpuProfiles={cpuProfiles}
          cpuSavesStrategies={cpuSavesStrategies}
          currentPickIndex={currentPickIndex}
          currentTeamIndex={currentTeamIndex}
          currentTeamName={currentTeamName}
          draftedPlayers={draftedPlayers}
          isDraftComplete={isDraftComplete}
          isDraftStarted={isDraftStarted}
          numRounds={numRounds}
          picks={picks}
          player={player}
          tableColumnCount={projectionView === "mixed" ? 9 : 13}
          rec={rec}
          scarcityMap={scarcityMap}
          userTeamIndex={userTeamIndex}
        />
      )}
    </React.Fragment>
  );
}
