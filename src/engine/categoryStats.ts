import { Player } from "../types/draft";

export type CategoryKey = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "SV" | "SO" | "ERA" | "WHIP";

export interface CategoryDefinition {
  key: CategoryKey;
  label: string;
  lowerIsBetter?: boolean;
  decimals?: number;
}

export interface CategoryStats {
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
}

export const CATEGORIES: CategoryDefinition[] = [
  { key: "R", label: "R" },
  { key: "HR", label: "HR" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "SB" },
  { key: "AVG", label: "AVG", decimals: 3 },
  { key: "W", label: "W" },
  { key: "SV", label: "SV" },
  { key: "SO", label: "SO" },
  { key: "ERA", label: "ERA", lowerIsBetter: true, decimals: 2 },
  { key: "WHIP", label: "WHIP", lowerIsBetter: true, decimals: 2 },
];

export const HITTER_CATEGORIES: CategoryKey[] = ["R", "HR", "RBI", "SB", "AVG"];
export const PITCHER_CATEGORIES: CategoryKey[] = ["W", "SV", "SO", "ERA", "WHIP"];

export function emptyCategoryRecord(value = 0): Record<CategoryKey, number> {
  return CATEGORIES.reduce((acc, category) => {
    acc[category.key] = value;
    return acc;
  }, {} as Record<CategoryKey, number>);
}

export function calculateCategoryStats(players: Player[]): CategoryStats {
  let R = 0;
  let HR = 0;
  let RBI = 0;
  let SB = 0;
  let totalAB = 0;
  let weightedAVG = 0;
  let W = 0;
  let SV = 0;
  let SO = 0;
  let totalIP = 0;
  let weightedERA = 0;
  let weightedWHIP = 0;
  let hitters = 0;
  let pitchers = 0;
  let value = 0;

  players.forEach((player) => {
    value += player.value || 0;

    if (player.isPitcher) {
      pitchers += 1;
      W += player.stats.W || 0;
      SV += player.stats.SV || 0;
      SO += player.stats.SO || 0;

      if (player.stats.IP && player.stats.IP > 0) {
        totalIP += player.stats.IP;
        weightedERA += (player.stats.ERA || 0) * player.stats.IP;
        weightedWHIP += (player.stats.WHIP || 0) * player.stats.IP;
      }
      return;
    }

    hitters += 1;
    R += player.stats.R || 0;
    HR += player.stats.HR || 0;
    RBI += player.stats.RBI || 0;
    SB += player.stats.SB || 0;

    if (player.stats.AB && player.stats.AB > 0) {
      totalAB += player.stats.AB;
      weightedAVG += (player.stats.AVG || 0) * player.stats.AB;
    }
  });

  return {
    players: players.length,
    hitters,
    pitchers,
    value,
    AB: totalAB,
    IP: totalIP,
    R,
    HR,
    RBI,
    SB,
    AVG: totalAB > 0 ? weightedAVG / totalAB : 0,
    W,
    SV,
    SO,
    ERA: totalIP > 0 ? weightedERA / totalIP : 0,
    WHIP: totalIP > 0 ? weightedWHIP / totalIP : 0,
  };
}

export function formatCategoryStat(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return decimals > 0 ? (0).toFixed(decimals) : "0";
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}
