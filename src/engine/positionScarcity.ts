import { Player } from "../types/draft";
import { calculateReturnProbability } from "./draftProbability";
import { isDraftableCloser } from "./playerRoles";

export interface ScarcityPlayerInfo {
  name: string;
  value: number;
  pReturn: number;
}

export interface MarketPressurePlayerInfo {
  name: string;
  adp: number;
  pReturn: number;
}

export interface ScarcityInfo {
  position: string;
  bestValueNow: number;
  expectedBestValueNext: number;
  valueDropOff: number;
  dropOff: number;
  remainingCount: number;
  bestPlayerNow?: { name: string; value: number };
  expectedPlayersNext?: ScarcityPlayerInfo[];
  marketPressureScore: number;
  marketPressureLevel: "low" | "medium" | "high";
  marketPlayersAtRisk: number;
  marketWatchlist?: MarketPressurePlayerInfo[];
  replacementValue: number;
  scarcityPressure: number;
  positionRankPremium: number;
  expectedBestRankNext: number;
}

export const POSITION_SLOTS: Record<string, number> = {
  C: 2.0,
  "1B": 1.5,
  "2B": 1.5,
  "3B": 1.5,
  SS: 1.5,
  OF: 5.75,
  SP: 6.5,
  RP: 2.5,
};

/*
 * Helper: Define roster slot configurations to compute total slot counts per position.
 * This mirrors the `activeSlots` definition used in `fitRoster`.
 */
const ACTIVE_SLOTS = [
  // Hitter slots (priority 1)
  { label: "C1", isPitcher: false, positions: ["C"] },
  { label: "C2", isPitcher: false, positions: ["C"] },
  { label: "1B", isPitcher: false, positions: ["1B"] },
  { label: "2B", isPitcher: false, positions: ["2B"] },
  { label: "3B", isPitcher: false, positions: ["3B"] },
  { label: "SS", isPitcher: false, positions: ["SS"] },
  { label: "OF1", isPitcher: false, positions: ["OF"] },
  { label: "OF2", isPitcher: false, positions: ["OF"] },
  { label: "OF3", isPitcher: false, positions: ["OF"] },
  { label: "OF4", isPitcher: false, positions: ["OF"] },
  { label: "OF5", isPitcher: false, positions: ["OF"] },
  // Semiâ€‘flex slots (priority 2)
  { label: "CI", isPitcher: false, positions: ["1B", "3B"] },
  { label: "MI", isPitcher: false, positions: ["2B", "SS"] },
  // Fully flexible hitter slot (priority 3)
  { label: "UT", isPitcher: false, positions: ["C", "1B", "2B", "3B", "SS", "OF", "UT"] },
  // Pitcher slots (priority 1)
  { label: "P1", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P2", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P3", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P4", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P5", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P6", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P7", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P8", isPitcher: true, positions: ["SP", "RP"] },
  { label: "P9", isPitcher: true, positions: ["SP", "RP"] },
];

export function calculatePositionScarcity(
  allPlayers: Player[],
  availablePlayers: Player[],
  pCurr: number,
  pNext: number,
  positions: string[],
  rankScarcityCoeff: number = 0.12,
  numTeams: number = 12
): Record<string, ScarcityInfo> {

  const scarcity: Record<string, ScarcityInfo> = {};

  const matchesScarcityPosition = (player: Player, pos: string) => {
    if (!player.positions.includes(pos)) return false;
    return pos !== "RP" || isDraftableCloser(player);
  };

  positions.forEach((pos) => {
    const posPlayers = availablePlayers
      .filter((p) => matchesScarcityPosition(p, pos))
      .sort((a, b) => b.value - a.value);

    // Calculate replacement value dynamically based on all league players of this position
    const allPosPlayers = allPlayers
      .filter((p) => matchesScarcityPosition(p, pos))
      .sort((a, b) => b.value - a.value);

    const slots = POSITION_SLOTS[pos] || 1;
    const replacementIndex = numTeams * slots;
    let replacementValue = 0.0;
    if (allPosPlayers.length > 0) {
      const idx = Math.min(allPosPlayers.length - 1, replacementIndex);
      replacementValue = allPosPlayers[idx].value;
    }

    if (posPlayers.length === 0) {
      scarcity[pos] = {
        position: pos,
        bestValueNow: -10,
        expectedBestValueNext: -10,
        valueDropOff: 0,
        dropOff: 0,
        remainingCount: 0,
        marketPressureScore: 0,
        marketPressureLevel: "low",
        marketPlayersAtRisk: 0,
        marketWatchlist: [],
        replacementValue,
        scarcityPressure: 0.5,
        positionRankPremium: 0,
        expectedBestRankNext: 0,
      };
      return;
    }

    const bestValueNow = posPlayers[0].value;
    const bestPlayerNow = { name: posPlayers[0].name, value: posPlayers[0].value };

    const expectedPlayersNext: ScarcityPlayerInfo[] = [];
    for (let idx = 0; idx < Math.min(4, posPlayers.length); idx++) {
      const player = posPlayers[idx];
      const pReturn = calculateReturnProbability(pCurr, pNext, player);
      expectedPlayersNext.push({
        name: player.name,
        value: player.value,
        pReturn,
      });
    }
    
    // Probabilistic Expected Value and Rank of the Best Player available at pNext
    let expectedBestValueNext = 0;
    let expectedBestRankNext = 0;
    let probAccum = 1.0; // P(all better players are gone)

    for (let idx = 0; idx < posPlayers.length; idx++) {
      const player = posPlayers[idx];
      const pReturn = calculateReturnProbability(pCurr, pNext, player);
      
      expectedBestValueNext += player.value * pReturn * probAccum;
      expectedBestRankNext += idx * pReturn * probAccum;
      
      probAccum *= (1.0 - pReturn);
      
      // Optimization: if the probability that we have to look further down is tiny, stop
      if (probAccum < 0.0001) {
        break;
      }
    }

    // Fallback: if there's still a probability that all players are gone,
    // we assume we have to settle for the worst remaining player's value and rank
    if (probAccum > 0.0) {
      const fallbackValue = posPlayers[posPlayers.length - 1].value;
      expectedBestValueNext += fallbackValue * probAccum;
      
      const fallbackRank = posPlayers.length;
      expectedBestRankNext += fallbackRank * probAccum;
    }

    const valueDropOff = Math.max(0, bestValueNow - expectedBestValueNext);
    const rankDropOff = expectedBestRankNext;

    // Remaining demand
    const draftedCount = allPosPlayers.length - posPlayers.length;
    const remainingDemand = Math.max(0, (numTeams * slots) - draftedCount);

    // Viable supply remaining
    const viableSupply = posPlayers.filter((p) => p.value >= replacementValue).length;

    // Scarcity pressure clamped between 0.5 and 2.0
    const scarcityPressure = Math.min(2.0, Math.max(0.5, remainingDemand / Math.max(1, viableSupply)));

    // Position rank premium capped at $2.00
    const rankPremiumCap = 2.00;
    const positionRankPremium = Math.min(rankPremiumCap, rankDropOff * rankScarcityCoeff * scarcityPressure);

    // Combined dropOff for the best player at this position (qualityWeight = 1.0)
    const dropOff = valueDropOff + positionRankPremium;
    const marketCandidates = posPlayers
      .filter((p) => p.value >= replacementValue)
      .sort((a, b) => a.adp - b.adp)
      .slice(0, 8);
    const marketPlayersAtRisk = marketCandidates.reduce((sum, player) => {
      return sum + (1.0 - calculateReturnProbability(pCurr, pNext, player));
    }, 0);
    const marketWatchlist = marketCandidates.slice(0, 4).map((player) => ({
      name: player.name,
      adp: player.adp,
      pReturn: calculateReturnProbability(pCurr, pNext, player),
    }));
    const marketPressureScore = Math.min(3.0, marketPlayersAtRisk);
    const topMarketReturn = marketWatchlist[0]?.pReturn ?? 1.0;
    const marketPressureLevel =
      marketPlayersAtRisk >= 2.25 || topMarketReturn < 0.25
        ? "high"
        : marketPlayersAtRisk >= 1.0 || topMarketReturn < 0.55
          ? "medium"
          : "low";
    scarcity[pos] = {
      position: pos,
      bestValueNow,
      expectedBestValueNext,
      valueDropOff,
      dropOff,
      remainingCount: posPlayers.length,
      bestPlayerNow,
      expectedPlayersNext,
      marketPressureScore,
      marketPressureLevel,
      marketPlayersAtRisk,
      marketWatchlist,
      replacementValue,
      scarcityPressure,
      positionRankPremium,
      expectedBestRankNext,
    };
  });

  return scarcity;
}

