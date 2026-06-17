import { Player } from "./sampleData";

/**
 * Robust float parser that handles empty/invalid values by returning a fallback.
 */
function safeFloat(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Basic CSV Parser that handles commas, quotes, and newlines.
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentField = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      row.push(currentField.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        lines.push(row);
      }
      row = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (row.length > 0 || currentField !== "") {
    row.push(currentField.trim());
    lines.push(row);
  }

  return lines;
}

/**
 * Maps CSV rows into Player objects.
 */
export function parsePlayersFromCSVs(hittersText: string, pitchersText: string): Player[] {
  const hittersData = parseCSV(hittersText);
  const pitchersData = parseCSV(pitchersText);

  if (hittersData.length < 2 || pitchersData.length < 2) {
    throw new Error("CSV files must contain a header and at least one row of data.");
  }

  const parsedPlayers: Player[] = [];
  let playerIdCounter = 1;

  // Process Hitters
  const hitterHeaders = hittersData[0].map(h => h.toLowerCase());
  const idxHName = hitterHeaders.findIndex(h => h === "nameascii" || h === "name");
  const idxHTeam = hitterHeaders.findIndex(h => h === "team");
  const idxHPOS = hitterHeaders.findIndex(h => h === "pos" || h === "positions");
  const idxHADP = hitterHeaders.findIndex(h => h === "adp");
  const idxHDollars = hitterHeaders.findIndex(h => h === "dollars" || h === "value" || h === "price");

  // Stats columns (can be raw or marginal)
  const idxHPA = hitterHeaders.findIndex(h => h === "pa" || h === "ab");
  const idxHHR = hitterHeaders.findIndex(h => h === "mhr" || h === "hr");
  const idxHSB = hitterHeaders.findIndex(h => h === "msb" || h === "sb");
  const idxHR = hitterHeaders.findIndex(h => h === "mr" || h === "r");
  const idxHRBI = hitterHeaders.findIndex(h => h === "mrbi" || h === "rbi");
  const idxHAVG = hitterHeaders.findIndex(h => h === "mavg" || h === "avg");

  const isHHRMarginal = hitterHeaders[idxHHR] === "mhr";
  const isHSBMarginal = hitterHeaders[idxHSB] === "msb";
  const isHRMarginal = hitterHeaders[idxHR] === "mr";
  const isHRBIMarginal = hitterHeaders[idxHRBI] === "mrbi";
  const isHAVGMarginal = hitterHeaders[idxHAVG] === "mavg";

  for (let i = 1; i < hittersData.length; i++) {
    const row = hittersData[i];
    if (row.length < Math.max(idxHName, idxHTeam, idxHPOS, idxHDollars)) continue;

    const name = row[idxHName]?.trim() || "Unknown Hitter";
    const team = row[idxHTeam]?.trim() || "FA";
    const rawPOS = row[idxHPOS]?.trim() || "UT";
    const adp = idxHADP !== -1 ? safeFloat(row[idxHADP], 0) : 0;
    const value = idxHDollars !== -1 ? safeFloat(row[idxHDollars], 0.0) : 0.0;

    // Split and map positions
    const rawPosList = rawPOS.split(/[\/,;\s]+/).map(p => p.trim().toUpperCase());
    const positions = rawPosList.map(pos => {
      if (pos === "DH") return "UT";
      return pos;
    }).filter(Boolean);
    if (positions.length === 0) positions.push("UT");

    // Extract stats and apply heuristics if they are marginal values
    const rawPA = idxHPA !== -1 ? safeFloat(row[idxHPA], 500) : 500;
    const valHR = idxHHR !== -1 ? safeFloat(row[idxHHR], 0) : 0;
    const valSB = idxHSB !== -1 ? safeFloat(row[idxHSB], 0) : 0;
    const valR = idxHR !== -1 ? safeFloat(row[idxHR], 0) : 0;
    const valRBI = idxHRBI !== -1 ? safeFloat(row[idxHRBI], 0) : 0;
    const valAVG = idxHAVG !== -1 ? safeFloat(row[idxHAVG], isHAVGMarginal ? 0 : 0.260) : (isHAVGMarginal ? 0 : 0.260);

    const HR = isHHRMarginal ? Math.max(0, 15 + Math.round(valHR * 3)) : Math.round(valHR);
    const SB = isHSBMarginal ? Math.max(0, 5 + Math.round(valSB * 5)) : Math.round(valSB);
    const R = isHRMarginal ? Math.max(0, 50 + Math.round(valR * 6)) : Math.round(valR);
    const RBI = isHRBIMarginal ? Math.max(0, 50 + Math.round(valRBI * 6)) : Math.round(valRBI);
    const AVG = isHAVGMarginal ? parseFloat((0.260 + valAVG * 0.005).toFixed(3)) : valAVG;

    parsedPlayers.push({
      id: `csv-player-${playerIdCounter++}`,
      name,
      team,
      positions,
      adp: isNaN(adp) ? 0 : adp,
      minPick: 0, // will be reassigned densified
      maxPick: 0, // will be reassigned densified
      value: isNaN(value) ? 0.0 : value,
      isPitcher: false,
      stats: {
        AB: Math.round(rawPA * 0.9), // approximation of AB from PA
        R,
        HR,
        RBI,
        SB,
        AVG,
      }
    });
  }

  // Process Pitchers
  const pitcherHeaders = pitchersData[0].map(h => h.toLowerCase());
  const idxPName = pitcherHeaders.findIndex(h => h === "nameascii" || h === "name");
  const idxPTeam = pitcherHeaders.findIndex(h => h === "team");
  const idxPPOS = pitcherHeaders.findIndex(h => h === "pos" || h === "positions");
  const idxPADP = pitcherHeaders.findIndex(h => h === "adp");
  const idxPDollars = pitcherHeaders.findIndex(h => h === "dollars" || h === "value" || h === "price");

  // Stats columns (can be raw or marginal)
  const idxPIP = pitcherHeaders.findIndex(h => h === "ip");
  const idxPW = pitcherHeaders.findIndex(h => h === "mw" || h === "w");
  const idxPSV = pitcherHeaders.findIndex(h => h === "msv" || h === "sv");
  const idxPSO = pitcherHeaders.findIndex(h => h === "mso" || h === "so");
  const idxPERA = pitcherHeaders.findIndex(h => h === "mera" || h === "era");
  const idxPWHIP = pitcherHeaders.findIndex(h => h === "mwhip" || h === "whip");

  const isPWMarginal = pitcherHeaders[idxPW] === "mw";
  const isPSVMarginal = pitcherHeaders[idxPSV] === "msv";
  const isPSOMarginal = pitcherHeaders[idxPSO] === "mso";
  const isPERAMarginal = pitcherHeaders[idxPERA] === "mera";
  const isPWHIPMarginal = pitcherHeaders[idxPWHIP] === "mwhip";

  for (let i = 1; i < pitchersData.length; i++) {
    const row = pitchersData[i];
    if (row.length < Math.max(idxPName, idxPTeam, idxPPOS, idxPDollars)) continue;

    const name = row[idxPName]?.trim() || "Unknown Pitcher";
    const team = row[idxPTeam]?.trim() || "FA";
    const rawPOS = row[idxPPOS]?.trim() || "SP";
    const adp = idxPADP !== -1 ? safeFloat(row[idxPADP], 0) : 0;
    const value = idxPDollars !== -1 ? safeFloat(row[idxPDollars], 0.0) : 0.0;

    const rawPosList = rawPOS.split(/[\/,;\s]+/).map(p => p.trim().toUpperCase());
    const positions = rawPosList.filter(pos => pos === "SP" || pos === "RP");
    if (positions.length === 0) positions.push("SP");

    const IP = idxPIP !== -1 ? safeFloat(row[idxPIP], 100) : 100;
    const valW = idxPW !== -1 ? safeFloat(row[idxPW], 0) : 0;
    const valSV = idxPSV !== -1 ? safeFloat(row[idxPSV], 0) : 0;
    const valSO = idxPSO !== -1 ? safeFloat(row[idxPSO], 0) : 0;
    const valERA = idxPERA !== -1 ? safeFloat(row[idxPERA], isPERAMarginal ? 0 : 3.80) : (isPERAMarginal ? 0 : 3.80);
    const valWHIP = idxPWHIP !== -1 ? safeFloat(row[idxPWHIP], isPWHIPMarginal ? 0 : 1.20) : (isPWHIPMarginal ? 0 : 1.20);

    const W = isPWMarginal ? Math.max(0, 5 + Math.round(valW * 1.5)) : Math.round(valW);
    const SV = isPSVMarginal ? Math.max(0, Math.round(valSV * 4.0)) : Math.round(valSV);
    const SO = isPSOMarginal ? Math.max(0, 100 + Math.round(valSO * 18.0)) : Math.round(valSO);
    const ERA = isPERAMarginal ? parseFloat(Math.max(1.5, 3.80 - valERA * 0.08).toFixed(2)) : valERA;
    const WHIP = isPWHIPMarginal ? parseFloat(Math.max(0.8, 1.22 - valWHIP * 0.015).toFixed(3)) : valWHIP;

    parsedPlayers.push({
      id: `csv-player-${playerIdCounter++}`,
      name,
      team,
      positions,
      adp: isNaN(adp) ? 0 : adp,
      minPick: 0, // will be reassigned densified
      maxPick: 0, // will be reassigned densified
      value: isNaN(value) ? 0.0 : value,
      isPitcher: true,
      stats: {
        IP: isNaN(IP) ? 100 : IP,
        W,
        SV,
        SO,
        ERA,
        WHIP
      }
    });
  }

  // Sort merged players by value descending
  parsedPlayers.sort((a, b) => b.value - a.value);

  // Determine if we should use the CSV's ADPs or generate dense ADPs.
  // We'll inspect if the CSV ADPs are populated (more than 50% non-zero).
  const populatedAdps = parsedPlayers.filter(p => p.adp > 0).length;
  const useCsvAdps = populatedAdps > parsedPlayers.length * 0.5;

  // Reassign ADP/minPick/maxPick
  for (let idx = 0; idx < parsedPlayers.length; idx++) {
    const rank = idx + 1;
    let adp = rank;

    if (useCsvAdps && parsedPlayers[idx].adp > 0) {
      adp = parsedPlayers[idx].adp;
    } else {
      // Reassign rank-based ADP with a tiny jitter
      const jitter = (Math.random() - 0.5) * 1.5;
      adp = parseFloat(Math.max(1.0, rank + jitter).toFixed(1));
    }

    const stdDev = adp * 0.08 + 1.2;
    const minPick = Math.max(1, Math.floor(adp - Math.max(1.0, (1.5 + Math.random() * 1.0) * stdDev)));
    const maxPick = Math.ceil(adp + Math.max(1.0, (1.5 + Math.random() * 1.0) * stdDev));

    parsedPlayers[idx].adp = adp;
    parsedPlayers[idx].minPick = minPick;
    parsedPlayers[idx].maxPick = maxPick;
  }

  return parsedPlayers;
}
