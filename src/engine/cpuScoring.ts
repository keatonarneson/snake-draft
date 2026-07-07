import { Player } from "../types/draft";
import { calculateCategoryNeeds, calculateStatsAdjustment } from "./categoryNeeds";
import { DraftPick } from "./draftOrder";
import { CPU_PROFILE_TEMPLATES, CpuArchetype, CpuProfile, getCpuCloserPlan } from "./cpuProfiles";
import { isDraftableCloser, isPremiumCloser } from "./playerRoles";
import { POSITION_SLOTS, ScarcityInfo } from "./positionScarcity";
import { checkPositionalFit } from "./rosterFit";
import { getConsensusValue, getMaxSystemValue } from "./playerValue";

// Round-phase selector used throughout CPU scoring: early (≤5), mid (≤15),
// late (>15). Centralizes the phase boundaries that were repeated inline.
function byPhase<T>(round: number, early: T, mid: T, late: T): T {
  return round <= 5 ? early : round <= 15 ? mid : late;
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

// --- Base value: ADP → projected auction-dollar curve ---
// Dollar value decays from a max as ADP rises, following a gentle sub-linear
// power curve, and is floored so late players never score at or below $0.
const ADP_VALUE_MAX = 45.0; // value ($) at ADP 1
const ADP_VALUE_DECAY = 1.8; // decay coefficient
const ADP_VALUE_EXPONENT = 0.6; // sub-linear falloff
const ADP_VALUE_FLOOR = 1.0; // never below $1

// --- Reach penalty: taking a player earlier than their ADP ---
// Each phase forgives a slack window of picks, then charges a per-pick cost for
// every pick reached beyond it. Early reaches are cheap slack but steep cost;
// late rounds tolerate large reaches at low cost.
const REACH_EARLY_SLACK = 6;
const REACH_EARLY_COST = 1.5; // rounds 1–5
const REACH_MID_SLACK = 15;
const REACH_MID_COST = 0.8; // rounds 6–15
const REACH_LATE_SLACK = 30;
const REACH_LATE_COST = 0.3; // rounds 16+

// --- Roster penalty: discourage stacking a position past its need ---
const CLOSER_PENALTY_OVER_MAX = 100.0; // already at closerPlan.max
const CLOSER_PENALTY_SAVES_SOLVED = 45.0; // two premium closers already rostered
const CLOSER_PENALTY_AT_TARGET_EARLY = 22.0; // at target, rounds ≤15
const CLOSER_PENALTY_AT_TARGET_LATE = 14.0; // at target, rounds >15
const CLOSER_PENALTY_TWO_PLUS_EARLY = 14.0; // 2+ closers, rounds ≤15
const CLOSER_PENALTY_TWO_PLUS_LATE = 8.0; // 2+ closers, rounds >15
const EXTRA_RP_AT_TARGET_PENALTY = 8.0; // non-closer RP once saves target met
const SECOND_CATCHER_PENALTY_EARLY = 15.0; // 2nd catcher, rounds ≤20
const SECOND_CATCHER_PENALTY_LATE = 5.0; // 2nd catcher, rounds >20
const BATTER_HEAVY_PENALTY = 8.0; // too many batters vs pitchers
const EXCESS_OF_PENALTY = 5.0; // 7th+ outfielder

export function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export function calculateAdpValue(adp: number): number {
  const baseValue = ADP_VALUE_MAX - ADP_VALUE_DECAY * Math.pow(Math.max(0, adp - 1), ADP_VALUE_EXPONENT);
  return Math.round(Math.max(ADP_VALUE_FLOOR, baseValue) * 10) / 10;
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
  const consensusDollars = getConsensusValue(player);

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
  const maxRosterNeed = byPhase(currentRound, 0.75, 2.0, 3.0) * needMultiplier;
  const rosterNeedBonus = maxRosterNeed * positionNeedScore;

  // 3. Category Need Bonus
  const needs = calculateCategoryNeeds(cpuRoster, numRounds);
  const rawStatsAdjustment = calculateStatsAdjustment(player, needs);
  const catNeedMultiplier = (cpuArchetype === "need" ? 1.25 : 1.0) * profile.categoryNeed;
  const maxCatBonus = byPhase(currentRound, 0.5, 1.5, 2.5) * catNeedMultiplier;
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

    const maxRunBonus = byPhase(currentRound, 0.5, 1.25, 1.0) * profile.runReaction;
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

  const maxScarcityLimit = byPhase(currentRound, 0.75, 1.5, 1.5) * profile.scarcity;
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

  const maxRoleBonus = byPhase(currentRound, 0.75, 1.0, 2.0);
  const roleSecurityBonus = roleScore * maxRoleBonus;

  // 7. Upside Bonus
  const upsideGap = Math.max(0, getMaxSystemValue(player) - getConsensusValue(player));
  const adpVariance = Math.max(0, player.maxPick - player.adp);
  const adpVarianceScore = Math.min(1.0, adpVariance / 30.0);
  const upsideScore = Math.max(Math.min(1.0, upsideGap / 5.0), adpVarianceScore * 0.5);

  const upsideMultiplier = (cpuArchetype === "upside" ? 1.40 : 1.0) * profile.upside;
  const phaseUpsideWeight = byPhase(currentRound, 0.5, 1.25, 2.5) * upsideMultiplier;
  const upsideBonus = phaseUpsideWeight * upsideScore;

  // 8. Random Noise
  let randStdDev = byPhase(currentRound, 0.5, 1.0, 1.75);
  let randClamp = byPhase(currentRound, 1.0, 1.75, 3.0);

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
      if (reachPicks > REACH_EARLY_SLACK) {
        reachPenalty = (reachPicks - REACH_EARLY_SLACK) * REACH_EARLY_COST;
      }
    } else if (currentRound <= 15) {
      if (reachPicks > REACH_MID_SLACK) {
        reachPenalty = (reachPicks - REACH_MID_SLACK) * REACH_MID_COST;
      }
    } else {
      if (reachPicks > REACH_LATE_SLACK) {
        reachPenalty = (reachPicks - REACH_LATE_SLACK) * REACH_LATE_COST;
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
    rosterPenalty += currentRound <= 20 ? SECOND_CATCHER_PENALTY_EARLY : SECOND_CATCHER_PENALTY_LATE;
  }

  if (candidateIsCloser) {
    if (countClosers >= closerPlan.max) {
      rosterPenalty += CLOSER_PENALTY_OVER_MAX;
    } else if (hasSolvedSavesEarly) {
      rosterPenalty += CLOSER_PENALTY_SAVES_SOLVED;
    } else if (countClosers >= closerPlan.target) {
      rosterPenalty += currentRound <= 15 ? CLOSER_PENALTY_AT_TARGET_EARLY : CLOSER_PENALTY_AT_TARGET_LATE;
    } else if (countClosers >= 2) {
      rosterPenalty += currentRound <= 15 ? CLOSER_PENALTY_TWO_PLUS_EARLY : CLOSER_PENALTY_TWO_PLUS_LATE;
    }
  } else if (isRP && countClosers >= closerPlan.target) {
    rosterPenalty += EXTRA_RP_AT_TARGET_PENALTY;
  }

  if (!isPitcher && countBatters >= 11 && countPitchers <= 4 && currentRound <= 18) {
    rosterPenalty += BATTER_HEAVY_PENALTY;
  }

  const countOF = cpuRoster.filter(p => p.positions.includes("OF")).length;
  if (player.positions.includes("OF") && countOF >= 6) {
    rosterPenalty += EXCESS_OF_PENALTY;
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

