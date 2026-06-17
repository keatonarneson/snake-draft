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
    { label: "UT", isPitcher: false, positions: ["C", "1B", "2B", "3B", "SS", "OF", "UT"], priority: 3 },

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

  for (const player of sortedPlayers) {
    let placed = false;

    // Pass 1: Try priority 1 slots
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 1 && !filledSlots.has(i)) {
        if (player.isPitcher === slot.isPitcher && player.positions.some(pos => slot.positions.includes(pos))) {
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
        if (player.isPitcher === slot.isPitcher && player.positions.some(pos => slot.positions.includes(pos))) {
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
        if (player.isPitcher === slot.isPitcher && player.positions.some(pos => slot.positions.includes(pos))) {
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
  R: 1166,
  HR: 326,
  RBI: 1120,
  SB: 171,
  AVG: 0.262,
  W: 112,
  SV: 90,
  SO: 1725,
  ERA: 3.75,
  WHIP: 1.18,
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

export interface ScarcityInfo {
  position: string;
  bestValueNow: number;
  expectedBestValueNext: number;
  dropOff: number;
  remainingCount: number;
  bestPlayerNow?: { name: string; value: number };
  expectedPlayersNext?: ScarcityPlayerInfo[];
}

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

/**
 * Returns the total number of roster slots that accept a given position.
 */
function getTotalSlotsForPosition(pos: string): number {
  return ACTIVE_SLOTS.filter((slot) => slot.positions.includes(pos)).length;
}

export function calculatePositionScarcity(
  availablePlayers: Player[],
  pCurr: number,
  pNext: number,
  positions: string[],
  rankScarcityCoeff: number = 0.15
): Record<string, ScarcityInfo> {

  const scarcity: Record<string, ScarcityInfo> = {};

  positions.forEach((pos) => {
    const posPlayers = availablePlayers
      .filter((p) => p.positions.includes(pos))
      .sort((a, b) => b.value - a.value);

    if (posPlayers.length === 0) {
      scarcity[pos] = {
        position: pos,
        bestValueNow: -10,
        expectedBestValueNext: -10,
        dropOff: 0,
        remainingCount: 0,
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
      
      const fallbackRank = posPlayers.length - 1;
      expectedBestRankNext += fallbackRank * probAccum;
    }

    const valueDropOff = Math.max(0, bestValueNow - expectedBestValueNext);
    const rankDropOff = expectedBestRankNext;

    // Scale rank drop-off to dollars using the rankScarcityCoeff
     // Compute total slots for this position and adjust coefficient dynamically
  const remainingCount = posPlayers.length;
  const totalSlots = getTotalSlotsForPosition(pos);
  const dynamicCoeff = rankScarcityCoeff * (remainingCount / Math.max(1, totalSlots));
  const dropOff = valueDropOff + rankDropOff * dynamicCoeff;

    scarcity[pos] = {
      position: pos,
      bestValueNow,
      expectedBestValueNext,
      dropOff,
      remainingCount: posPlayers.length,
      bestPlayerNow,
      expectedPlayersNext,
    };
  });

  return scarcity;
}

export interface Recommendation {
  player: Player;
  pReturn: number;
  scarcityDropOff: number;
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
  numRounds: number = 23,
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
    w_scarcity = 0.0;    // No scarcity in early rounds
    w_reach = 1.5;       // Strict reach penalty to prevent reaching
    w_upside = 0.0;      // No upside bonus early
    d_bench = 0.40;      // Stronger bench discount to ensure players "fit the board" (fill active slots)
  } else if (currentRound >= 15) {
    phase = "late";
    w_needs = 1.5;       // Heavily target category needs and gaps
    w_scarcity = 0.0;    // Scarcity is irrelevant in late rounds
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
    
    // Get maximum scarcity drop-off
    let scarcityDropOff = 0;
    player.positions.forEach((pos) => {
      const info = scarcityMap[pos];
      if (info && info.dropOff > scarcityDropOff) {
        scarcityDropOff = info.dropOff;
      }
    });

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
    const scarcityPremium = scarcityDropOff * (1.0 - pReturn) * w_scarcity * w_urgency;

    // General draft urgency timing bonus: if a player is close to being drafted (pReturn is low) and has positive value,
    // give them a slight boost when draftUrgency is high.
    const urgencyBonus = (1.0 - pReturn) * Math.max(0.0, player.value) * 0.35 * w_urgency;

    const baseScore = baseValue + statsAdjustment + scarcityPremium + upsideBonus + reachPenalty + urgencyBonus;

    // Apply bench discount
    let finalScore = baseScore;
    if (isBench) {
      finalScore = baseScore > 0 ? baseScore * d_bench : baseScore * (2.0 - d_bench);
    }

    return {
      player,
      pReturn,
      scarcityDropOff,
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
  adpScore: number;
  projScore: number;
  needScore: number;
  randScore: number;
  penalty: number;
  bonus: number;
  urgency: number;
  marketVal: number;
  isBench: boolean;
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
  fixedRand?: number
): CpuScoreDetails {
  const marketVal = calculateAdpValue(player.adp);

  // 1. ADP / Market Timing Score (S_ADP)
  let penalty = 0;
  if (player.adp > pCurr + 8) {
    const reachPicks = player.adp - (pCurr + 8);
    penalty = Math.min(marketVal, reachPicks * 1.5);
  }

  let bonus = 0;
  if (pCurr > player.adp) {
    const slidePicks = pCurr - player.adp;
    bonus = Math.min(10.0, slidePicks * 0.5);
  }

  let urgency = 0;
  if (pCurr >= player.maxPick) {
    urgency = 10.0 + (pCurr - player.maxPick) * 1.5;
  } else if (player.maxPick > player.adp) {
    const fractionToMax = (pCurr - player.adp) / (player.maxPick - player.adp);
    urgency = Math.max(0.0, fractionToMax * 10.0);
  }

  const adpScore = Math.max(0.0, marketVal - penalty + bonus + urgency);

  // 2. Projection Value Score (S_Proj)
  const projScore = player.value;

  // 3. Roster Need Score (S_Need)
  const { isBench } = checkPositionalFit(cpuRoster, player, numRounds);
  const needScore = isBench ? 2.0 : 30.0;

  // 4. Randomness Score (S_Rand)
  const randScore = fixedRand !== undefined ? fixedRand * 30.0 : Math.random() * 30.0;

  // 5. Combined CPU Score: 80% ADP, 10% Proj, 7% Need, 3% Rand
  const score = 0.80 * adpScore + 0.10 * projScore + 0.07 * needScore + 0.03 * randScore;

  return {
    score: Math.round(score * 100) / 100,
    adpScore: Math.round(adpScore * 100) / 100,
    projScore: Math.round(projScore * 100) / 100,
    needScore: Math.round(needScore * 100) / 100,
    randScore: Math.round(randScore * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    urgency: Math.round(urgency * 100) / 100,
    marketVal,
    isBench
  };
}
