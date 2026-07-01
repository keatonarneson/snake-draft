import { Player } from "../types/draft";

export const ROSTER_SLOTS = [
  { label: "C", type: "batter", positions: ["C"] },
  { label: "C", type: "batter", positions: ["C"] },
  { label: "1B", type: "batter", positions: ["1B"] },
  { label: "2B", type: "batter", positions: ["2B"] },
  { label: "3B", type: "batter", positions: ["3B"] },
  { label: "SS", type: "batter", positions: ["SS"] },
  { label: "CI", type: "batter", positions: ["1B", "3B"] },
  { label: "MI", type: "batter", positions: ["2B", "SS"] },
  { label: "OF", type: "batter", positions: ["OF"] },
  { label: "OF", type: "batter", positions: ["OF"] },
  { label: "OF", type: "batter", positions: ["OF"] },
  { label: "OF", type: "batter", positions: ["OF"] },
  { label: "OF", type: "batter", positions: ["OF"] },
  { label: "UT", type: "batter", positions: ["1B", "2B", "3B", "SS", "OF", "UT"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
  { label: "P", type: "pitcher", positions: ["SP", "RP"] },
];

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
  if (slot.type === "pitcher") return player.isPitcher;
  if (player.isPitcher) return false;
  if (player.positions.includes("C") && !slot.positions.includes("C")) return false;
  return player.positions.some((position) => slot.positions.includes(position));
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
