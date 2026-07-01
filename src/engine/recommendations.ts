import { Player } from "../types/draft";
import { calculateCategoryNeeds, calculateStatsAdjustment, TARGETS } from "./categoryNeeds";
import { calculateReturnProbability } from "./draftProbability";
import { ScarcityInfo } from "./positionScarcity";
import { checkPositionalFit } from "./rosterFit";

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
      // Logistic parameters â€“ these could be exposed via UI later
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

