import { Player } from "../types/draft";
import { DraftPick } from "./draftOrder";
import { calculateReturnProbability } from "./draftProbability";

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

