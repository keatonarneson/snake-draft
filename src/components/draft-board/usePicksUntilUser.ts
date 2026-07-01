import { useMemo } from "react";
import { DraftPick } from "../../engine";

interface UsePicksUntilUserOptions {
  picks: DraftPick[];
  currentPickIndex: number;
  userTeamIndex: number;
}

export function usePicksUntilUser({
  picks,
  currentPickIndex,
  userTeamIndex,
}: UsePicksUntilUserOptions) {
  return useMemo(() => {
    const currentPick = picks[currentPickIndex];
    if (!currentPick) return -1;

    if (currentPick.teamIndex === userTeamIndex) return 0;

    let count = 0;
    for (let index = currentPickIndex; index < picks.length; index++) {
      if (picks[index].teamIndex === userTeamIndex) {
        return count;
      }
      count++;
    }

    return -1;
  }, [currentPickIndex, picks, userTeamIndex]);
}
