import { Player } from "../types/draft";
import { ACTIVE_BATTER_SLOTS, ACTIVE_PITCHER_SLOTS, LEAGUE_TARGETS } from "./config";

// Re-exported under the historical name so existing engine/UI imports keep working.
export const TARGETS = LEAGUE_TARGETS;

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

  const batterFillRatio = Math.min(1.0, battersCount / ACTIVE_BATTER_SLOTS);
  const pitcherFillRatio = Math.min(1.0, pitchersCount / ACTIVE_PITCHER_SLOTS);

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

