/**
 * Central tuning constants for the draft engine.
 *
 * These were previously scattered as inline literals across categoryNeeds,
 * playerRoles, and several UI components (each with its own copy of the league
 * targets). Keeping them here gives one place to tune the model and removes the
 * drift risk of duplicated magic numbers.
 */

// League-wide season totals a competitive roster is pacing toward. Used both as
// the default in the engine and as the seed values in the settings UI.
export const LEAGUE_TARGETS = {
  R: 1125,
  HR: 315,
  RBI: 1103,
  SB: 190,
  AVG: 0.263,
  W: 93,
  SV: 88,
  SO: 1275,
  ERA: 3.65,
  WHIP: 1.2,
};
export type LeagueTargets = typeof LEAGUE_TARGETS;

// Active (non-bench) slot counts, used to pace category-need fill ratios.
export const ACTIVE_BATTER_SLOTS = 14;
export const ACTIVE_PITCHER_SLOTS = 9;

// Closer classification thresholds (see playerRoles).
export const CLOSER_MIN_SAVES = 12; // draftable closer floor
export const PREMIUM_CLOSER_MAX_ADP = 100;
export const PREMIUM_CLOSER_MIN_VALUE = 5;
export const PREMIUM_CLOSER_ELITE_SAVES = 28;
