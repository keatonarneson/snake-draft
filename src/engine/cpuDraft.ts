import { Player } from "../types/draft";
import { CpuArchetype, CpuProfile, getCpuCloserPlan } from "./cpuProfiles";
import { calculateCpuScore, CpuScoreDetails } from "./cpuScoring";
import { DraftPick } from "./draftOrder";
import { isDraftableCloser, isPremiumCloser } from "./playerRoles";
import { ScarcityInfo } from "./positionScarcity";

// Active roster shape assumed when deciding whether a CPU team is "full" at a
// player type. Bench is whatever rounds remain after the active slots.
const ACTIVE_BATTERS_LIMIT = 14;
const ACTIVE_PITCHERS_LIMIT = 9;

export interface SelectCpuPickParams {
  cpuProfile: CpuProfile;
  cpuArchetype: CpuArchetype;
  strategy: string;
  /** The CPU team's currently rostered players. */
  cpuRoster: Player[];
  availablePlayers: Player[];
  numRounds: number;
  scarcityMap: Record<string, ScarcityInfo>;
  currentPickIndex: number;
  currentOverallPick: number;
  currentRound: number;
  picks: DraftPick[];
  allPlayers: Player[];
}

export interface CpuPickSelection {
  playerId: string;
  score: number;
  details: CpuScoreDetails;
}

/**
 * Pick a player for a CPU team using its profile and the current draft state.
 *
 * Pure aside from Math.random (used for the weighted shortlist selection and
 * the per-candidate scoring noise), matching the rest of the engine. Returns
 * null when there is no viable player to select.
 */
export function selectCpuPick({
  cpuProfile,
  cpuArchetype,
  strategy,
  cpuRoster,
  availablePlayers,
  numRounds,
  scarcityMap,
  currentPickIndex,
  currentOverallPick,
  currentRound,
  picks,
  allPlayers,
}: SelectCpuPickParams): CpuPickSelection | null {
  // 1. Check constraints on CPU roster (ensure valid distribution of hitters/pitchers)
  const numBatters = cpuRoster.filter((p) => !p.isPitcher).length;
  const numPitchers = cpuRoster.filter((p) => p.isPitcher).length;

  const benchLimit = numRounds - (ACTIVE_BATTERS_LIMIT + ACTIVE_PITCHERS_LIMIT);

  let allowedType: "all" | "batter" | "pitcher" = "all";
  if (numBatters >= ACTIVE_BATTERS_LIMIT + benchLimit) {
    allowedType = "pitcher";
  } else if (numPitchers >= ACTIVE_PITCHERS_LIMIT + benchLimit) {
    allowedType = "batter";
  }

  // 2. Filter available players
  let candidates = availablePlayers;
  if (allowedType === "batter") {
    candidates = candidates.filter((p) => !p.isPitcher);
  } else if (allowedType === "pitcher") {
    candidates = candidates.filter((p) => p.isPitcher);
  }

  const closerPlan = getCpuCloserPlan(cpuProfile, strategy);
  const draftedClosers = cpuRoster.filter(isDraftableCloser);
  const draftedPremiumClosers = cpuRoster.filter(isPremiumCloser);
  const hasSolvedSavesEarly = draftedPremiumClosers.length >= 2;
  const shouldBlockClosers = draftedClosers.length >= closerPlan.max || hasSolvedSavesEarly;

  if (shouldBlockClosers) {
    candidates = candidates.filter((p) => !isDraftableCloser(p));
  }

  if (candidates.length === 0) {
    candidates = availablePlayers; // fallback
  }

  // 3. Score a realistic market shortlist by CPU score.
  // Full-pool scoring is too expensive with large CSV projection sets, especially in paced mocks.
  const pCurr = currentOverallPick;
  const maxMarketAhead = currentRound <= 5 ? 36 : currentRound <= 15 ? 90 : 180;
  const shortlistSize = currentRound <= 5 ? 60 : currentRound <= 15 ? 120 : 220;
  const marketCandidates = candidates
    .filter((player) => (
      player.adp <= pCurr + maxMarketAhead ||
      player.maxPick <= pCurr + Math.floor(maxMarketAhead * 0.65) ||
      player.value >= 3
    ))
    .sort((a, b) => {
      const aUrgency = pCurr >= a.maxPick ? -120 : 0;
      const bUrgency = pCurr >= b.maxPick ? -120 : 0;
      const aDistance = Math.abs(a.adp - pCurr);
      const bDistance = Math.abs(b.adp - pCurr);
      const aScore = aUrgency + aDistance - a.value * 1.6;
      const bScore = bUrgency + bDistance - b.value * 1.6;
      return aScore - bScore;
    })
    .slice(0, shortlistSize);

  const scoredCandidates = marketCandidates.length > 0 ? marketCandidates : candidates.slice(0, shortlistSize);

  const candidateScores = scoredCandidates.map((player) => {
    const randSeed = Math.random();
    const details = calculateCpuScore(
      player,
      pCurr,
      cpuRoster,
      numRounds,
      cpuArchetype,
      scarcityMap,
      currentPickIndex,
      picks,
      allPlayers,
      strategy,
      randSeed,
      cpuProfile
    );
    return { player, score: details.score, details };
  });

  candidateScores.sort((a, b) => b.score - a.score);

  // Dynamic pool size based on the current draft round
  let poolSize = 15;
  if (currentRound <= 5) {
    poolSize = 3;
  } else if (currentRound <= 15) {
    poolSize = 8;
  }

  // Keep top candidates for weighted selection pool
  const pool = candidateScores.slice(0, Math.min(poolSize, candidateScores.length));

  if (pool.length === 0) return null;

  // Convert scores to positive weights (shift relative to min score in the pool) and apply cubic exponential scaling
  const minScore = pool[pool.length - 1].score;
  const poolWithWeights = pool.map((c) => ({
    ...c,
    weight: Math.pow(Math.max(0.1, c.score - minScore + 1.0), 3.0),
  }));

  const totalWeight = poolWithWeights.reduce((sum, c) => sum + c.weight, 0);

  let randVal = Math.random() * totalWeight;
  let chosenCandidate = pool[0];
  for (const candidate of poolWithWeights) {
    randVal -= candidate.weight;
    if (randVal <= 0) {
      chosenCandidate = candidate;
      break;
    }
  }

  const chosenPlayer = chosenCandidate.player;
  if (!chosenPlayer) return null;

  return {
    playerId: chosenPlayer.id,
    score: chosenCandidate.score,
    details: chosenCandidate.details,
  };
}
