import { Player } from "../types/draft";

/**
 * Canonical active-roster slot layout, shared by the two consumers that used to
 * each carry their own copy:
 *   - rosterFit.fitRoster — auto-allocates by player value for engine scoring
 *   - rosterSlots.buildRosterSlots — respects manual assignments for the UI
 *
 * The placement algorithms stay separate on purpose (auto-greedy vs.
 * manual-aware); only the slot definition and the eligibility rule are shared.
 * `priority` drives fitRoster's fill order (specific slots, then CI/MI, then UT)
 * and the array order matches the UI's display order.
 */
export type SlotPriority = 1 | 2 | 3;

export interface RosterSlotSpec {
  label: string;
  isPitcher: boolean;
  positions: string[];
  priority: SlotPriority;
}

export const ROSTER_SLOT_SPECS: RosterSlotSpec[] = [
  { label: "C", isPitcher: false, positions: ["C"], priority: 1 },
  { label: "C", isPitcher: false, positions: ["C"], priority: 1 },
  { label: "1B", isPitcher: false, positions: ["1B"], priority: 1 },
  { label: "2B", isPitcher: false, positions: ["2B"], priority: 1 },
  { label: "3B", isPitcher: false, positions: ["3B"], priority: 1 },
  { label: "SS", isPitcher: false, positions: ["SS"], priority: 1 },
  { label: "CI", isPitcher: false, positions: ["1B", "3B"], priority: 2 },
  { label: "MI", isPitcher: false, positions: ["2B", "SS"], priority: 2 },
  { label: "OF", isPitcher: false, positions: ["OF"], priority: 1 },
  { label: "OF", isPitcher: false, positions: ["OF"], priority: 1 },
  { label: "OF", isPitcher: false, positions: ["OF"], priority: 1 },
  { label: "OF", isPitcher: false, positions: ["OF"], priority: 1 },
  { label: "OF", isPitcher: false, positions: ["OF"], priority: 1 },
  { label: "UT", isPitcher: false, positions: ["1B", "2B", "3B", "SS", "OF", "UT"], priority: 3 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  { label: "P", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
];

/**
 * Whether a player is eligible for a slot. Catchers are locked to catcher slots;
 * pitchers and hitters never cross the pitcher/batter divide.
 */
export function canPlayerFillSlot(player: Player, isPitcherSlot: boolean, positions: string[]): boolean {
  if (isPitcherSlot) return player.isPitcher;
  if (player.isPitcher) return false;
  if (player.positions.includes("C") && !positions.includes("C")) return false;
  return player.positions.some((position) => positions.includes(position));
}
