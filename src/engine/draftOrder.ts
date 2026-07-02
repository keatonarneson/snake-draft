

import type { CpuScoreDetails } from "./cpuScoring";

export interface DraftPick {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
  playerDraftedId: string | null;
  cpuScore?: number;
  cpuScoreDetails?: CpuScoreDetails;
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

