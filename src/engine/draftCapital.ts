import { Player } from "../types/draft";

export interface DraftedPlayerWithPick {
  player: Player;
  teamIndex: number;
  round?: number;
  overallPick?: number;
}

export interface DraftCapitalPick {
  player: Player;
  round?: number;
  overallPick?: number;
  bucket: "Hit" | "SP" | "RP";
  capital: number;
  pct: number;
}

export interface DraftCapitalSummary {
  hitters: number;
  sp: number;
  rp: number;
  total: number;
  hitterPct: number;
  pitcherPct: number;
  spPct: number;
  rpPct: number;
  picks: DraftCapitalPick[];
  note: string;
}

export function getPickCapital(round?: number): number {
  if (!round || round <= 0) return 1;
  return Math.max(0.6, 10 * Math.pow(0.86, round - 1));
}

export function getDraftCapitalBucket(player: Player): DraftCapitalPick["bucket"] {
  if (!player.isPitcher) return "Hit";
  if (player.positions.includes("SP")) return "SP";
  return "RP";
}

export function calculateDraftCapital(
  draftedPlayers: DraftedPlayerWithPick[]
): DraftCapitalSummary {
  const buckets = draftedPlayers.reduce(
    (totals, draftedPlayer) => {
      const capital = getPickCapital(draftedPlayer.round);
      const bucket = getDraftCapitalBucket(draftedPlayer.player);

      if (bucket === "Hit") {
        totals.hitters += capital;
      } else if (bucket === "SP") {
        totals.sp += capital;
      } else {
        totals.rp += capital;
      }

      totals.total += capital;
      return totals;
    },
    { hitters: 0, sp: 0, rp: 0, total: 0 }
  );

  const pct = (value: number) => buckets.total > 0 ? Math.round((value / buckets.total) * 100) : 0;
  const pitcherPct = pct(buckets.sp + buckets.rp);
  const hitterPct = pct(buckets.hitters);
  const spPct = pct(buckets.sp);
  const rpPct = pct(buckets.rp);

  const picks = draftedPlayers
    .map((draftedPlayer) => {
      const capital = getPickCapital(draftedPlayer.round);
      return {
        player: draftedPlayer.player,
        round: draftedPlayer.round,
        overallPick: draftedPlayer.overallPick,
        bucket: getDraftCapitalBucket(draftedPlayer.player),
        capital,
        pct: pct(capital),
      };
    })
    .sort((a, b) => (a.overallPick ?? 9999) - (b.overallPick ?? 9999));

  let note = "Draft picks will shape this build as players are selected.";
  if (buckets.total > 0) {
    if (spPct >= 45 && draftedPlayers.length <= 6) {
      note = "Early SP capital is heavy. Bats can take priority unless SP value falls.";
    } else if (pitcherPct <= 20 && draftedPlayers.length >= 4) {
      note = "Pitching capital is light. Watch upcoming SP/RP windows.";
    } else if (hitterPct >= 78 && draftedPlayers.length >= 5) {
      note = "Hitter capital is heavy. Start tracking pitching entry points.";
    } else if (rpPct >= 18 && draftedPlayers.length <= 10) {
      note = "Relief capital is already meaningful. Be selective with more saves.";
    } else {
      note = "Capital balance is reasonable for this stage.";
    }
  }

  return {
    hitters: buckets.hitters,
    sp: buckets.sp,
    rp: buckets.rp,
    total: buckets.total,
    hitterPct,
    pitcherPct,
    spPct,
    rpPct,
    picks,
    note,
  };
}
