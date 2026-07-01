export interface PlayerStats {
  // Batting
  AB?: number;
  R?: number;
  HR?: number;
  RBI?: number;
  SB?: number;
  AVG?: number;
  // Pitching
  IP?: number;
  W?: number;
  SV?: number;
  SO?: number;
  ERA?: number;
  WHIP?: number;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  positions: string[];
  adp: number;
  minPick: number;
  maxPick: number;
  value: number;
  consensusValue?: number;
  maxSystemValue?: number;
  stats: PlayerStats;
  isPitcher: boolean;
}
