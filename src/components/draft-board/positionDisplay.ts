import { Player } from "../../types/draft";

export interface PositionColor {
  bg: string;
  border: string;
  color: string;
}

const positionColors: Record<string, PositionColor> = {
  C: {
    bg: "rgba(16, 185, 129, 0.13)",
    border: "rgba(16, 185, 129, 0.34)",
    color: "#34d399",
  },
  "1B": {
    bg: "rgba(245, 158, 11, 0.13)",
    border: "rgba(245, 158, 11, 0.34)",
    color: "#fbbf24",
  },
  "2B": {
    bg: "rgba(236, 72, 153, 0.13)",
    border: "rgba(236, 72, 153, 0.34)",
    color: "#f472b6",
  },
  "3B": {
    bg: "rgba(249, 115, 22, 0.13)",
    border: "rgba(249, 115, 22, 0.34)",
    color: "#fb923c",
  },
  SS: {
    bg: "rgba(168, 85, 247, 0.13)",
    border: "rgba(168, 85, 247, 0.34)",
    color: "#c084fc",
  },
  OF: {
    bg: "rgba(20, 184, 166, 0.13)",
    border: "rgba(20, 184, 166, 0.34)",
    color: "#2dd4bf",
  },
  SP: {
    bg: "rgba(59, 130, 246, 0.13)",
    border: "rgba(59, 130, 246, 0.34)",
    color: "#60a5fa",
  },
  RP: {
    bg: "rgba(6, 182, 212, 0.13)",
    border: "rgba(6, 182, 212, 0.34)",
    color: "#22d3ee",
  },
  UT: {
    bg: "rgba(156, 163, 175, 0.09)",
    border: "rgba(156, 163, 175, 0.24)",
    color: "#d1d5db",
  },
  UTIL: {
    bg: "rgba(156, 163, 175, 0.09)",
    border: "rgba(156, 163, 175, 0.24)",
    color: "#d1d5db",
  },
};

export function getPrimaryPosition(player: Player) {
  if (player.isPitcher) {
    return player.positions.includes("RP") ? "RP" : "SP";
  }

  const hitterPriority = ["C", "SS", "2B", "3B", "1B", "OF", "UT"];
  return hitterPriority.find((pos) => player.positions.includes(pos)) || player.positions[0] || "UTIL";
}

export function getPositionColor(position: string) {
  return positionColors[position] || positionColors.UTIL;
}
