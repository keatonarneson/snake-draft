import { Player, PlayerStats } from "../types/draft";

export type CategoryKey = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "SV" | "SO" | "ERA" | "WHIP";

/**
 * Scale a hitter's counting stats (R/HR/RBI/SB) proportionally to a new AB
 * total, e.g. when projecting a part-time player into a full-time role. Returns
 * the changed stat fields (including the new AB), or null when the baseline or
 * target AB is non-positive.
 */
export function scaleHitterCountingStats(
  baseline: Partial<PlayerStats>,
  targetAB: number
): Partial<PlayerStats> | null {
  const baselineAB = Number(baseline.AB || 0);
  if (baselineAB <= 0 || targetAB <= 0) return null;

  const ratio = targetAB / baselineAB;
  const scaled: Partial<PlayerStats> = { AB: targetAB };
  (["R", "HR", "RBI", "SB"] as const).forEach((stat) => {
    scaled[stat] = Math.round(Number(baseline[stat] || 0) * ratio);
  });
  return scaled;
}

/**
 * A player's approximate contribution to a rotisserie category. Rate stats
 * (AVG/ERA/WHIP) are converted to volume-weighted contributions relative to a
 * league-average baseline so they are comparable to counting stats.
 */
export function calculateCategoryContribution(player: Player, category: string): number {
  const stats = player.stats;

  switch (category) {
    case "AVG":
      return ((stats.AVG || 0) - 0.260) * (stats.AB || 500);
    case "ERA":
      return (4.00 - (stats.ERA || 4.00)) * (stats.IP || 100);
    case "WHIP":
      return (1.25 - (stats.WHIP || 1.25)) * (stats.IP || 100) * 4;
    default:
      return Number(stats[category as keyof typeof stats] || 0);
  }
}

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
