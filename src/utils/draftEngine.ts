import { Player } from "./sampleData";

/**
 * High-precision numerical approximation of the error function (erf).
 * Accurate to ~1.5e-7.
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));

  return sign * y;
}

/**
 * Standard Normal Cumulative Distribution Function (CDF).
 */
export function normalCDF(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

/**
 * Truncated Normal Cumulative Distribution Function (CDF).
 */
export function truncatedNormalCDF(
  p: number,
  adp: number,
  minPick: number,
  maxPick: number
): number {
  if (p <= minPick) return 0;
  if (p >= maxPick) return 1;
  if (minPick >= maxPick) return p >= minPick ? 1 : 0;

  const stdDev = Math.max(1.0, (maxPick - minPick) / 4.0);

  const phiP = normalCDF((p - adp) / stdDev);
  const phiMin = normalCDF((minPick - adp) / stdDev);
  const phiMax = normalCDF((maxPick - adp) / stdDev);

  const denom = phiMax - phiMin;
  if (denom <= 0) {
    return (p - minPick) / (maxPick - minPick);
  }

  const result = (phiP - phiMin) / denom;
  return Math.min(1.0, Math.max(0.0, result));
}

/**
 * Calculate the probability that a player will still be available at the user's next pick.
 */
export function calculateReturnProbability(
  pCurr: number,
  pNext: number,
  player: Player
): number {
  if (pNext <= pCurr) return 1.0;
  if (pNext >= player.maxPick) return 0.0;
  if (pCurr <= player.minPick) {
    return 1.0 - truncatedNormalCDF(pNext, player.adp, player.minPick, player.maxPick);
  }

  const fCurr = truncatedNormalCDF(pCurr, player.adp, player.minPick, player.maxPick);
  const fNext = truncatedNormalCDF(pNext, player.adp, player.minPick, player.maxPick);

  if (fCurr >= 1.0) return 0.0;

  const pReturn = (1.0 - fNext) / (1.0 - fCurr);
  return Math.min(1.0, Math.max(0.0, pReturn));
}

export interface DraftPick {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
  playerDraftedId: string | null;
  cpuScore?: number;
  cpuScoreDetails?: any;
}

export function generateDraftSequence(
  numTeams: number,
  numRounds: number
): DraftPick[] {
  const sequence: DraftPick[] = [];
  let overallPick = 1;

  for (let round = 1; round <= numRounds; round++) {
    const isEvenRound = round % 2 === 0;
    
    for (let pickInRound = 1; pickInRound <= numTeams; pickInRound++) {
      const teamIndex = isEvenRound ? numTeams - pickInRound : pickInRound - 1;

      sequence.push({
        overallPick,
        round,
        pickInRound,
        teamIndex,
        playerDraftedId: null,
      });

      overallPick++;
    }
  }

  return sequence;
}

/**
 * Fit players into active roster slots.
 */
export function fitRoster(
  teamPlayers: Player[],
  numRounds: number
): { active: Player[]; bench: Player[] } {
  const activeSlots = [
    // Specific hitter slots (Priority 1)
    { label: "C1", isPitcher: false, positions: ["C"], priority: 1 },
    { label: "C2", isPitcher: false, positions: ["C"], priority: 1 },
    { label: "1B", isPitcher: false, positions: ["1B"], priority: 1 },
    { label: "2B", isPitcher: false, positions: ["2B"], priority: 1 },
    { label: "3B", isPitcher: false, positions: ["3B"], priority: 1 },
    { label: "SS", isPitcher: false, positions: ["SS"], priority: 1 },
    { label: "OF1", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF2", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF3", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF4", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF5", isPitcher: false, positions: ["OF"], priority: 1 },

    // Semi-flexible hitter slots (Priority 2)
    { label: "CI", isPitcher: false, positions: ["1B", "3B"], priority: 2 },
    { label: "MI", isPitcher: false, positions: ["2B", "SS"], priority: 2 },

    // Fully flexible hitter slot (Priority 3)
    { label: "UT", isPitcher: false, positions: ["1B", "2B", "3B", "SS", "OF", "UT"], priority: 3 },

    // Pitchers slots (Priority 1)
    { label: "P1", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P2", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P3", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P4", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P5", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P6", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P7", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P8", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P9", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  ];

  const sortedPlayers = [...teamPlayers].sort((a, b) => b.value - a.value);
  const active: Player[] = [];
  const bench: Player[] = [];

  const filledSlots = new Set<number>();
  const canPlayerUseSlot = (player: Player, slot: typeof activeSlots[number]) => {
    if (player.isPitcher !== slot.isPitcher) return false;
    if (player.positions.includes("C") && !slot.positions.includes("C")) return false;
    return player.positions.some(pos => slot.positions.includes(pos));
  };

  for (const player of sortedPlayers) {
    let placed = false;

    // Pass 1: Try priority 1 slots
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 1 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (placed) continue;

    // Pass 2: Try priority 2 slots (CI, MI)
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 2 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (placed) continue;

    // Pass 3: Try priority 3 slots (UT)
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 3 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      bench.push(player);
    }
  }

  return { active, bench };
}

export function checkPositionalFit(
  teamPlayers: Player[],
  newPlayer: Player,
  numRounds: number
): { isBench: boolean; activePushedValue: number } {
  const simulatedTeam = [...teamPlayers, newPlayer];
  const { bench } = fitRoster(simulatedTeam, numRounds);
  
  const isNewPlayerOnBench = bench.some(p => p.id === newPlayer.id);
  return {
    isBench: isNewPlayerOnBench,
    activePushedValue: 0
  };
}

const TARGETS = {
  R: 1125,
  HR: 315,
  RBI: 1103,
  SB: 190,
  AVG: 0.263,
  W: 93,
  SV: 88,
  SO: 1275,
  ERA: 3.65,
  WHIP: 1.20,
};

export interface CategoryNeeds {
  HR: number;
  SB: number;
  RBI: number;
  R: number;
  AVG: number;
  W: number;
  SV: number;
  SO: number;
  ERA: number;
  WHIP: number;
}

export function calculateCategoryNeeds(
  teamPlayers: Player[],
  numRounds: number,
  customTargets?: typeof TARGETS
): CategoryNeeds {
  const targets = customTargets || TARGETS;
  let R = 0, HR = 0, RBI = 0, SB = 0, totalAB = 0, sumAVG = 0;
  let W = 0, SV = 0, SO = 0, totalIP = 0, sumERA = 0, sumWHIP = 0;
  let battersCount = 0;
  let pitchersCount = 0;

  teamPlayers.forEach((player) => {
    if (!player.isPitcher) {
      R += player.stats.R || 0;
      HR += player.stats.HR || 0;
      RBI += player.stats.RBI || 0;
      SB += player.stats.SB || 0;
      if (player.stats.AB && player.stats.AB > 0) {
        totalAB += player.stats.AB;
        sumAVG += (player.stats.AVG || 0) * player.stats.AB;
      }
      battersCount++;
    } else {
      W += player.stats.W || 0;
      SV += player.stats.SV || 0;
      SO += player.stats.SO || 0;
      if (player.stats.IP && player.stats.IP > 0) {
        totalIP += player.stats.IP;
        sumERA += (player.stats.ERA || 0) * player.stats.IP;
        sumWHIP += (player.stats.WHIP || 0) * player.stats.IP;
      }
      pitchersCount++;
    }
  });

  const currentAVG = totalAB > 0 ? sumAVG / totalAB : 0.260;
  const currentERA = totalIP > 0 ? sumERA / totalIP : 3.80;
  const currentWHIP = totalIP > 0 ? sumWHIP / totalIP : 1.20;

  const batterFillRatio = Math.min(1.0, battersCount / 14);
  const pitcherFillRatio = Math.min(1.0, pitchersCount / 9);

  const getNeedFactor = (current: number, target: number, fillRatio: number) => {
    if (fillRatio === 0) return 1.0;
    const expectedPace = target * fillRatio;
    const ratio = current / expectedPace;
    return Math.max(-1.5, Math.min(1.8, 1.0 - ratio));
  };

  const getRateNeedFactor = (current: number, target: number, fillRatio: number, lowerIsBetter: boolean) => {
    if (fillRatio === 0) return 1.0;
    if (lowerIsBetter) {
      const ratio = current / target;
      return Math.max(-1.5, Math.min(1.8, ratio - 1.0));
    } else {
      const ratio = current / target;
      return Math.max(-1.5, Math.min(1.8, 1.0 - ratio));
    }
  };

  return {
    R: getNeedFactor(R, targets.R, batterFillRatio),
    HR: getNeedFactor(HR, targets.HR, batterFillRatio),
    RBI: getNeedFactor(RBI, targets.RBI, batterFillRatio),
    SB: getNeedFactor(SB, targets.SB, batterFillRatio),
    AVG: getRateNeedFactor(currentAVG, targets.AVG, batterFillRatio, false) * 2,
    W: getNeedFactor(W, targets.W, pitcherFillRatio),
    SV: getNeedFactor(SV, targets.SV, pitcherFillRatio),
    SO: getNeedFactor(SO, targets.SO, pitcherFillRatio),
    ERA: getRateNeedFactor(currentERA, targets.ERA, pitcherFillRatio, true) * 2,
    WHIP: getRateNeedFactor(currentWHIP, targets.WHIP, pitcherFillRatio, true) * 2,
  };
}

export function calculateStatsAdjustment(
  player: Player,
  needs: CategoryNeeds
): number {
  let adjustment = 0;
  
  if (!player.isPitcher) {
    const dev_R = (player.stats.R || 70) - 70;
    const dev_HR = (player.stats.HR || 18) - 18;
    const dev_RBI = (player.stats.RBI || 65) - 65;
    const dev_SB = (player.stats.SB || 10) - 10;
    const dev_AVG = ((player.stats.AVG || 0.260) - 0.260) * 500;

    adjustment += dev_R * needs.R * 0.05;
    adjustment += dev_HR * needs.HR * 0.15;
    adjustment += dev_RBI * needs.RBI * 0.05;
    adjustment += dev_SB * needs.SB * 0.20;
    adjustment += dev_AVG * needs.AVG * 0.25;
  } else {
    const dev_W = (player.stats.W || 9) - 9;
    const dev_SV = (player.stats.SV || 8) - 8;
    const dev_SO = (player.stats.SO || 130) - 130;
    const dev_ERA = (3.80 - (player.stats.ERA || 3.80)) * 100;
    const dev_WHIP = (1.20 - (player.stats.WHIP || 1.20)) * 500;

    adjustment += dev_W * needs.W * 0.15;
    adjustment += dev_SV * needs.SV * 0.30;
    adjustment += dev_SO * needs.SO * 0.02;
    adjustment += dev_ERA * needs.ERA * 0.03;
    adjustment += dev_WHIP * needs.WHIP * 0.03;
  }

  return Math.max(-8.0, Math.min(8.0, adjustment));
}

export interface ScarcityPlayerInfo {
  name: string;
  value: number;
  pReturn: number;
}

export interface MarketPressurePlayerInfo {
  name: string;
  adp: number;
  pReturn: number;
}

export interface ScarcityInfo {
  position: string;
  bestValueNow: number;
  expectedBestValueNext: number;
  valueDropOff: number;
  dropOff: number;
  remainingCount: number;
  bestPlayerNow?: { name: string; value: number };
  expectedPlayersNext?: ScarcityPlayerInfo[];
  marketPressureScore: number;
  marketPressureLevel: "low" | "medium" | "high";
  marketPlayersAtRisk: number;
  marketWatchlist?: MarketPressurePlayerInfo[];
  replacementValue: number;
  scarcityPressure: number;
  positionRankPremium: number;
  expectedBestRankNext: number;
}

export const POSITION_SLOTS: Record<string, number> = {
  C: 2.0,
  "1B": 1.5,
  "2B": 1.5,
  "3B": 1.5,
  SS: 1.5,
  OF: 5.75,
  SP: 6.5,
  RP: 2.5,
};

/*
 * Helper: Define roster slot configurations to compute total slot counts per position.
 * This mirrors the `activeSlots` definition used in `fitRoster`.
 */
const ACTIVE_SLOTS = [
  // Hitter slots (priority 1)
  { label: "C1", isPitcher: false, positions: ["C"] },
  { label: "C2", isPitcher: false, positions: ["C"] },
  { label: "1B", isPitcher: false, positions: ["1B"] },
  { label: "2B", isPitcher: false, positions: ["2B"] },
  { label: "3B", isPitcher: false, positions: ["3B"] },
  { label: "SS", isPitcher: false, positions: ["SS"] },
  { label: "OF1", isPitcher: false, positions: ["OF"] },
  { label: "OF2", isPitcher: false, positions: ["OF"] },
  { label: "OF3", isPitcher: false, positions: ["OF"] },
  { label: "OF4", isPitcher: false, positions: ["OF"] },
  { label: "OF5", isPitcher: false, positions: ["OF"] },
  // Semi‑flex slots (priority 2)
  { label: "CI", isPitcher: false, positions: ["1B", "3B"] },
  { label: "MI", isPitcher: false, positions: ["2B", "SS"] },
  // Fully flexible hitter slot (priority 3)
  { label: "UT", isPitcher: false, positions: ["C", "1B", "2B", "3B", "SS", "OF", "UT"] },
  // Pitcher slots (priority 1)
  { label: "P1", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P2", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P3", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P4", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P5", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P6", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P7", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P8", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P9", isPitcher: true, positions: ["SP", "RP"] },
];

export function calculatePositionScarcity(
  allPlayers: Player[],
  availablePlayers: Player[],
  pCurr: number,
  pNext: number,
  positions: string[],
  rankScarcityCoeff: number = 0.12,
  numTeams: number = 12
): Record<string, ScarcityInfo> {

  const scarcity: Record<string, ScarcityInfo> = {};

  const matchesScarcityPosition = (player: Player, pos: string) => {
    if (!player.positions.includes(pos)) return false;
    return pos !== "RP" || isDraftableCloser(player);
  };

  positions.forEach((pos) => {
    const posPlayers = availablePlayers
      .filter((p) => matchesScarcityPosition(p, pos))
      .sort((a, b) => b.value - a.value);

    // Calculate replacement value dynamically based on all league players of this position
    const allPosPlayers = allPlayers
      .filter((p) => matchesScarcityPosition(p, pos))
      .sort((a, b) => b.value - a.value);

    const slots = POSITION_SLOTS[pos] || 1;
    const replacementIndex = numTeams * slots;
    let replacementValue = 0.0;
    if (allPosPlayers.length > 0) {
      const idx = Math.min(allPosPlayers.length - 1, replacementIndex);
      replacementValue = allPosPlayers[idx].value;
    }

    if (posPlayers.length === 0) {
      scarcity[pos] = {
        position: pos,
        bestValueNow: -10,
        expectedBestValueNext: -10,
        valueDropOff: 0,
        dropOff: 0,
        remainingCount: 0,
        marketPressureScore: 0,
        marketPressureLevel: "low",
        marketPlayersAtRisk: 0,
        marketWatchlist: [],
        replacementValue,
        scarcityPressure: 0.5,
        positionRankPremium: 0,
        expectedBestRankNext: 0,
      };
      return;
    }

    const bestValueNow = posPlayers[0].value;
    const bestPlayerNow = { name: posPlayers[0].name, value: posPlayers[0].value };

    const expectedPlayersNext: ScarcityPlayerInfo[] = [];
    for (let idx = 0; idx < Math.min(4, posPlayers.length); idx++) {
      const player = posPlayers[idx];
      const pReturn = calculateReturnProbability(pCurr, pNext, player);
      expectedPlayersNext.push({
        name: player.name,
        value: player.value,
        pReturn,
      });
    }
    
    // Probabilistic Expected Value and Rank of the Best Player available at pNext
    let expectedBestValueNext = 0;
    let expectedBestRankNext = 0;
    let probAccum = 1.0; // P(all better players are gone)

    for (let idx = 0; idx < posPlayers.length; idx++) {
      const player = posPlayers[idx];
      const pReturn = calculateReturnProbability(pCurr, pNext, player);
      
      expectedBestValueNext += player.value * pReturn * probAccum;
      expectedBestRankNext += idx * pReturn * probAccum;
      
      probAccum *= (1.0 - pReturn);
      
      // Optimization: if the probability that we have to look further down is tiny, stop
      if (probAccum < 0.0001) {
        break;
      }
    }

    // Fallback: if there's still a probability that all players are gone,
    // we assume we have to settle for the worst remaining player's value and rank
    if (probAccum > 0.0) {
      const fallbackValue = posPlayers[posPlayers.length - 1].value;
      expectedBestValueNext += fallbackValue * probAccum;
      
      const fallbackRank = posPlayers.length;
      expectedBestRankNext += fallbackRank * probAccum;
    }

    const valueDropOff = Math.max(0, bestValueNow - expectedBestValueNext);
    const rankDropOff = expectedBestRankNext;

    // Remaining demand
    const draftedCount = allPosPlayers.length - posPlayers.length;
    const remainingDemand = Math.max(0, (numTeams * slots) - draftedCount);

    // Viable supply remaining
    const viableSupply = posPlayers.filter((p) => p.value >= replacementValue).length;

    // Scarcity pressure clamped between 0.5 and 2.0
    const scarcityPressure = Math.min(2.0, Math.max(0.5, remainingDemand / Math.max(1, viableSupply)));

    // Position rank premium capped at $2.00
    const rankPremiumCap = 2.00;
    const positionRankPremium = Math.min(rankPremiumCap, rankDropOff * rankScarcityCoeff * scarcityPressure);

    // Combined dropOff for the best player at this position (qualityWeight = 1.0)
    const dropOff = valueDropOff + positionRankPremium;
    const marketCandidates = posPlayers
      .filter((p) => p.value >= replacementValue)
      .sort((a, b) => a.adp - b.adp)
      .slice(0, 8);
    const marketPlayersAtRisk = marketCandidates.reduce((sum, player) => {
      return sum + (1.0 - calculateReturnProbability(pCurr, pNext, player));
    }, 0);
    const marketWatchlist = marketCandidates.slice(0, 4).map((player) => ({
      name: player.name,
      adp: player.adp,
      pReturn: calculateReturnProbability(pCurr, pNext, player),
    }));
    const marketPressureScore = Math.min(3.0, marketPlayersAtRisk);
    const topMarketReturn = marketWatchlist[0]?.pReturn ?? 1.0;
    const marketPressureLevel =
      marketPlayersAtRisk >= 2.25 || topMarketReturn < 0.25
        ? "high"
        : marketPlayersAtRisk >= 1.0 || topMarketReturn < 0.55
          ? "medium"
          : "low";
    scarcity[pos] = {
      position: pos,
      bestValueNow,
      expectedBestValueNext,
      valueDropOff,
      dropOff,
      remainingCount: posPlayers.length,
      bestPlayerNow,
      expectedPlayersNext,
      marketPressureScore,
      marketPressureLevel,
      marketPlayersAtRisk,
      marketWatchlist,
      replacementValue,
      scarcityPressure,
      positionRankPremium,
      expectedBestRankNext,
    };
  });

  return scarcity;
}

export interface ScarcityDetails {
  valuePreservation: number;
  scarcityRank: number;
  qualityWeight: number;
  scarcityPressure: number;
  position: string;
}

export interface Recommendation {
  player: Player;
  pReturn: number;
  scarcityDropOff: number;
  scarcityDetails?: ScarcityDetails;
  isBench: boolean;
  statsAdjustment: number;
  upsideBonus: number;
  reachPenalty: number;
  score: number;
  phase: "early" | "middle" | "late";
  weights: {
    needs: number;
    scarcity: number;
    reach: number;
    upside: number;
    benchDiscount: number;
    trustProjections?: number;
    draftUrgency?: number;
  };
}

export function getRecommendations(
  availablePlayers: Player[],
  pCurr: number,
  pNext: number,
  scarcityMap: Record<string, ScarcityInfo>,
  teamPlayers: Player[] = [],
  numRounds: number = 30,
  currentRound: number = 1,
  weightOverrides?: {
    needsMultiplier?: number;
    scarcityMultiplier?: number;
    reachMultiplier?: number;
    upsideMultiplier?: number;
    benchPenaltyMultiplier?: number;
    // New simplified inputs
    trustProjections?: number;
    draftUrgency?: number;
    savesStrategy?: "wait" | "balanced" | "aggressive";
  },
  customTargets?: typeof TARGETS
): Recommendation[] {
  // 1. Trust Projections
  const w_projections = weightOverrides?.trustProjections !== undefined ? weightOverrides.trustProjections : 1.0;

  // 2. Draft Urgency
  const w_urgency = weightOverrides?.draftUrgency !== undefined ? weightOverrides.draftUrgency : 1.0;

  // Determine draft phase and associated weights based on round
  let phase: "early" | "middle" | "late" = "middle";
  let w_needs = 1.0;
  let w_scarcity = 1.0;
  let w_reach = 0.1;
  let w_upside = 0.2;
  let d_bench = 0.50; // full bench discount

  if (currentRound <= 5) {
    phase = "early";
    w_needs = 0.0;       // Pure BPA - focus on foundational players
    w_scarcity = 0.3;    // Small scarcity buffer in early rounds
    w_reach = 1.5;       // Strict reach penalty to prevent reaching
    w_upside = 0.0;      // No upside bonus early
    d_bench = 0.40;      // Stronger bench discount to ensure players "fit the board" (fill active slots)
  } else if (currentRound >= 15) {
    phase = "late";
    w_needs = 1.5;       // Heavily target category needs and gaps
    w_scarcity = 0.4;    // Small scarcity buffer in late rounds
    w_reach = 0.0;       // No reach penalty late
    w_upside = 1.8;      // Prioritize high-upside sleepers
    d_bench = 0.90;      // Negligible bench penalty
  } else {
    phase = "middle";
    w_needs = 1.0;       // Balance category needs to avoid getting boxed out
    w_scarcity = 1.2;    // Emphasize position scarcity to avoid getting boxed out
    w_reach = 0.4;       // Mild reach penalty
    w_upside = 0.3;      // Mild upside bonus
    d_bench = 0.50;      // Standard bench discount
  }

  // Apply weight overrides from sandbox
  if (weightOverrides) {
    if (weightOverrides.needsMultiplier !== undefined) {
      w_needs *= weightOverrides.needsMultiplier;
    }
    if (weightOverrides.scarcityMultiplier !== undefined) {
      w_scarcity *= weightOverrides.scarcityMultiplier;
    }
    if (weightOverrides.reachMultiplier !== undefined) {
      w_reach *= weightOverrides.reachMultiplier;
    }
    if (weightOverrides.upsideMultiplier !== undefined) {
      w_upside *= weightOverrides.upsideMultiplier;
    }
    if (weightOverrides.benchPenaltyMultiplier !== undefined) {
      // Scale the penalty: (1.0 - d_bench) represents the penalty.
      const penalty = (1.0 - d_bench) * weightOverrides.benchPenaltyMultiplier;
      d_bench = Math.max(0.0, Math.min(1.0, 1.0 - penalty));
    }
  }

  // Apply savesStrategy needs scaling
  let w_saves = 1.0;
  if (weightOverrides?.savesStrategy === "wait") {
    w_saves = 0.2;
  } else if (weightOverrides?.savesStrategy === "aggressive") {
    w_saves = 2.5;
  }

  // Calculate the active team needs
  const needs = calculateCategoryNeeds(teamPlayers, numRounds, customTargets);
  const adjustedNeeds = {
    ...needs,
    SV: needs.SV * w_saves
  };

  return availablePlayers.map((player) => {
    const pReturn = calculateReturnProbability(pCurr, pNext, player);
    const rosterCatchers = teamPlayers.filter((teamPlayer) => teamPlayer.positions.includes("C")).length;
    const isExcessCatcher = player.positions.includes("C") && rosterCatchers >= 2;
    
    // Calculate player-specific scarcity drop-off using qualityWeight and value preservation
    let scarcityDropOff = 0;
    let bestScarcityDetails: ScarcityDetails | undefined = undefined;

    player.positions.forEach((pos) => {
      if (isExcessCatcher && pos === "C") return;

      const info = scarcityMap[pos];
      if (info) {
        // playerQualityWeight = clamp((v_player - replacementValue) / max(0.01, v_best - replacementValue), 0, 1)
        const denominator = Math.max(0.01, info.bestValueNow - info.replacementValue);
        const qualityWeight = Math.min(1.0, Math.max(0.0, (player.value - info.replacementValue) / denominator));
        
        // valuePreservationBonus = max(0, v_player - expectedBestValueNext)
        const valuePreservation = Math.max(0, player.value - info.expectedBestValueNext);
        
        // scarcityRankBonus = positionRankPremium * playerQualityWeight
        const scarcityRank = info.positionRankPremium * qualityWeight;
        
        const playerScarcityBonus = valuePreservation + scarcityRank;

        if (playerScarcityBonus > scarcityDropOff) {
          scarcityDropOff = playerScarcityBonus;
          bestScarcityDetails = {
            valuePreservation,
            scarcityRank,
            qualityWeight,
            scarcityPressure: info.scarcityPressure,
            position: pos
          };
        }
      }
    });

    if (!bestScarcityDetails && player.positions.length > 0) {
      bestScarcityDetails = {
        valuePreservation: 0,
        scarcityRank: 0,
        qualityWeight: 0,
        scarcityPressure: 0.5,
        position: player.positions[0]
      };
    }

    // Check positional fit
    const { isBench } = checkPositionalFit(teamPlayers, player, numRounds);

    // Calculate category z-score needs adjustment
    const rawStatsAdjustment = teamPlayers.length > 0 ? calculateStatsAdjustment(player, adjustedNeeds) : 0;
    const statsAdjustment = rawStatsAdjustment * w_needs;

    // Calculate reach penalty
    // Probabilistic reach penalty using logistic decay for smoother scaling
    let reachPenalty = 0;
    if (w_reach > 0 && player.adp > pCurr + 12) {
      const reachPicks = player.adp - (pCurr + 12);
      // Logistic parameters – these could be exposed via UI later
      const maxPenalty = -15.0; // same absolute cap as before
      const k = 0.3; // slope of logistic curve
      const x0 = 5; // midpoint where penalty is half of max
      const logistic = maxPenalty / (1 + Math.exp(-k * (reachPicks - x0)));
      // Ensure the penalty does not exceed the absolute cap
      reachPenalty = Math.max(maxPenalty, logistic);
    }

    // Calculate upside bonus
    // Upside = ADP - Min Pick. Larger gap = higher variance/ceiling.
    let upsideBonus = 0;
    if (w_upside > 0) {
      const upsideGap = Math.max(0, player.adp - player.minPick);
      upsideBonus = (upsideGap / 8.0) * w_upside;
      upsideBonus = Math.min(6.0, upsideBonus); // cap bonus
    }

    // Combine base elements
    const baseValue = player.value * w_projections;
    
    // Scarcity premium is scaled by both position scarcity and draft urgency
    const scarcityPremium = scarcityDropOff * w_scarcity * w_urgency;

    // General draft urgency timing bonus: if a player is close to being drafted (pReturn is low) and has positive value,
    // give them a slight boost when draftUrgency is high.
    const urgencyBonus = (1.0 - pReturn) * Math.max(0.0, player.value) * 0.35 * w_urgency;

    const baseScore = baseValue + statsAdjustment + scarcityPremium + upsideBonus + reachPenalty + urgencyBonus;

    // Apply bench discount
    let finalScore = baseScore;
    if (isBench) {
      finalScore = baseScore > 0 ? baseScore * d_bench : baseScore * (2.0 - d_bench);
    }
    if (isExcessCatcher) {
      finalScore = baseScore > 0 ? baseScore * 0.05 - 25.0 : baseScore - 25.0;
    }

    return {
      player,
      pReturn,
      scarcityDropOff,
      scarcityDetails: bestScarcityDetails,
      isBench,
      statsAdjustment: Math.round(statsAdjustment * 100) / 100,
      upsideBonus: Math.round(upsideBonus * 100) / 100,
      reachPenalty: Math.round(reachPenalty * 100) / 100,
      score: Math.round(finalScore * 100) / 100,
      phase,
      weights: {
        needs: w_needs,
        scarcity: w_scarcity,
        reach: w_reach,
        upside: w_upside,
        benchDiscount: d_bench,
        trustProjections: w_projections,
        draftUrgency: w_urgency,
      }
    };
  });
}

export interface CpuScoreDetails {
  score: number;
  baseValue: number;
  adpDollars: number;
  consensusDollars: number;
  rosterNeedBonus: number;
  categoryNeedBonus: number;
  positionRunBonus: number;
  scarcityBonus: number;
  roleSecurityBonus: number;
  upsideBonus: number;
  randomNoise: number;
  reachPenalty: number;
  rosterPenalty: number;
  urgencyBonus: number;
  savesStrategyBonus: number;
  isBench: boolean;
}

export type CpuArchetype = "balanced" | "market" | "projection" | "need" | "upside";

export interface CpuProfile {
  id: string;
  label: string;
  archetype: CpuArchetype;
  savesStrategy: "wait" | "balanced" | "aggressive";
  marketTrust: number;
  projectionTrust: number;
  rosterNeed: number;
  categoryNeed: number;
  scarcity: number;
  runReaction: number;
  upside: number;
  reachTolerance: number;
  pitcherPreference: number;
  hitterPreference: number;
  closerAggression: number;
  randomness: number;
}

const CPU_PROFILE_TEMPLATES: CpuProfile[] = [
  {
    id: "balanced",
    label: "Balanced",
    archetype: "balanced",
    savesStrategy: "balanced",
    marketTrust: 1.0,
    projectionTrust: 1.0,
    rosterNeed: 1.0,
    categoryNeed: 1.0,
    scarcity: 1.0,
    runReaction: 1.0,
    upside: 1.0,
    reachTolerance: 1.0,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 1.0,
    randomness: 1.0,
  },
  {
    id: "market_anchor",
    label: "Market Anchor",
    archetype: "market",
    savesStrategy: "balanced",
    marketTrust: 1.35,
    projectionTrust: 0.65,
    rosterNeed: 0.85,
    categoryNeed: 0.8,
    scarcity: 0.95,
    runReaction: 0.75,
    upside: 0.65,
    reachTolerance: 0.65,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.95,
    randomness: 0.55,
  },
  {
    id: "projection_value",
    label: "Projection Value",
    archetype: "projection",
    savesStrategy: "wait",
    marketTrust: 0.75,
    projectionTrust: 1.35,
    rosterNeed: 0.9,
    categoryNeed: 0.95,
    scarcity: 0.8,
    runReaction: 0.65,
    upside: 0.9,
    reachTolerance: 1.15,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.55,
    randomness: 0.8,
  },
  {
    id: "roster_builder",
    label: "Roster Builder",
    archetype: "need",
    savesStrategy: "balanced",
    marketTrust: 0.95,
    projectionTrust: 0.95,
    rosterNeed: 1.35,
    categoryNeed: 1.3,
    scarcity: 1.1,
    runReaction: 1.0,
    upside: 0.75,
    reachTolerance: 0.95,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 1.0,
    randomness: 0.85,
  },
  {
    id: "upside_chaser",
    label: "Upside Chaser",
    archetype: "upside",
    savesStrategy: "wait",
    marketTrust: 0.85,
    projectionTrust: 0.95,
    rosterNeed: 0.75,
    categoryNeed: 0.8,
    scarcity: 0.9,
    runReaction: 0.9,
    upside: 1.65,
    reachTolerance: 1.45,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.65,
    randomness: 1.3,
  },
  {
    id: "pitching_foundation",
    label: "Pitching Foundation",
    archetype: "balanced",
    savesStrategy: "balanced",
    marketTrust: 1.0,
    projectionTrust: 1.05,
    rosterNeed: 1.0,
    categoryNeed: 1.1,
    scarcity: 1.05,
    runReaction: 1.1,
    upside: 0.9,
    reachTolerance: 0.95,
    pitcherPreference: 1.18,
    hitterPreference: 0.96,
    closerAggression: 1.05,
    randomness: 0.9,
  },
  {
    id: "bat_first",
    label: "Bat First",
    archetype: "balanced",
    savesStrategy: "wait",
    marketTrust: 0.95,
    projectionTrust: 1.05,
    rosterNeed: 1.0,
    categoryNeed: 1.05,
    scarcity: 0.95,
    runReaction: 0.85,
    upside: 1.0,
    reachTolerance: 1.05,
    pitcherPreference: 0.88,
    hitterPreference: 1.16,
    closerAggression: 0.55,
    randomness: 1.0,
  },
  {
    id: "closer_chaser",
    label: "Closer Chaser",
    archetype: "need",
    savesStrategy: "aggressive",
    marketTrust: 1.0,
    projectionTrust: 0.95,
    rosterNeed: 1.05,
    categoryNeed: 1.2,
    scarcity: 1.15,
    runReaction: 1.35,
    upside: 0.75,
    reachTolerance: 1.1,
    pitcherPreference: 1.04,
    hitterPreference: 0.98,
    closerAggression: 1.7,
    randomness: 0.9,
  },
];

export function getCpuArchetype(teamIndex: number, userTeamIndex: number): CpuArchetype {
  if (teamIndex === userTeamIndex) return "balanced";
  const relativeIndex = teamIndex > userTeamIndex ? teamIndex - 1 : teamIndex;
  const archetypes: CpuArchetype[] = [
    "balanced",
    "market",
    "projection",
    "need",
    "balanced",
    "market",
    "need",
    "upside",
    "balanced",
    "market",
    "projection",
    "balanced",
  ];
  return archetypes[relativeIndex % archetypes.length];
}

export function getCpuProfile(teamIndex: number, userTeamIndex: number): CpuProfile {
  if (teamIndex === userTeamIndex) {
    return CPU_PROFILE_TEMPLATES[0];
  }
  const relativeIndex = teamIndex > userTeamIndex ? teamIndex - 1 : teamIndex;
  return CPU_PROFILE_TEMPLATES[relativeIndex % CPU_PROFILE_TEMPLATES.length];
}

export function getCpuProfileTemplates(): CpuProfile[] {
  return CPU_PROFILE_TEMPLATES;
}

export function isDraftableCloser(player: Player): boolean {
  return player.positions.includes("RP") && (player.stats.SV || 0) >= 12;
}

export function isPremiumCloser(player: Player): boolean {
  return isDraftableCloser(player) && (player.adp <= 100 || player.value >= 5 || (player.stats.SV || 0) >= 28);
}

export function getCpuCloserPlan(profile?: CpuProfile, fallbackStrategy: string = "balanced") {
  const strategy = profile?.savesStrategy || fallbackStrategy;

  if (strategy === "aggressive") {
    return { target: 2, max: 3 };
  }

  if (strategy === "wait") {
    return { target: 1, max: 2 };
  }

  return { target: 2, max: 2 };
}

export function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export function calculateAdpValue(adp: number): number {
  const baseValue = 45.0 - 1.8 * Math.pow(Math.max(0, adp - 1), 0.6);
  return Math.round(Math.max(1.0, baseValue) * 10) / 10;
}

export function calculateCpuScore(
  player: Player,
  pCurr: number,
  cpuRoster: Player[],
  numRounds: number,
  cpuArchetype: CpuArchetype,
  scarcityMap: Record<string, ScarcityInfo>,
  currentPickIndex: number,
  picks: DraftPick[],
  allPlayers: Player[],
  savesStrategy: string,
  fixedRand?: number,
  cpuProfile?: CpuProfile
): CpuScoreDetails {
  const currentRound = Math.floor((currentPickIndex) / (picks.length / numRounds)) + 1;
  const profile = cpuProfile ?? {
    ...CPU_PROFILE_TEMPLATES[0],
    archetype: cpuArchetype,
    savesStrategy: savesStrategy as CpuProfile["savesStrategy"],
  };
  const effectiveSavesStrategy = profile.savesStrategy || savesStrategy;
  const closerPlan = getCpuCloserPlan(profile, effectiveSavesStrategy);
  const candidateIsCloser = isDraftableCloser(player);
  const rosterClosers = cpuRoster.filter(isDraftableCloser);
  const rosterPremiumClosers = cpuRoster.filter(isPremiumCloser);
  const countClosers = rosterClosers.length;
  const countPremiumClosers = rosterPremiumClosers.length;
  const hasSolvedSavesEarly = countPremiumClosers >= 2;

  // 1. Base Player Value
  const adpDollars = calculateAdpValue(player.adp);
  const consensusDollars = player.consensusValue !== undefined ? player.consensusValue : player.value;

  let adpWeight = 0.65;
  let consensusWeight = 0.35;

  if (currentRound <= 5) {
    if (cpuArchetype === "market") {
      adpWeight = 0.85;
      consensusWeight = 0.15;
    } else if (cpuArchetype === "projection") {
      adpWeight = 0.65;
      consensusWeight = 0.35;
    } else {
      adpWeight = 0.75;
      consensusWeight = 0.25;
    }
  } else if (currentRound <= 15) {
    if (cpuArchetype === "market") {
      adpWeight = 0.75;
      consensusWeight = 0.25;
    } else if (cpuArchetype === "projection") {
      adpWeight = 0.55;
      consensusWeight = 0.45;
    } else {
      adpWeight = 0.65;
      consensusWeight = 0.35;
    }
  } else {
    if (cpuArchetype === "market") {
      adpWeight = 0.65;
      consensusWeight = 0.35;
    } else if (cpuArchetype === "projection") {
      adpWeight = 0.45;
      consensusWeight = 0.55;
    } else {
      adpWeight = 0.55;
      consensusWeight = 0.45;
    }
  }

  const adjustedAdpWeight = adpWeight * profile.marketTrust;
  const adjustedConsensusWeight = consensusWeight * profile.projectionTrust;
  const adjustedWeightTotal = Math.max(0.01, adjustedAdpWeight + adjustedConsensusWeight);
  adpWeight = adjustedAdpWeight / adjustedWeightTotal;
  consensusWeight = adjustedConsensusWeight / adjustedWeightTotal;

  const playerTypePreference = player.isPitcher ? profile.pitcherPreference : profile.hitterPreference;
  const preferenceMultiplier = 1.0 + ((playerTypePreference - 1.0) * 0.5);
  const baseValue = (adpWeight * adpDollars + consensusWeight * consensusDollars) * preferenceMultiplier;

  // 2. Roster Need Bonus
  const { isBench } = checkPositionalFit(cpuRoster, player, numRounds);
  let positionNeedScore = 0.25;
  if (!isBench) {
    const isCatcher = player.positions.includes("C");
    const isRP = player.positions.includes("RP");
    
    const countC = cpuRoster.filter(p => p.positions.includes("C")).length;

    if (isCatcher) {
      if (countC >= 2) {
        positionNeedScore = 0.0;
      } else if (countC === 0) {
        positionNeedScore = currentRound > 15 ? 1.0 : currentRound > 5 ? 0.85 : 0.50;
      } else {
        positionNeedScore = currentRound > 20 ? 0.75 : 0.35;
      }
    } else if (isRP) {
      if (!candidateIsCloser) {
        positionNeedScore = 0.10;
      } else if (countClosers >= closerPlan.target || hasSolvedSavesEarly) {
        positionNeedScore = 0.0;
      } else if (countClosers === 0) {
        positionNeedScore = currentRound > 12 ? 1.0 : currentRound > 6 ? 0.75 : 0.50;
      } else {
        positionNeedScore = currentRound > 15 ? 0.45 : 0.25;
      }
    } else {
      positionNeedScore = currentRound > 15 ? 1.0 : currentRound > 5 ? 0.75 : 0.50;
    }
  }

  const needMultiplier = (cpuArchetype === "need" ? 1.25 : 1.0) * profile.rosterNeed;
  const maxRosterNeed = (currentRound <= 5 ? 0.75 : currentRound <= 15 ? 2.00 : 3.00) * needMultiplier;
  const rosterNeedBonus = maxRosterNeed * positionNeedScore;

  // 3. Category Need Bonus
  const needs = calculateCategoryNeeds(cpuRoster, numRounds);
  const rawStatsAdjustment = calculateStatsAdjustment(player, needs);
  const catNeedMultiplier = (cpuArchetype === "need" ? 1.25 : 1.0) * profile.categoryNeed;
  const maxCatBonus = (currentRound <= 5 ? 0.50 : currentRound <= 15 ? 1.50 : 2.50) * catNeedMultiplier;
  const normalizedAdjustment = Math.max(0.0, Math.min(1.0, rawStatsAdjustment / 4.0));
  let categoryNeedBonus = maxCatBonus * normalizedAdjustment;

  if (candidateIsCloser && (countClosers >= closerPlan.target || hasSolvedSavesEarly)) {
    categoryNeedBonus *= 0.15;
  }

  // 4. Position Run Bonus
  const lastPicks = picks.slice(Math.max(0, currentPickIndex - 12), currentPickIndex);
  let positionRunBonus = 0;
  player.positions.forEach(pos => {
    let runCount = 0;
    lastPicks.forEach(pick => {
      if (pick.playerDraftedId) {
        const dp = allPlayers.find(p => p.id === pick.playerDraftedId);
        if (dp && dp.positions.includes(pos)) {
          runCount++;
        }
      }
    });

    let runIntensity = 0;
    if (pos === "RP") {
      if (runCount >= 2) {
        runIntensity = Math.min(1.0, runCount / 4.0);
      }
    } else {
      if (runCount >= 3) {
        runIntensity = Math.min(1.0, runCount / 6.0);
      }
    }

    const countOnRoster = pos === "RP" ? countClosers : cpuRoster.filter(p => p.positions.includes(pos)).length;
    const slots = pos === "RP" ? closerPlan.target : POSITION_SLOTS[pos] || 1;
    const teamNeed = Math.max(0, 1.0 - (countOnRoster / slots));

    const maxRunBonus = (currentRound <= 5 ? 0.50 : currentRound <= 15 ? 1.25 : 1.00) * profile.runReaction;
    const bonusVal = runIntensity * teamNeed * maxRunBonus;
    if (bonusVal > positionRunBonus) {
      positionRunBonus = bonusVal;
    }
  });

  // 5. Scarcity Bonus
  let maxPositionScarcity = 0;
  player.positions.forEach(pos => {
    const info = scarcityMap[pos];
    if (info) {
      if (info.positionRankPremium > maxPositionScarcity) {
        maxPositionScarcity = info.positionRankPremium;
      }
    }
  });

  const maxScarcityLimit = (currentRound <= 5 ? 0.75 : currentRound <= 15 ? 1.50 : 1.50) * profile.scarcity;
  const scarcityBonus = Math.min(maxScarcityLimit, maxPositionScarcity * (maxScarcityLimit / 2.00));

  // 6. Role / Playing Time Security Bonus
  let roleScore = 0;
  if (!player.isPitcher) {
    const ab = player.stats.AB || 0;
    if (ab >= 520) roleScore = 1.0;
    else if (ab >= 400) roleScore = 0.5;
    else if (ab >= 250) roleScore = -0.5;
    else roleScore = -1.5;
  } else {
    const isSP = player.positions.includes("SP");
    const isRP = player.positions.includes("RP");
    if (isSP) {
      const ip = player.stats.IP || 0;
      if (ip >= 150) roleScore = 1.0;
      else if (ip >= 100) roleScore = 0.5;
      else roleScore = -0.5;
    } else if (isRP) {
      const sv = player.stats.SV || 0;
      if (sv >= 25) roleScore = 1.0;
      else if (sv >= 10) roleScore = 0.25;
      else roleScore = -1.0;
    }
  }

  const maxRoleBonus = currentRound <= 5 ? 0.75 : currentRound <= 15 ? 1.00 : 2.00;
  const roleSecurityBonus = roleScore * maxRoleBonus;

  // 7. Upside Bonus
  const maxSystemValue = player.maxSystemValue !== undefined ? player.maxSystemValue : player.value;
  const consensusValue = player.consensusValue !== undefined ? player.consensusValue : player.value;
  const upsideGap = Math.max(0, maxSystemValue - consensusValue);
  const adpVariance = Math.max(0, player.maxPick - player.adp);
  const adpVarianceScore = Math.min(1.0, adpVariance / 30.0);
  const upsideScore = Math.max(Math.min(1.0, upsideGap / 5.0), adpVarianceScore * 0.5);

  const upsideMultiplier = (cpuArchetype === "upside" ? 1.40 : 1.0) * profile.upside;
  const phaseUpsideWeight = (currentRound <= 5 ? 0.50 : currentRound <= 15 ? 1.25 : 2.50) * upsideMultiplier;
  const upsideBonus = phaseUpsideWeight * upsideScore;

  // 8. Random Noise
  let randStdDev = currentRound <= 5 ? 0.50 : currentRound <= 15 ? 1.00 : 1.75;
  let randClamp = currentRound <= 5 ? 1.00 : currentRound <= 15 ? 1.75 : 3.00;

  if (cpuArchetype === "market") {
    randStdDev *= 0.5;
    randClamp *= 0.5;
  } else if (cpuArchetype === "upside") {
    randStdDev *= 1.20;
    randClamp *= 1.20;
  } else if (cpuArchetype === "need") {
    randStdDev *= 0.90;
    randClamp *= 0.90;
  }
  randStdDev *= profile.randomness;
  randClamp *= profile.randomness;

  const rawNoise = fixedRand !== undefined 
    ? (fixedRand - 0.5) * 2.0 * randStdDev
    : randomNormal(0, randStdDev);

  const randomNoise = Math.min(randClamp, Math.max(-randClamp, rawNoise));

  // 9. Reach Penalty
  let reachPenalty = 0;
  if (player.adp > pCurr) {
    const reachPicks = player.adp - pCurr;
    if (currentRound <= 5) {
      if (reachPicks > 6) {
        reachPenalty = (reachPicks - 6) * 1.5;
      }
    } else if (currentRound <= 15) {
      if (reachPicks > 15) {
        reachPenalty = (reachPicks - 15) * 0.8;
      }
    } else {
      if (reachPicks > 30) {
        reachPenalty = (reachPicks - 30) * 0.3;
      }
    }
  }
  reachPenalty = reachPenalty / Math.max(0.25, profile.reachTolerance);

  // 10. Roster Penalty
  let rosterPenalty = 0;
  const isCatcher = player.positions.includes("C");
  const isRP = player.positions.includes("RP");
  const isPitcher = player.isPitcher;

  const countC = cpuRoster.filter(p => p.positions.includes("C")).length;
  const countPitchers = cpuRoster.filter(p => p.isPitcher).length;
  const countBatters = cpuRoster.filter(p => !p.isPitcher).length;

  if (isCatcher && countC >= 1) {
    rosterPenalty += currentRound <= 20 ? 15.0 : 5.0;
  }

  if (candidateIsCloser) {
    if (countClosers >= closerPlan.max) {
      rosterPenalty += 100.0;
    } else if (hasSolvedSavesEarly) {
      rosterPenalty += 45.0;
    } else if (countClosers >= closerPlan.target) {
      rosterPenalty += currentRound <= 15 ? 22.0 : 14.0;
    } else if (countClosers >= 2) {
      rosterPenalty += currentRound <= 15 ? 14.0 : 8.0;
    }
  } else if (isRP && countClosers >= closerPlan.target) {
    rosterPenalty += 8.0;
  }

  if (!isPitcher && countBatters >= 11 && countPitchers <= 4 && currentRound <= 18) {
    rosterPenalty += 8.0;
  }

  const countOF = cpuRoster.filter(p => p.positions.includes("OF")).length;
  if (player.positions.includes("OF") && countOF >= 6) {
    rosterPenalty += 5.0;
  }

  // 11. Urgency Bonus (ADP Slide & maxPick Urgency)
  let urgencyBonus = 0;
  if (pCurr > player.adp) {
    const slidePicks = pCurr - player.adp;
    urgencyBonus += Math.min(4.0, slidePicks * 0.20);
  }
  if (pCurr >= player.maxPick) {
    urgencyBonus += 6.0;
  } else if (player.maxPick - pCurr <= 10) {
    const picksToMax = player.maxPick - pCurr;
    urgencyBonus += (11 - picksToMax) * 0.5;
  }
  if (candidateIsCloser && (countClosers >= closerPlan.target || hasSolvedSavesEarly)) {
    urgencyBonus *= 0.15;
  }

  // 12. Saves Strategy Adjustment (for RPs)
  let savesStrategyBonus = 0;
  if (player.positions.includes("RP")) {
    const projectedSaves = player.stats.SV || 0;
    const isCloser = projectedSaves >= 12;
    const closerQuality = Math.min(1.0, projectedSaves / 30.0);
    const earlyRoundScale = currentRound <= 8 ? 1.0 : currentRound <= 14 ? 0.75 : 0.4;
    const stillNeedsCloser = isCloser && countClosers < closerPlan.target && !hasSolvedSavesEarly;

    if (effectiveSavesStrategy === "aggressive" && stillNeedsCloser) {
      savesStrategyBonus = 4.0 * closerQuality * earlyRoundScale * profile.closerAggression;
    } else if (effectiveSavesStrategy === "wait" && currentRound <= 10) {
      savesStrategyBonus = -4.0 * profile.closerAggression;
    } else if (effectiveSavesStrategy === "balanced" && stillNeedsCloser && currentRound >= 7 && currentRound <= 14) {
      savesStrategyBonus = 1.5 * closerQuality * profile.closerAggression;
    } else if (isCloser && countClosers >= closerPlan.target) {
      savesStrategyBonus = -3.0 * profile.closerAggression;
    }
  }

  const score = 
    baseValue 
    + rosterNeedBonus 
    + categoryNeedBonus 
    + positionRunBonus 
    + scarcityBonus 
    + roleSecurityBonus 
    + upsideBonus 
    + randomNoise 
    + urgencyBonus
    + savesStrategyBonus
    - reachPenalty 
    - rosterPenalty;

  return {
    score: Math.round(score * 100) / 100,
    baseValue: Math.round(baseValue * 100) / 100,
    adpDollars: Math.round(adpDollars * 100) / 100,
    consensusDollars: Math.round(consensusDollars * 100) / 100,
    rosterNeedBonus: Math.round(rosterNeedBonus * 100) / 100,
    categoryNeedBonus: Math.round(categoryNeedBonus * 100) / 100,
    positionRunBonus: Math.round(positionRunBonus * 100) / 100,
    scarcityBonus: Math.round(scarcityBonus * 100) / 100,
    roleSecurityBonus: Math.round(roleSecurityBonus * 100) / 100,
    upsideBonus: Math.round(upsideBonus * 100) / 100,
    randomNoise: Math.round(randomNoise * 100) / 100,
    reachPenalty: Math.round(reachPenalty * 100) / 100,
    rosterPenalty: Math.round(rosterPenalty * 100) / 100,
    urgencyBonus: Math.round(urgencyBonus * 100) / 100,
    savesStrategyBonus: Math.round(savesStrategyBonus * 100) / 100,
    isBench
  };
}

export interface TargetMetrics {
  optimalRound: number;
  optimalOverallPick: number;
  survivalProbabilities: { round: number; overallPick: number; probability: number }[];
  status: "drafted" | "gone" | "urgent" | "safe";
}

export function calculateTargetMetrics(
  player: Player,
  pCurr: number,
  userPicks: DraftPick[],
  draftedPlayerIds: Set<string>
): TargetMetrics {
  const isDrafted = draftedPlayerIds.has(player.id);

  const survivalProbabilities = userPicks
    .filter((up) => up.overallPick >= pCurr)
    .map((up) => {
      const probability = calculateReturnProbability(pCurr, up.overallPick, player);
      return {
        round: up.round,
        overallPick: up.overallPick,
        probability,
      };
    });

  let optimalIdx = -1;
  for (let i = 0; i < survivalProbabilities.length; i++) {
    if (survivalProbabilities[i].probability >= 0.35) {
      optimalIdx = i;
    } else {
      break;
    }
  }

  if (optimalIdx === -1 && survivalProbabilities.length > 0) {
    optimalIdx = 0;
  }

  const optimalPick = survivalProbabilities[optimalIdx];
  const optimalRound = optimalPick ? optimalPick.round : -1;
  const optimalOverallPick = optimalPick ? optimalPick.overallPick : -1;

  let status: "drafted" | "gone" | "urgent" | "safe" = "safe";
  if (isDrafted) {
    status = "drafted";
  } else if (survivalProbabilities.length === 0) {
    status = "gone";
  } else {
    const nextPickProb = survivalProbabilities[0]?.probability || 0;
    if (nextPickProb < 0.20) {
      status = "gone";
    } else if (nextPickProb < 0.45) {
      status = "urgent";
    } else {
      status = "safe";
    }
  }

  return {
    optimalRound,
    optimalOverallPick,
    survivalProbabilities,
    status,
  };
}
