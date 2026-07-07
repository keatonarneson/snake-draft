import { Player } from "../types/draft";
import { canPlayerFillSlot, ROSTER_SLOT_SPECS } from "./rosterConfig";

// Display-oriented view of the shared slot layout (see rosterConfig).
export const ROSTER_SLOTS = ROSTER_SLOT_SPECS.map((slot) => ({
  label: slot.label,
  type: slot.isPitcher ? "pitcher" : "batter",
  positions: slot.positions,
}));

export type RosterSlotDefinition = typeof ROSTER_SLOTS[number];
export type SlotAssignment = string | "bench";

export interface RosterSlot {
  id: string;
  label: string;
  type: string;
  positions?: string[];
  player: Player | null;
}

export interface BuiltRoster {
  active: RosterSlot[];
  bench: RosterSlot[];
}

export const SLOT_DISPLAY_LABELS = ROSTER_SLOTS.map((slot, index) => {
  const matchingSlots = ROSTER_SLOTS
    .slice(0, index + 1)
    .filter((candidate) => candidate.label === slot.label).length;
  const totalMatchingSlots = ROSTER_SLOTS.filter((candidate) => candidate.label === slot.label).length;

  return totalMatchingSlots > 1 ? `${slot.label} ${matchingSlots}` : slot.label;
});

export function canPlayerUseRosterSlot(player: Player, slot: RosterSlotDefinition): boolean {
  return canPlayerFillSlot(player, slot.type === "pitcher", slot.positions);
}

export function buildRosterSlots(
  draftedPlayers: Player[],
  numRounds: number,
  slotAssignments: Record<string, SlotAssignment>
): BuiltRoster {
  const slots: RosterSlot[] = ROSTER_SLOTS.map((slot, index) => ({
    id: `slot-${index}`,
    label: slot.label,
    type: slot.type,
    positions: slot.positions,
    player: null,
  }));

  const bench: Player[] = [];
  const manuallyBenched = new Set(
    draftedPlayers
      .filter((player) => slotAssignments[player.id] === "bench")
      .map((player) => player.id)
  );
  const manuallyPlaced = new Set<string>();

  draftedPlayers.forEach((player) => {
    const assignedSlotId = slotAssignments[player.id];
    if (!assignedSlotId || assignedSlotId === "bench") return;

    const slot = slots.find((candidate) => candidate.id === assignedSlotId);
    const slotDefinition = slot ? ROSTER_SLOTS[Number(slot.id.replace("slot-", ""))] : undefined;
    if (slot && slotDefinition && !slot.player && canPlayerUseRosterSlot(player, slotDefinition)) {
      slot.player = player;
      manuallyPlaced.add(player.id);
    }
  });

  const unplaced = draftedPlayers.filter(
    (player) => !manuallyPlaced.has(player.id) && !manuallyBenched.has(player.id)
  );
  const canPlayerUseSlot = (player: Player, slot: RosterSlot) => {
    const slotIndex = Number(slot.id.replace("slot-", ""));
    return canPlayerUseRosterSlot(player, ROSTER_SLOTS[slotIndex]);
  };

  for (let i = 0; i < unplaced.length; i++) {
    const player = unplaced[i];
    let placed = false;

    for (const slot of slots) {
      if (slot.player === null && slot.label !== "UT" && slot.label !== "CI" && slot.label !== "MI" && slot.label !== "P") {
        if (canPlayerUseSlot(player, slot)) {
          slot.player = player;
          placed = true;
          break;
        }
      }
    }

    if (placed) {
      unplaced.splice(i, 1);
      i--;
    }
  }

  for (let i = 0; i < unplaced.length; i++) {
    const player = unplaced[i];
    let placed = false;

    for (const slot of slots) {
      if (slot.player === null && (slot.label === "CI" || slot.label === "MI")) {
        if (canPlayerUseSlot(player, slot)) {
          slot.player = player;
          placed = true;
          break;
        }
      }
    }

    if (placed) {
      unplaced.splice(i, 1);
      i--;
    }
  }

  for (let i = 0; i < unplaced.length; i++) {
    const player = unplaced[i];
    let placed = false;

    for (const slot of slots) {
      if (slot.player === null) {
        if (slot.label === "UT" && !player.isPitcher && canPlayerUseSlot(player, slot)) {
          slot.player = player;
          placed = true;
          break;
        }
        if (slot.label === "P" && player.isPitcher) {
          slot.player = player;
          placed = true;
          break;
        }
      }
    }

    if (placed) {
      unplaced.splice(i, 1);
      i--;
    }
  }

  bench.push(
    ...draftedPlayers.filter((player) => manuallyBenched.has(player.id)),
    ...unplaced
  );

  const numActiveSlots = slots.length;
  const numBenchSlotsNeeded = Math.max(0, numRounds - numActiveSlots);
  const benchSlots: RosterSlot[] = [];

  for (let i = 0; i < numBenchSlotsNeeded; i++) {
    benchSlots.push({
      id: `bench-${i}`,
      label: "BN",
      type: "bench",
      player: bench[i] || null,
    });
  }

  return { active: slots, bench: benchSlots };
}
