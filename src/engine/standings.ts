import {
  CATEGORIES,
  CategoryKey,
  calculateCategoryStats,
  emptyCategoryRecord,
  HITTER_CATEGORIES,
  PITCHER_CATEGORIES,
} from "./categoryStats";
import { buildRosterSlots, type TeamSlotAssignments } from "./rosterSlots";
import { Player, PlayerStats } from "../types/draft";

export interface DraftedPlayerForStandings {
  player: Player;
  teamIndex: number;
}

export interface TeamStanding {
  teamIndex: number;
  teamName: string;
  players: number;
  hitters: number;
  pitchers: number;
  value: number;
  AB: number;
  IP: number;
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  SV: number;
  SO: number;
  ERA: number;
  WHIP: number;
  categoryPoints: Record<CategoryKey, number>;
  categoryRanks: Record<CategoryKey, number>;
  points: number;
  hitterPoints: number;
  pitcherPoints: number;
  rank: number;
}

export function calculateProjectedStandings({
  teamNames,
  userTeamIndex,
  draftedPlayers,
  numRounds,
  projectionOverrides = {},
  slotAssignmentsByTeam = {},
}: {
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: DraftedPlayerForStandings[];
  numRounds: number;
  projectionOverrides?: Record<string, Partial<PlayerStats>>;
  slotAssignmentsByTeam?: TeamSlotAssignments;
}): TeamStanding[] {
  const rows: TeamStanding[] = teamNames.map((teamName, teamIndex) => {
    const roster = draftedPlayers
      .filter((drafted) => drafted.teamIndex === teamIndex)
      .map((drafted) => {
        if (teamIndex !== userTeamIndex || !projectionOverrides[drafted.player.id]) {
          return drafted.player;
        }

        return {
          ...drafted.player,
          stats: {
            ...drafted.player.stats,
            ...projectionOverrides[drafted.player.id],
          },
        };
      });
    const fitted = buildRosterSlots(roster, numRounds, slotAssignmentsByTeam[teamIndex] || {});
    const starters = fitted.active.flatMap((slot) => (slot.player ? [slot.player] : []));
    const stats = calculateCategoryStats(starters);

    return {
      teamIndex,
      teamName,
      ...stats,
      categoryPoints: emptyCategoryRecord(),
      categoryRanks: emptyCategoryRecord(),
      points: 0,
      hitterPoints: 0,
      pitcherPoints: 0,
      rank: 0,
    };
  });

  CATEGORIES.forEach((category) => {
    const sorted = [...rows].sort((a, b) => {
      const aHasVolume = category.key === "AVG" ? a.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? a.IP > 0 : true;
      const bHasVolume = category.key === "AVG" ? b.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? b.IP > 0 : true;
      const aValue = aHasVolume ? a[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const bValue = bHasVolume ? b[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      return category.lowerIsBetter ? aValue - bValue : bValue - aValue;
    });

    let index = 0;
    while (index < sorted.length) {
      const groupStart = index;
      const current = sorted[index];
      const currentHasVolume = category.key === "AVG" ? current.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? current.IP > 0 : true;
      const currentValue = currentHasVolume ? current[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

      while (index + 1 < sorted.length) {
        const next = sorted[index + 1];
        const nextHasVolume = category.key === "AVG" ? next.AB > 0 : category.key === "ERA" || category.key === "WHIP" ? next.IP > 0 : true;
        const nextValue = nextHasVolume ? next[category.key] : category.lowerIsBetter ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        if (Math.abs(nextValue - currentValue) > 0.0001) break;
        index += 1;
      }

      const groupEnd = index;
      const highPoints = rows.length - groupStart;
      const lowPoints = rows.length - groupEnd;
      const points = (highPoints + lowPoints) / 2;
      const rank = groupStart + 1;

      for (let groupIndex = groupStart; groupIndex <= groupEnd; groupIndex++) {
        sorted[groupIndex].categoryPoints[category.key] = points;
        sorted[groupIndex].categoryRanks[category.key] = rank;
      }

      index += 1;
    }
  });

  rows.forEach((row) => {
    row.hitterPoints = HITTER_CATEGORIES.reduce((sum, key) => sum + row.categoryPoints[key], 0);
    row.pitcherPoints = PITCHER_CATEGORIES.reduce((sum, key) => sum + row.categoryPoints[key], 0);
    row.points = row.hitterPoints + row.pitcherPoints;
  });

  [...rows]
    .sort((a, b) => b.points - a.points || b.value - a.value)
    .forEach((row, index) => {
      row.rank = index + 1;
    });

  return rows;
}
