import { Player } from "../types/draft";
import { canPlayerFillSlot, ROSTER_SLOT_SPECS } from "./rosterConfig";

/**
 * Fit players into active roster slots by descending value (auto-allocation for
 * engine scoring). Manual slot assignments are handled separately by
 * rosterSlots.buildRosterSlots.
 */
export function fitRoster(
  teamPlayers: Player[],
  _numRounds: number
): { active: Player[]; bench: Player[] } {
  void _numRounds;

  const activeSlots = ROSTER_SLOT_SPECS;

  const sortedPlayers = [...teamPlayers].sort((a, b) => b.value - a.value);
  const active: Player[] = [];
  const bench: Player[] = [];

  const filledSlots = new Set<number>();
  const canPlayerUseSlot = (player: Player, slot: typeof activeSlots[number]) =>
    canPlayerFillSlot(player, slot.isPitcher, slot.positions);

  for (const player of sortedPlayers) {
    let placed = false;

    // Pass 1: Try priority 1 slots
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 1 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (placed) continue;

    // Pass 2: Try priority 2 slots (CI, MI)
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 2 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (placed) continue;

    // Pass 3: Try priority 3 slots (UT)
    for (let i = 0; i < activeSlots.length; i++) {
      const slot = activeSlots[i];
      if (slot.priority === 3 && !filledSlots.has(i)) {
        if (canPlayerUseSlot(player, slot)) {
          active.push(player);
          filledSlots.add(i);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      bench.push(player);
    }
  }

  return { active, bench };
}

export function checkPositionalFit(
  teamPlayers: Player[],
  newPlayer: Player,
  numRounds: number
): { isBench: boolean } {
  const simulatedTeam = [...teamPlayers, newPlayer];
  const { bench } = fitRoster(simulatedTeam, numRounds);

  const isNewPlayerOnBench = bench.some(p => p.id === newPlayer.id);
  return {
    isBench: isNewPlayerOnBench,
  };
}

