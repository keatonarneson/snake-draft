import { CpuProfile, DraftPick, Recommendation, ScarcityInfo } from "../../engine";
import { Player } from "../../types/draft";
import { CpuScorePanel } from "./CpuScorePanel";
import { buildCpuScoreDetails } from "./playerListMetrics";
import { PlayerProjectionPanel } from "./PlayerProjectionPanel";
import { RecommendationScorePanel } from "./RecommendationScorePanel";

interface DraftedPlayer {
  player: Player;
  overallPick: number;
  round: number;
  teamName: string;
  teamIndex: number;
}

interface ExpandedPlayerRowProps {
  availablePlayers: Player[];
  cpuProfiles: CpuProfile[];
  cpuSavesStrategies: string[];
  currentPickIndex?: number;
  currentTeamIndex?: number;
  currentTeamName: string;
  draftedPlayers: DraftedPlayer[];
  isDraftComplete?: boolean;
  isDraftStarted?: boolean;
  numRounds?: number;
  picks: DraftPick[];
  player: Player;
  rec?: Recommendation;
  scarcityMap: Record<string, ScarcityInfo>;
  userTeamIndex: number;
}

export function ExpandedPlayerRow({
  availablePlayers,
  cpuProfiles,
  cpuSavesStrategies,
  currentPickIndex,
  currentTeamIndex,
  currentTeamName,
  draftedPlayers,
  isDraftComplete,
  isDraftStarted,
  numRounds,
  picks,
  player,
  rec,
  scarcityMap,
  userTeamIndex,
}: ExpandedPlayerRowProps) {
  const { cpuDetails, cpuLabel, isDraftActive } = buildCpuScoreDetails({
    availablePlayers,
    cpuProfiles,
    cpuSavesStrategies,
    currentPickIndex,
    currentTeamIndex,
    draftedPlayers,
    isDraftComplete,
    isDraftStarted,
    numRounds,
    picks,
    player,
    scarcityMap,
    userTeamIndex,
  });

  return (
    <tr style={{ background: "rgba(255, 255, 255, 0.015)" }}>
      <td colSpan={9} style={{ padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "24px", alignItems: "start" }}>
          <PlayerProjectionPanel player={player} />
          <RecommendationScorePanel draftedCount={draftedPlayers.length} player={player} rec={rec} />
          <CpuScorePanel
            cpuDetails={cpuDetails}
            cpuLabel={cpuLabel}
            currentTeamName={currentTeamName}
            isDraftActive={isDraftActive}
            isDraftComplete={isDraftComplete}
            isDraftStarted={isDraftStarted}
          />
        </div>
      </td>
    </tr>
  );
}
