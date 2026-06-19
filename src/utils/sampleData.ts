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
  value: number; // FanGraphs Auction Value ($)
  consensusValue?: number; // Consensus Projection Value ($) for CPU drafting
  maxSystemValue?: number; // Maximum value across all loaded systems for upside calculations
  stats: PlayerStats;
  isPitcher: boolean;
}

const basePlayers: Omit<Player, "id">[] = [
  // Round 1
  { name: "Ronald Acuña Jr.", team: "ATL", positions: ["OF"], adp: 1.2, minPick: 1, maxPick: 3, value: 44.0, isPitcher: false, stats: { AB: 600, R: 120, HR: 35, RBI: 95, SB: 55, AVG: 0.295 } },
  { name: "Bobby Witt Jr.", team: "KC", positions: ["SS"], adp: 2.1, minPick: 1, maxPick: 4, value: 42.0, isPitcher: false, stats: { AB: 620, R: 115, HR: 32, RBI: 98, SB: 48, AVG: 0.288 } },
  { name: "Shohei Ohtani", team: "LAD", positions: ["UT"], adp: 3.5, minPick: 2, maxPick: 7, value: 40.0, isPitcher: false, stats: { AB: 580, R: 110, HR: 44, RBI: 105, SB: 22, AVG: 0.290 } },
  { name: "Aaron Judge", team: "NYY", positions: ["OF"], adp: 4.8, minPick: 2, maxPick: 9, value: 38.0, isPitcher: false, stats: { AB: 540, R: 105, HR: 46, RBI: 110, SB: 5, AVG: 0.278 } },
  { name: "Julio Rodríguez", team: "SEA", positions: ["OF"], adp: 5.5, minPick: 3, maxPick: 11, value: 36.0, isPitcher: false, stats: { AB: 610, R: 100, HR: 32, RBI: 95, SB: 36, AVG: 0.275 } },
  { name: "Mookie Betts", team: "LAD", positions: ["2B", "SS", "OF"], adp: 6.2, minPick: 4, maxPick: 10, value: 35.0, isPitcher: false, stats: { AB: 590, R: 112, HR: 29, RBI: 88, SB: 14, AVG: 0.298 } },
  { name: "Corbin Carroll", team: "ARI", positions: ["OF"], adp: 7.8, minPick: 5, maxPick: 12, value: 34.0, isPitcher: false, stats: { AB: 585, R: 108, HR: 23, RBI: 75, SB: 46, AVG: 0.272 } },
  { name: "Kyle Tucker", team: "HOU", positions: ["OF"], adp: 8.9, minPick: 6, maxPick: 14, value: 33.0, isPitcher: false, stats: { AB: 570, R: 98, HR: 30, RBI: 102, SB: 26, AVG: 0.282 } },
  { name: "Freddie Freeman", team: "LAD", positions: ["1B"], adp: 10.1, minPick: 8, maxPick: 15, value: 32.0, isPitcher: false, stats: { AB: 605, R: 110, HR: 25, RBI: 95, SB: 10, AVG: 0.312 } },
  { name: "Spencer Strider", team: "ATL", positions: ["SP"], adp: 11.5, minPick: 7, maxPick: 18, value: 31.0, isPitcher: true, stats: { IP: 180, W: 17, SV: 0, SO: 260, ERA: 3.15, WHIP: 1.04 } },
  { name: "Gunnar Henderson", team: "BAL", positions: ["3B", "SS"], adp: 13.2, minPick: 9, maxPick: 20, value: 29.0, isPitcher: false, stats: { AB: 595, R: 102, HR: 28, RBI: 85, SB: 12, AVG: 0.268 } },
  { name: "Elly De La Cruz", team: "CIN", positions: ["3B", "SS"], adp: 12.5, minPick: 6, maxPick: 21, value: 30.0, isPitcher: false, stats: { AB: 560, R: 90, HR: 22, RBI: 70, SB: 58, AVG: 0.245 } },

  // Round 2
  { name: "Juan Soto", team: "NYY", positions: ["OF"], adp: 14.1, minPick: 10, maxPick: 19, value: 28.0, isPitcher: false, stats: { AB: 565, R: 105, HR: 32, RBI: 90, SB: 8, AVG: 0.285 } },
  { name: "Jose Ramirez", team: "CLE", positions: ["3B"], adp: 15.5, minPick: 11, maxPick: 22, value: 27.0, isPitcher: false, stats: { AB: 600, R: 92, HR: 26, RBI: 96, SB: 24, AVG: 0.278 } },
  { name: "Yordan Alvarez", team: "HOU", positions: ["OF"], adp: 16.8, minPick: 12, maxPick: 24, value: 26.0, isPitcher: false, stats: { AB: 520, R: 90, HR: 34, RBI: 100, SB: 0, AVG: 0.296 } },
  { name: "Corbin Burnes", team: "BAL", positions: ["SP"], adp: 18.0, minPick: 13, maxPick: 25, value: 25.0, isPitcher: true, stats: { IP: 195, W: 14, SV: 0, SO: 210, ERA: 3.32, WHIP: 1.08 } },
  { name: "Bryce Harper", team: "PHI", positions: ["1B"], adp: 19.5, minPick: 14, maxPick: 27, value: 24.0, isPitcher: false, stats: { AB: 545, R: 95, HR: 28, RBI: 90, SB: 12, AVG: 0.286 } },
  { name: "Rafael Devers", team: "BOS", positions: ["3B"], adp: 20.8, minPick: 15, maxPick: 29, value: 23.0, isPitcher: false, stats: { AB: 580, R: 92, HR: 31, RBI: 98, SB: 4, AVG: 0.280 } },
  { name: "Zack Wheeler", team: "PHI", positions: ["SP"], adp: 22.1, minPick: 17, maxPick: 31, value: 22.5, isPitcher: true, stats: { IP: 200, W: 15, SV: 0, SO: 215, ERA: 3.20, WHIP: 1.05 } },
  { name: "Matt Olson", team: "ATL", positions: ["1B"], adp: 23.5, minPick: 18, maxPick: 34, value: 22.0, isPitcher: false, stats: { AB: 600, R: 98, HR: 38, RBI: 110, SB: 1, AVG: 0.262 } },
  { name: "Francisco Lindor", team: "NYM", positions: ["SS"], adp: 25.0, minPick: 19, maxPick: 35, value: 21.5, isPitcher: false, stats: { AB: 610, R: 96, HR: 26, RBI: 85, SB: 26, AVG: 0.258 } },
  { name: "Trea Turner", team: "PHI", positions: ["SS"], adp: 26.2, minPick: 20, maxPick: 36, value: 21.0, isPitcher: false, stats: { AB: 600, R: 98, HR: 20, RBI: 76, SB: 32, AVG: 0.282 } },
  { name: "Adolis García", team: "TEX", positions: ["OF"], adp: 28.0, minPick: 21, maxPick: 39, value: 20.0, isPitcher: false, stats: { AB: 565, R: 88, HR: 32, RBI: 95, SB: 11, AVG: 0.246 } },
  { name: "Austin Riley", team: "ATL", positions: ["3B"], adp: 29.5, minPick: 22, maxPick: 41, value: 19.5, isPitcher: false, stats: { AB: 610, R: 95, HR: 31, RBI: 94, SB: 1, AVG: 0.276 } },

  // Round 3
  { name: "Corey Seager", team: "TEX", positions: ["SS"], adp: 31.0, minPick: 23, maxPick: 45, value: 19.0, isPitcher: false, stats: { AB: 520, R: 88, HR: 28, RBI: 88, SB: 2, AVG: 0.301 } },
  { name: "Tarik Skubal", team: "DET", positions: ["SP"], adp: 32.5, minPick: 25, maxPick: 46, value: 18.5, isPitcher: true, stats: { IP: 175, W: 13, SV: 0, SO: 205, ERA: 3.10, WHIP: 1.02 } },
  { name: "George Kirby", team: "SEA", positions: ["SP"], adp: 34.0, minPick: 26, maxPick: 48, value: 18.0, isPitcher: true, stats: { IP: 190, W: 14, SV: 0, SO: 185, ERA: 3.28, WHIP: 1.04 } },
  { name: "Kevin Gausman", team: "TOR", positions: ["SP"], adp: 35.8, minPick: 27, maxPick: 50, value: 17.5, isPitcher: true, stats: { IP: 185, W: 12, SV: 0, SO: 218, ERA: 3.42, WHIP: 1.12 } },
  { name: "Pete Alonso", team: "NYM", positions: ["1B"], adp: 37.5, minPick: 29, maxPick: 53, value: 17.0, isPitcher: false, stats: { AB: 570, R: 86, HR: 36, RBI: 98, SB: 2, AVG: 0.240 } },
  { name: "Marcus Semien", team: "TEX", positions: ["2B"], adp: 39.0, minPick: 30, maxPick: 55, value: 16.5, isPitcher: false, stats: { AB: 640, R: 104, HR: 22, RBI: 80, SB: 10, AVG: 0.265 } },
  { name: "Ozzie Albies", team: "ATL", positions: ["2B"], adp: 40.5, minPick: 31, maxPick: 57, value: 16.0, isPitcher: false, stats: { AB: 605, R: 90, HR: 25, RBI: 88, SB: 13, AVG: 0.270 } },
  { name: "Yoshinobu Yamamoto", team: "LAD", positions: ["SP"], adp: 42.0, minPick: 32, maxPick: 60, value: 15.5, isPitcher: true, stats: { IP: 165, W: 13, SV: 0, SO: 180, ERA: 3.18, WHIP: 1.08 } },
  { name: "Michael Harris II", team: "ATL", positions: ["OF"], adp: 43.0, minPick: 32, maxPick: 61, value: 15.2, isPitcher: false, stats: { AB: 570, R: 85, HR: 20, RBI: 75, SB: 22, AVG: 0.285 } },
  { name: "Pablo López", team: "MIN", positions: ["SP"], adp: 44.0, minPick: 33, maxPick: 62, value: 15.0, isPitcher: true, stats: { IP: 190, W: 13, SV: 0, SO: 220, ERA: 3.48, WHIP: 1.10 } },
  { name: "Luis Castillo", team: "SEA", positions: ["SP"], adp: 45.8, minPick: 35, maxPick: 65, value: 14.5, isPitcher: true, stats: { IP: 195, W: 13, SV: 0, SO: 208, ERA: 3.45, WHIP: 1.11 } },
  { name: "Zac Gallen", team: "ARI", positions: ["SP"], adp: 47.5, minPick: 36, maxPick: 68, value: 14.0, isPitcher: true, stats: { IP: 190, W: 14, SV: 0, SO: 195, ERA: 3.55, WHIP: 1.13 } },

  // Round 4
  { name: "Cole Ragans", team: "KC", positions: ["SP"], adp: 48.0, minPick: 34, maxPick: 69, value: 13.8, isPitcher: true, stats: { IP: 170, W: 11, SV: 0, SO: 198, ERA: 3.38, WHIP: 1.14 } },
  { name: "Logan Webb", team: "SF", positions: ["SP"], adp: 49.0, minPick: 37, maxPick: 70, value: 13.5, isPitcher: true, stats: { IP: 210, W: 13, SV: 0, SO: 180, ERA: 3.25, WHIP: 1.09 } },
  { name: "Grayson Rodriguez", team: "BAL", positions: ["SP"], adp: 50.0, minPick: 36, maxPick: 71, value: 13.2, isPitcher: true, stats: { IP: 170, W: 12, SV: 0, SO: 185, ERA: 3.60, WHIP: 1.16 } },
  { name: "Tyler Glasnow", team: "LAD", positions: ["SP"], adp: 51.0, minPick: 38, maxPick: 73, value: 13.0, isPitcher: true, stats: { IP: 145, W: 11, SV: 0, SO: 190, ERA: 3.30, WHIP: 1.06 } },
  { name: "Freddy Peralta", team: "MIL", positions: ["SP"], adp: 52.8, minPick: 39, maxPick: 75, value: 12.5, isPitcher: true, stats: { IP: 170, W: 11, SV: 0, SO: 205, ERA: 3.72, WHIP: 1.14 } },
  { name: "Royce Lewis", team: "MIN", positions: ["3B"], adp: 54.5, minPick: 40, maxPick: 80, value: 12.0, isPitcher: false, stats: { AB: 460, R: 75, HR: 26, RBI: 80, SB: 10, AVG: 0.278 } },
  { name: "Emmanuel Clase", team: "CLE", positions: ["RP"], adp: 56.0, minPick: 42, maxPick: 78, value: 11.5, isPitcher: true, stats: { IP: 70, W: 4, SV: 42, SO: 75, ERA: 2.10, WHIP: 0.98 } },
  { name: "Josh Hader", team: "HOU", positions: ["RP"], adp: 57.5, minPick: 43, maxPick: 81, value: 11.0, isPitcher: true, stats: { IP: 60, W: 3, SV: 35, SO: 88, ERA: 2.30, WHIP: 1.02 } },
  { name: "Devin Williams", team: "MIL", positions: ["RP"], adp: 59.2, minPick: 44, maxPick: 83, value: 10.5, isPitcher: true, stats: { IP: 60, W: 3, SV: 33, SO: 85, ERA: 2.25, WHIP: 1.01 } },
  { name: "Adley Rutschman", team: "BAL", positions: ["C"], adp: 61.0, minPick: 45, maxPick: 86, value: 10.0, isPitcher: false, stats: { AB: 540, R: 82, HR: 20, RBI: 78, SB: 1, AVG: 0.275 } },
  { name: "William Contreras", team: "MIL", positions: ["C"], adp: 63.0, minPick: 47, maxPick: 89, value: 9.5, isPitcher: false, stats: { AB: 530, R: 78, HR: 18, RBI: 75, SB: 5, AVG: 0.278 } },
  { name: "J.T. Realmuto", team: "PHI", positions: ["C"], adp: 65.0, minPick: 48, maxPick: 92, value: 9.0, isPitcher: false, stats: { AB: 480, R: 68, HR: 17, RBI: 66, SB: 13, AVG: 0.252 } },

  // Round 5 & 6
  { name: "Randy Arozarena", team: "TB", positions: ["OF"], adp: 68.0, minPick: 50, maxPick: 96, value: 8.2, isPitcher: false, stats: { AB: 550, R: 85, HR: 21, RBI: 78, SB: 20, AVG: 0.254 } },
  { name: "Cody Bellinger", team: "CHC", positions: ["1B", "OF"], adp: 69.0, minPick: 52, maxPick: 98, value: 8.0, isPitcher: false, stats: { AB: 540, R: 80, HR: 24, RBI: 82, SB: 16, AVG: 0.270 } },
  { name: "Bryan Reynolds", team: "PIT", positions: ["OF"], adp: 71.0, minPick: 54, maxPick: 100, value: 7.5, isPitcher: false, stats: { AB: 580, R: 84, HR: 22, RBI: 80, SB: 8, AVG: 0.268 } },
  { name: "Luis Robert Jr.", team: "CWS", positions: ["OF"], adp: 72.0, minPick: 53, maxPick: 102, value: 7.2, isPitcher: false, stats: { AB: 510, R: 78, HR: 28, RBI: 72, SB: 22, AVG: 0.250 } },
  { name: "Christian Walker", team: "ARI", positions: ["1B"], adp: 73.0, minPick: 55, maxPick: 103, value: 7.0, isPitcher: false, stats: { AB: 560, R: 78, HR: 29, RBI: 90, SB: 2, AVG: 0.258 } },
  { name: "Christian Yelich", team: "MIL", positions: ["OF"], adp: 75.0, minPick: 56, maxPick: 106, value: 6.5, isPitcher: false, stats: { AB: 520, R: 85, HR: 17, RBI: 68, SB: 25, AVG: 0.275 } },
  { name: "Oneil Cruz", team: "PIT", positions: ["SS"], adp: 77.0, minPick: 58, maxPick: 109, value: 6.0, isPitcher: false, stats: { AB: 530, R: 78, HR: 22, RBI: 68, SB: 24, AVG: 0.248 } },
  { name: "Raisel Iglesias", team: "ATL", positions: ["RP"], adp: 78.0, minPick: 58, maxPick: 110, value: 5.8, isPitcher: true, stats: { IP: 62, W: 3, SV: 31, SO: 72, ERA: 2.65, WHIP: 1.05 } },
  { name: "CJ Abrams", team: "WSH", positions: ["SS"], adp: 79.0, minPick: 59, maxPick: 112, value: 5.5, isPitcher: false, stats: { AB: 590, R: 82, HR: 15, RBI: 60, SB: 38, AVG: 0.252 } },
  { name: "Jhoan Duran", team: "MIN", positions: ["RP"], adp: 80.0, minPick: 60, maxPick: 113, value: 5.2, isPitcher: true, stats: { IP: 60, W: 3, SV: 28, SO: 78, ERA: 2.55, WHIP: 1.06 } },
  { name: "Anthony Volpe", team: "NYY", positions: ["SS"], adp: 81.0, minPick: 60, maxPick: 115, value: 5.0, isPitcher: false, stats: { AB: 580, R: 80, HR: 19, RBI: 64, SB: 26, AVG: 0.242 } },
  { name: "Andrés Muñoz", team: "SEA", positions: ["RP"], adp: 82.0, minPick: 61, maxPick: 116, value: 4.8, isPitcher: true, stats: { IP: 60, W: 3, SV: 28, SO: 82, ERA: 2.70, WHIP: 1.08 } },

  // Round 7+
  { name: "Paul Goldschmidt", team: "STL", positions: ["1B"], adp: 83.0, minPick: 62, maxPick: 118, value: 4.5, isPitcher: false, stats: { AB: 560, R: 76, HR: 20, RBI: 75, SB: 5, AVG: 0.258 } },
  { name: "Jarren Duran", team: "BOS", positions: ["OF"], adp: 84.0, minPick: 63, maxPick: 120, value: 4.4, isPitcher: false, stats: { AB: 520, R: 80, HR: 12, RBI: 55, SB: 32, AVG: 0.272 } },
  { name: "Manny Machado", team: "SD", positions: ["3B"], adp: 85.0, minPick: 63, maxPick: 121, value: 4.0, isPitcher: false, stats: { AB: 550, R: 75, HR: 25, RBI: 84, SB: 3, AVG: 0.264 } },
  { name: "Camilo Doval", team: "SF", positions: ["RP"], adp: 86.0, minPick: 64, maxPick: 122, value: 3.8, isPitcher: true, stats: { IP: 65, W: 3, SV: 33, SO: 80, ERA: 2.90, WHIP: 1.14 } },
  { name: "Alex Bregman", team: "HOU", positions: ["3B"], adp: 87.0, minPick: 65, maxPick: 124, value: 3.5, isPitcher: false, stats: { AB: 580, R: 85, HR: 20, RBI: 80, SB: 2, AVG: 0.268 } },
  { name: "Will Smith", team: "LAD", positions: ["C"], adp: 88.0, minPick: 66, maxPick: 125, value: 3.4, isPitcher: false, stats: { AB: 470, R: 72, HR: 18, RBI: 72, SB: 1, AVG: 0.260 } },
  { name: "Nolan Jones", team: "COL", positions: ["OF"], adp: 89.0, minPick: 66, maxPick: 127, value: 3.0, isPitcher: false, stats: { AB: 500, R: 74, HR: 18, RBI: 70, SB: 18, AVG: 0.252 } },
  { name: "Spencer Steer", team: "CIN", positions: ["1B", "2B", "3B", "OF"], adp: 90.0, minPick: 68, maxPick: 128, value: 2.8, isPitcher: false, stats: { AB: 560, R: 80, HR: 20, RBI: 82, SB: 14, AVG: 0.260 } },
  { name: "Bryan Woo", team: "SEA", positions: ["SP"], adp: 91.0, minPick: 68, maxPick: 130, value: 2.5, isPitcher: true, stats: { IP: 140, W: 9, SV: 0, SO: 135, ERA: 3.52, WHIP: 1.12 } },
  { name: "Nico Hoerner", team: "CHC", positions: ["2B"], adp: 92.0, minPick: 69, maxPick: 131, value: 2.4, isPitcher: false, stats: { AB: 580, R: 82, HR: 8, RBI: 62, SB: 30, AVG: 0.276 } },
  { name: "Bryce Miller", team: "SEA", positions: ["SP"], adp: 93.0, minPick: 70, maxPick: 133, value: 2.0, isPitcher: true, stats: { IP: 160, W: 10, SV: 0, SO: 145, ERA: 3.78, WHIP: 1.14 } },
  { name: "Ha-Seong Kim", team: "SD", positions: ["2B", "3B", "SS"], adp: 94.0, minPick: 70, maxPick: 134, value: 2.1, isPitcher: false, stats: { AB: 530, R: 78, HR: 14, RBI: 58, SB: 28, AVG: 0.256 } },
  { name: "Shota Imanaga", team: "CHC", positions: ["SP"], adp: 95.0, minPick: 72, maxPick: 136, value: 1.5, isPitcher: true, stats: { IP: 160, W: 11, SV: 0, SO: 155, ERA: 3.62, WHIP: 1.11 } },
  { name: "Cal Raleigh", team: "SEA", positions: ["C"], adp: 96.0, minPick: 71, maxPick: 138, value: 1.2, isPitcher: false, stats: { AB: 460, R: 60, HR: 28, RBI: 75, SB: 0, AVG: 0.215 } },
  { name: "Seiya Suzuki", team: "CHC", positions: ["OF"], adp: 97.0, minPick: 73, maxPick: 139, value: 1.1, isPitcher: false, stats: { AB: 510, R: 74, HR: 19, RBI: 72, SB: 8, AVG: 0.272 } },
  { name: "Paul Sewald", team: "ARI", positions: ["RP"], adp: 98.0, minPick: 74, maxPick: 140, value: 1.0, isPitcher: true, stats: { IP: 60, W: 2, SV: 26, SO: 70, ERA: 3.10, WHIP: 1.10 } },
  { name: "Gleyber Torres", team: "NYY", positions: ["2B"], adp: 100.0, minPick: 75, maxPick: 142, value: 0.8, isPitcher: false, stats: { AB: 560, R: 78, HR: 18, RBI: 66, SB: 8, AVG: 0.260 } },
  { name: "Teoscar Hernández", team: "LAD", positions: ["OF"], adp: 101.0, minPick: 76, maxPick: 143, value: 0.7, isPitcher: false, stats: { AB: 540, R: 70, HR: 24, RBI: 80, SB: 5, AVG: 0.252 } },
  { name: "Alexis Díaz", team: "CIN", positions: ["RP"], adp: 102.0, minPick: 78, maxPick: 144, value: 0.5, isPitcher: true, stats: { IP: 62, W: 3, SV: 30, SO: 76, ERA: 3.20, WHIP: 1.18 } },
  { name: "Bryson Stott", team: "PHI", positions: ["2B"], adp: 104.0, minPick: 78, maxPick: 146, value: 0.4, isPitcher: false, stats: { AB: 540, R: 72, HR: 12, RBI: 58, SB: 24, AVG: 0.260 } },
  { name: "Josh Jung", team: "TEX", positions: ["3B"], adp: 105.0, minPick: 80, maxPick: 148, value: 0.3, isPitcher: false, stats: { AB: 480, R: 68, HR: 20, RBI: 70, SB: 1, AVG: 0.262 } },
  { name: "Clay Holmes", team: "NYY", positions: ["RP"], adp: 106.0, minPick: 80, maxPick: 150, value: 0.2, isPitcher: true, stats: { IP: 63, W: 3, SV: 27, SO: 68, ERA: 2.95, WHIP: 1.14 } },
  { name: "Nolan Arenado", team: "STL", positions: ["3B"], adp: 108.0, minPick: 82, maxPick: 152, value: 0.1, isPitcher: false, stats: { AB: 550, R: 68, HR: 19, RBI: 78, SB: 0, AVG: 0.264 } },
  { name: "Tanner Scott", team: "MIA", positions: ["RP"], adp: 110.0, minPick: 83, maxPick: 155, value: 0.0, isPitcher: true, stats: { IP: 62, W: 3, SV: 24, SO: 80, ERA: 2.80, WHIP: 1.16 } },
  { name: "Lane Thomas", team: "WSH", positions: ["OF"], adp: 112.0, minPick: 84, maxPick: 158, value: -0.2, isPitcher: false, stats: { AB: 550, R: 75, HR: 18, RBI: 64, SB: 18, AVG: 0.252 } },
  { name: "Nick Castellanos", team: "PHI", positions: ["OF"], adp: 114.0, minPick: 86, maxPick: 160, value: -0.5, isPitcher: false, stats: { AB: 570, R: 72, HR: 20, RBI: 76, SB: 3, AVG: 0.258 } },
  { name: "Ke'Bryan Hayes", team: "PIT", positions: ["3B"], adp: 115.0, minPick: 88, maxPick: 162, value: -0.8, isPitcher: false, stats: { AB: 510, R: 68, HR: 12, RBI: 56, SB: 10, AVG: 0.265 } },
  { name: "George Springer", team: "TOR", positions: ["OF"], adp: 118.0, minPick: 88, maxPick: 166, value: -1.0, isPitcher: false, stats: { AB: 530, R: 74, HR: 16, RBI: 58, SB: 14, AVG: 0.245 } },
  { name: "Jonah Heim", team: "TEX", positions: ["C"], adp: 120.0, minPick: 90, maxPick: 170, value: -1.0, isPitcher: false, stats: { AB: 440, R: 52, HR: 14, RBI: 62, SB: 1, AVG: 0.248 } },
  { name: "Cedric Mullins", team: "BAL", positions: ["OF"], adp: 122.0, minPick: 92, maxPick: 172, value: -1.2, isPitcher: false, stats: { AB: 480, R: 64, HR: 14, RBI: 55, SB: 22, AVG: 0.230 } },
  { name: "Ian Happ", team: "CHC", positions: ["OF"], adp: 126.0, minPick: 95, maxPick: 178, value: -1.5, isPitcher: false, stats: { AB: 520, R: 74, HR: 17, RBI: 64, SB: 10, AVG: 0.242 } },
  { name: "Steven Kwan", team: "CLE", positions: ["OF"], adp: 128.0, minPick: 96, maxPick: 180, value: -1.8, isPitcher: false, stats: { AB: 540, R: 80, HR: 6, RBI: 48, SB: 16, AVG: 0.278 } },
  { name: "Gabriel Moreno", team: "ARI", positions: ["C"], adp: 130.0, minPick: 98, maxPick: 185, value: -2.0, isPitcher: false, stats: { AB: 410, R: 48, HR: 8, RBI: 46, SB: 4, AVG: 0.272 } },
  { name: "Zack Gelof", team: "OAK", positions: ["2B"], adp: 132.0, minPick: 99, maxPick: 186, value: -2.0, isPitcher: false, stats: { AB: 500, R: 66, HR: 16, RBI: 52, SB: 18, AVG: 0.238 } },
  { name: "Masataka Yoshida", team: "BOS", positions: ["OF"], adp: 135.0, minPick: 102, maxPick: 190, value: -2.2, isPitcher: false, stats: { AB: 490, R: 62, HR: 12, RBI: 58, SB: 2, AVG: 0.275 } },
  { name: "Estery Ruiz", team: "OAK", positions: ["OF"], adp: 140.0, minPick: 105, maxPick: 200, value: -2.5, isPitcher: false, stats: { AB: 420, R: 54, HR: 4, RBI: 32, SB: 42, AVG: 0.244 } },
];

export function getMockPlayers(): Player[] {
  const players: Player[] = basePlayers.map((bp, index) => ({
    ...bp,
    id: `player-${index + 1}`,
    consensusValue: bp.value,
    maxSystemValue: bp.value,
  }));

  // Fill in the rest up to 350 players programmatically
  const teams = ["ATL", "MIA", "NYM", "PHI", "WSH", "CHC", "CIN", "MIL", "PIT", "STL", "ARI", "COL", "LAD", "SD", "SF", "BAL", "BOS", "NYY", "TB", "TOR", "CWS", "CLE", "DET", "KC", "MIN", "HOU", "LAA", "OAK", "SEA", "TEX"];
  const positions = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];

  let currentValue = -2.8;

  for (let i = players.length + 1; i <= 350; i++) {
    const isPitcher = Math.random() > 0.55;
    const team = teams[Math.floor(Math.random() * teams.length)];
    const pos = positions[Math.floor(Math.random() * (isPitcher ? 2 : 6)) + (isPitcher ? 6 : 0)];

    currentValue -= Math.random() * 0.05 + 0.02;

    const name = isPitcher 
      ? `Pitcher ${i - players.length + 50} (${pos})`
      : `Batter ${i - players.length + 50} (${pos})`;

    const stats: PlayerStats = isPitcher
      ? pos === "RP"
        ? { IP: 60, W: Math.floor(Math.random() * 4), SV: Math.floor(Math.random() * 15), SO: 60 + Math.floor(Math.random() * 20), ERA: Math.round((3.00 + Math.random() * 1.5) * 100) / 100, WHIP: Math.round((1.10 + Math.random() * 0.2) * 100) / 100 }
        : { IP: 150 + Math.floor(Math.random() * 30), W: 6 + Math.floor(Math.random() * 7), SV: 0, SO: 120 + Math.floor(Math.random() * 60), ERA: Math.round((3.60 + Math.random() * 1.4) * 100) / 100, WHIP: Math.round((1.15 + Math.random() * 0.2) * 100) / 100 }
      : {
          AB: 400 + Math.floor(Math.random() * 150),
          R: 45 + Math.floor(Math.random() * 45),
          HR: 5 + Math.floor(Math.random() * 22),
          RBI: 40 + Math.floor(Math.random() * 50),
          SB: Math.floor(Math.random() * 25),
          AVG: parseFloat((0.230 + Math.random() * 0.060).toFixed(3))
        };

    players.push({
      id: `player-${i}`,
      name,
      team,
      positions: [pos],
      adp: 999.0, // placeholder, will be reassigned
      minPick: 999, // placeholder, will be reassigned
      maxPick: 999, // placeholder, will be reassigned
      value: parseFloat(currentValue.toFixed(2)),
      consensusValue: parseFloat(currentValue.toFixed(2)),
      maxSystemValue: parseFloat(currentValue.toFixed(2)),
      stats,
      isPitcher,
    });
  }

  // Sort all players by value descending to determine their dense draft rank
  players.sort((a, b) => b.value - a.value);

  // Reassign dense ADP, minPick, and maxPick based on value rank
  for (let idx = 0; idx < players.length; idx++) {
    const rank = idx + 1;
    // Introduce a small random jitter to make ADPs look natural
    const jitter = (Math.random() - 0.5) * 1.5;
    const adp = parseFloat(Math.max(1.0, rank + jitter).toFixed(1));

    // Standard deviation grows with ADP to reflect uncertainty
    const stdDev = adp * 0.08 + 1.2;

    const minPick = Math.max(1, Math.floor(adp - Math.max(1.0, (1.5 + Math.random() * 1.0) * stdDev)));
    const maxPick = Math.floor(adp + Math.max(1.0, (1.5 + Math.random() * 1.0) * stdDev));

    players[idx].adp = adp;
    players[idx].minPick = minPick;
    players[idx].maxPick = maxPick;
  }

  return players;
}
