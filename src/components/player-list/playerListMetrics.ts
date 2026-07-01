import { calculateCpuScore, calculateTargetMetrics, CpuProfile, DraftPick, getCpuArchetype, getCpuProfile, ScarcityInfo } from "../../engine";
import { Player } from "../../types/draft";

export interface ReturnTimelinePoint {
  label: string;
  probability: number;
  round: number;
}

interface DraftedPlayer {
  player: Player;
  teamIndex?: number;
}

interface BuildReturnTimelineOptions {
  currentPickIndex?: number;
  draftedPlayers: DraftedPlayer[];
  isDrafted: boolean;
  picks: DraftPick[];
  player: Player;
  roundTargets: Record<number, { position: string | null; playerIds: string[] }>;
  userTeamIndex: number;
}

export function getReturnLevel(p: number) {
  if (p >= 0.7) return "high";
  if (p >= 0.3) return "med";
  return "low";
}

export function formatPercent(p: number) {
  return `${Math.round(p * 100)}%`;
}

export function buildReturnTimeline({
  currentPickIndex,
  draftedPlayers,
  isDrafted,
  picks,
  player,
  roundTargets,
  userTeamIndex,
}: BuildReturnTimelineOptions): ReturnTimelinePoint[] {
  if (isDrafted) return [];

  const nextOverallPick = (currentPickIndex ?? 0) + 1;
  const userPicks = picks.filter((p) => p.teamIndex === userTeamIndex);
  const metrics = calculateTargetMetrics(
    player,
    nextOverallPick,
    userPicks,
    new Set(draftedPlayers.map((d) => d.player.id))
  );

  const nextPick = userPicks.find((up) => up.overallPick >= nextOverallPick);
  const nextRound = nextPick ? nextPick.round : -1;
  const optRound = metrics.optimalRound;

  let targetRound = -1;
  Object.keys(roundTargets).forEach((roundStr) => {
    const round = parseInt(roundStr);
    if (roundTargets[round]?.playerIds.includes(player.id)) {
      targetRound = round;
    }
  });

  const roundsToInclude = new Set<number>();
  if (nextRound !== -1) roundsToInclude.add(nextRound);
  if (optRound !== -1) roundsToInclude.add(optRound);
  if (targetRound !== -1) roundsToInclude.add(targetRound);

  let sortedRounds = Array.from(roundsToInclude).sort((a, b) => a - b);

  if (sortedRounds.length < 3) {
    const futureRounds = userPicks.filter((up) => up.overallPick >= nextOverallPick).map((up) => up.round);

    for (const round of futureRounds) {
      if (sortedRounds.length >= 3) break;
      if (!roundsToInclude.has(round)) {
        roundsToInclude.add(round);
        sortedRounds.push(round);
      }
    }

    sortedRounds = sortedRounds.sort((a, b) => a - b);
  }

  return sortedRounds.map((round) => {
    const probEntry = metrics.survivalProbabilities.find((sp) => sp.round === round);
    const probability = probEntry ? probEntry.probability : round < nextRound ? 1.0 : 0.0;

    const labels: string[] = [];
    if (round === nextRound) labels.push("Next");
    if (round === optRound) labels.push("Sugg");
    if (round === targetRound) labels.push("Target");

    return {
      label: labels.length > 0 ? `Rd ${round} (${labels.join("/")})` : `Rd ${round}`,
      probability,
      round,
    };
  });
}

interface BuildCpuScoreDetailsOptions {
  availablePlayers: Player[];
  cpuProfiles: CpuProfile[];
  cpuSavesStrategies: string[];
  currentPickIndex?: number;
  currentTeamIndex?: number;
  draftedPlayers: DraftedPlayer[];
  isDraftComplete?: boolean;
  isDraftStarted?: boolean;
  numRounds?: number;
  picks: DraftPick[];
  player: Player;
  scarcityMap: Record<string, ScarcityInfo>;
  userTeamIndex: number;
}

export function buildCpuScoreDetails({
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
}: BuildCpuScoreDetailsOptions) {
  const isDraftActive = !!(
    isDraftStarted &&
    !isDraftComplete &&
    currentPickIndex !== undefined &&
    currentTeamIndex !== undefined
  );

  const fallbackTeamIndex = currentTeamIndex ?? 0;
  const cpuProfile =
    currentTeamIndex !== undefined ? cpuProfiles[currentTeamIndex] || getCpuProfile(currentTeamIndex, userTeamIndex) : getCpuProfile(fallbackTeamIndex, userTeamIndex);
  const cpuLabel = cpuProfile.label || cpuProfile.archetype || getCpuArchetype(fallbackTeamIndex, userTeamIndex);

  if (!isDraftActive || currentPickIndex === undefined || currentTeamIndex === undefined) {
    return {
      cpuDetails: null,
      cpuLabel,
      isDraftActive,
    };
  }

  const pCurr = currentPickIndex + 1;
  const cpuRoster = draftedPlayers.filter((d) => d.teamIndex === currentTeamIndex).map((d) => d.player);
  const cpuArchetype = cpuProfile.archetype || getCpuArchetype(currentTeamIndex, userTeamIndex);
  const strategy = cpuProfile.savesStrategy || cpuSavesStrategies[currentTeamIndex] || "balanced";
  const allPlayers = [...availablePlayers, ...draftedPlayers.map((d) => d.player)];

  return {
    cpuDetails: calculateCpuScore(
      player,
      pCurr,
      cpuRoster,
      numRounds || 30,
      cpuArchetype,
      scarcityMap,
      currentPickIndex,
      picks,
      allPlayers,
      strategy,
      0.5,
      cpuProfile
    ),
    cpuLabel,
    isDraftActive,
  };
}
