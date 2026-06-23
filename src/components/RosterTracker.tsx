"use client";

import React, { useMemo } from "react";
import styles from "../app/page.module.css";
import { Player } from "../utils/sampleData";

interface RosterTrackerProps {
  teamIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number }[];
  onSelectTeam: (index: number) => void;
  numRounds: number;
  targets: {
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    SV: number;
    SO: number;
    ERA: number;
    WHIP: number;
  };
}

// Roster Slot Definitions
const ROSTER_SLOTS = [
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

export default function RosterTracker({
  teamIndex,
  teamNames,
  draftedPlayers,
  onSelectTeam,
  numRounds,
  targets,
}: RosterTrackerProps) {
  // Get all players drafted by the currently selected team
  const myDrafted = useMemo(() => {
    return draftedPlayers.filter((dp) => dp.teamIndex === teamIndex).map((dp) => dp.player);
  }, [draftedPlayers, teamIndex]);

  // Fit players into roster slots dynamically
  const roster = useMemo(() => {
    // Initialize empty slots
    const slots = ROSTER_SLOTS.map((s, idx) => ({
      id: `slot-${idx}`,
      label: s.label,
      type: s.type,
      positions: s.positions,
      player: null as Player | null,
    }));

    const bench: Player[] = [];
    
    // Sort drafted players: active roster positions first, utility next
    const unplaced = [...myDrafted];
    const canPlayerUseSlot = (player: Player, slot: typeof slots[number]) => {
      if (player.positions.includes("C") && !slot.positions.includes("C")) return false;
      return player.positions.some(pos => slot.positions.includes(pos));
    };

    // First pass: Fit players into their exact primary position slots (e.g. C to C, SS to SS)
    for (let i = 0; i < unplaced.length; i++) {
      const player = unplaced[i];
      let placed = false;

      // Skip generic UT slot, CI/MI slots, and P slots in first pass
      for (const slot of slots) {
        if (slot.player === null && slot.label !== "UT" && slot.label !== "CI" && slot.label !== "MI" && slot.label !== "P") {
          // If player has this position
          if (canPlayerUseSlot(player, slot)) {
            slot.player = player;
            placed = true;
            break;
          }
        }
      }

      if (placed) {
        unplaced.splice(i, 1);
        i--; // Adjust index after splice
      }
    }

    // Second pass: Fit batters in CI, MI
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

    // Third pass: Fit batters in UT and pitchers in P
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

    // Remaining players go to the bench
    bench.push(...unplaced);

    // Fill the bench slots up to the round count
    const numActiveSlots = slots.length;
    const numBenchSlotsNeeded = Math.max(0, numRounds - numActiveSlots);
    const benchSlots = [];

    for (let i = 0; i < numBenchSlotsNeeded; i++) {
      benchSlots.push({
        id: `bench-${i}`,
        label: "BN",
        type: "bench",
        player: bench[i] || null,
      });
    }

    return { active: slots, bench: benchSlots };
  }, [myDrafted, numRounds]);

  // Calculate accumulated statistics
  const stats = useMemo(() => {
    let R = 0, HR = 0, RBI = 0, SB = 0, totalAB = 0, sumAVG = 0;
    let W = 0, SV = 0, SO = 0, totalIP = 0, sumERA = 0, sumWHIP = 0;
    let battersCount = 0;
    let pitchersCount = 0;

    myDrafted.forEach((player) => {
      if (!player.isPitcher) {
        R += player.stats.R || 0;
        HR += player.stats.HR || 0;
        RBI += player.stats.RBI || 0;
        SB += player.stats.SB || 0;
        if (player.stats.AB && player.stats.AB > 0) {
          totalAB += player.stats.AB;
          sumAVG += (player.stats.AVG || 0) * player.stats.AB;
        }
        battersCount++;
      } else {
        W += player.stats.W || 0;
        SV += player.stats.SV || 0;
        SO += player.stats.SO || 0;
        if (player.stats.IP && player.stats.IP > 0) {
          totalIP += player.stats.IP;
          sumERA += (player.stats.ERA || 0) * player.stats.IP;
          sumWHIP += (player.stats.WHIP || 0) * player.stats.IP;
        }
        pitchersCount++;
      }
    });

    const avgAVG = totalAB > 0 ? sumAVG / totalAB : 0;
    const avgERA = totalIP > 0 ? sumERA / totalIP : 0;
    const avgWHIP = totalIP > 0 ? sumWHIP / totalIP : 0;

    return {
      R, HR, RBI, SB, AVG: avgAVG,
      W, SV, SO, ERA: avgERA, WHIP: avgWHIP,
      battersCount, pitchersCount
    };
  }, [myDrafted]);

  // Use custom targets passed as prop

  const MAX_TARGET_PERCENT = 130;
  const targetMarkerPosition = `${(100 / MAX_TARGET_PERCENT) * 100}%`;

  const getPercentOfTarget = (val: number, target: number, invert = false) => {
    if (invert) {
      // For ERA/WHIP: if val is lower than target, it's > 100%
      if (val === 0) return 0;
      return Math.min(MAX_TARGET_PERCENT, Math.round((target / val) * 100));
    }
    return Math.min(MAX_TARGET_PERCENT, Math.round((val / target) * 100));
  };

  const getBarWidth = (val: number, target: number, invert = false) =>
    `${(getPercentOfTarget(val, target, invert) / MAX_TARGET_PERCENT) * 100}%`;

  return (
    <div className={styles.card} style={{ flexGrow: 1 }}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Team Rosters
        </h3>
        <select
          className="premium-input"
          value={teamIndex}
          onChange={(e) => onSelectTeam(parseInt(e.target.value))}
          style={{ padding: "4px 8px", fontSize: "0.8rem", width: "160px" }}
        >
          {teamNames.map((name, idx) => (
            <option key={idx} value={idx}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Roster & Category Tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Category Projections */}
        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-muted)", padding: "16px", borderRadius: "10px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>
            Projected Category Standings
          </span>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Hitting Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid rgba(99, 102, 241, 0.15)", paddingBottom: "4px", marginBottom: "4px", letterSpacing: "0.05em" }}>
                HITTING
              </span>
              
              {/* R */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>R: {stats.R}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.R}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.R, targets.R) }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* HR */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>HR: {stats.HR}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.HR}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.HR, targets.HR) }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* RBI */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>RBI: {stats.RBI}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.RBI}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.RBI, targets.RBI) }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* SB */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>SB: {stats.SB}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.SB}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.SB, targets.SB), background: "linear-gradient(90deg, var(--secondary), var(--accent))" }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* AVG */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>AVG: {stats.AVG > 0 ? stats.AVG.toFixed(3) : ".000"}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.AVG}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.AVG, targets.AVG) }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>
            </div>

            {/* Pitching Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary)", borderBottom: "1px solid rgba(6, 182, 212, 0.15)", paddingBottom: "4px", marginBottom: "4px", letterSpacing: "0.05em" }}>
                PITCHING
              </span>

              {/* W */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>W: {stats.W}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.W}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.W, targets.W), background: "linear-gradient(90deg, var(--secondary), var(--primary))" }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* SV */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>SV: {stats.SV}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.SV}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.SV, targets.SV), background: "linear-gradient(90deg, var(--accent), var(--secondary))" }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* SO */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>SO: {stats.SO}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.SO}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div className={styles.statBarFill} style={{ width: getBarWidth(stats.SO, targets.SO), background: "linear-gradient(90deg, var(--secondary), var(--primary))" }} />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* ERA */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>ERA: {stats.ERA > 0 ? stats.ERA.toFixed(2) : "0.00"}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.ERA}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div
                    className={styles.statBarFill}
                    style={{
                      width: stats.ERA > 0 ? getBarWidth(stats.ERA, targets.ERA, true) : "0%",
                      background: stats.ERA > targets.ERA ? "rgba(239, 68, 68, 0.4)" : "linear-gradient(90deg, var(--success), var(--secondary))"
                    }}
                  />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>

              {/* WHIP */}
              <div className={styles.statBarItem}>
                <div className={styles.statBarLabels}>
                  <span>WHIP: {stats.WHIP > 0 ? stats.WHIP.toFixed(2) : "0.00"}</span>
                  <span className={styles.statBarTargetLabel}>T: {targets.WHIP}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div
                    className={styles.statBarFill}
                    style={{
                      width: stats.WHIP > 0 ? getBarWidth(stats.WHIP, targets.WHIP, true) : "0%",
                      background: stats.WHIP > targets.WHIP ? "rgba(239, 68, 68, 0.4)" : "linear-gradient(90deg, var(--success), var(--secondary))"
                    }}
                  />
                  <div className={styles.statBarTargetLine} style={{ left: targetMarkerPosition }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roster Slots List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Roster Slots ({myDrafted.length} / {numRounds})
          </span>
          
          <div className={styles.rosterList} style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
            {/* Active slots */}
            {roster.active.map((slot) => {
              const hasPlayer = slot.player !== null;
              let slotClass = styles.rosterSlot;
              if (hasPlayer) slotClass += ` ${styles.rosterSlotFilled}`;

              return (
                <div key={slot.id} className={slotClass}>
                  <span className={styles.rosterSlotLabel}>{slot.label}</span>
                  {slot.player ? (
                    <>
                      <span className={styles.rosterPlayerName}>{slot.player.name}</span>
                      <span className={styles.rosterPlayerValue}>
                        ${slot.player.value.toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                      Empty
                    </span>
                  )}
                </div>
              );
            })}

            {/* Bench slots */}
            {roster.bench.map((slot) => {
              const hasPlayer = slot.player !== null;
              let slotClass = styles.rosterSlot;
              if (hasPlayer) slotClass += ` ${styles.rosterSlotFilled}`;

              return (
                <div key={slot.id} className={slotClass}>
                  <span className={styles.rosterSlotLabel} style={{ color: "var(--text-muted)" }}>{slot.label}</span>
                  {slot.player ? (
                    <>
                      <span className={styles.rosterPlayerName}>{slot.player.name}</span>
                      <span className={styles.rosterPlayerValue}>
                        ${slot.player.value.toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                      Empty
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
