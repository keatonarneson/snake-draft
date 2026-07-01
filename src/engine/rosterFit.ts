import { Player } from "../types/draft";

/**
 * Fit players into active roster slots.
 */
export function fitRoster(
  teamPlayers: Player[],
  numRounds: number
): { active: Player[]; bench: Player[] } {
  const activeSlots = [
    // Specific hitter slots (Priority 1)
    { label: "C1", isPitcher: false, positions: ["C"], priority: 1 },
    { label: "C2", isPitcher: false, positions: ["C"], priority: 1 },
    { label: "1B", isPitcher: false, positions: ["1B"], priority: 1 },
    { label: "2B", isPitcher: false, positions: ["2B"], priority: 1 },
    { label: "3B", isPitcher: false, positions: ["3B"], priority: 1 },
    { label: "SS", isPitcher: false, positions: ["SS"], priority: 1 },
    { label: "OF1", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF2", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF3", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF4", isPitcher: false, positions: ["OF"], priority: 1 },
    { label: "OF5", isPitcher: false, positions: ["OF"], priority: 1 },

    // Semi-flexible hitter slots (Priority 2)
    { label: "CI", isPitcher: false, positions: ["1B", "3B"], priority: 2 },
    { label: "MI", isPitcher: false, positions: ["2B", "SS"], priority: 2 },

    // Fully flexible hitter slot (Priority 3)
    { label: "UT", isPitcher: false, positions: ["1B", "2B", "3B", "SS", "OF", "UT"], priority: 3 },

    // Pitchers slots (Priority 1)
    { label: "P1", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P2", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P3", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P4", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P5", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P6", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P7", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P8", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
    { label: "P9", isPitcher: true, positions: ["SP", "RP"], priority: 1 },
  ];

  const sortedPlayers = [...teamPlayers].sort((a, b) => b.value - a.value);
  const active: Player[] = [];
  const bench: Player[] = [];

  const filledSlots = new Set<number>();
  const canPlayerUseSlot = (player: Player, slot: typeof activeSlots[number]) => {
    if (player.isPitcher !== slot.isPitcher) return false;
    if (player.positions.includes("C") && !slot.positions.includes("C")) return false;
    return player.positions.some(pos => slot.positions.includes(pos));
  };

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
): { isBench: boolean; activePushedValue: number } {
  const simulatedTeam = [...teamPlayers, newPlayer];
  const { bench } = fitRoster(simulatedTeam, numRounds);
  
  const isNewPlayerOnBench = bench.some(p => p.id === newPlayer.id);
  return {
    isBench: isNewPlayerOnBench,
    activePushedValue: 0
  };
}

