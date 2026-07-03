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

interface DraftedPlayer {
  player: Player;
  overallPick: number;
  round: number;
  teamName: string;
  teamIndex: number;
}

interface PlayerPoolRowProps {
  availablePlayers: Player[];
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
  isOnClock: boolean;
  isPlayerTargeted: boolean;
  numRounds?: number;
  onDraftPlayer: (playerId: string) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  picks: DraftPick[];
  player: Player;
  rec?: Recommendation;
  roundTargets: Record<number, { position: string | null; playerIds: string[] }>;
  scarcityMap: Record<string, ScarcityInfo>;
  toggleExpand: (playerId: string) => void;
  userTeamIndex: number;
}

export function PlayerPoolRow({
  availablePlayers,
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
  isOnClock,
  isPlayerTargeted,
  numRounds,
  onDraftPlayer,
  onToggleTargetPlayer,
  picks,
  player,
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
        style={{ opacity: isDrafted ? 0.55 : 1, cursor: "pointer" }}
        onClick={() => toggleExpand(player.id)}
      >
        <ExpandIconCell isExpanded={isExpanded} />
        <PlayerNameCell isPlayerTargeted={isPlayerTargeted} onToggleTargetPlayer={onToggleTargetPlayer} player={player} />
        <AdpCell player={player} />
        <MarketValueCell adp={player.adp} />
        <AuctionValueCell value={player.value} />
        <ProjectionSummaryCell player={player} />
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
          rec={rec}
          scarcityMap={scarcityMap}
          userTeamIndex={userTeamIndex}
        />
      )}
    </React.Fragment>
  );
}
