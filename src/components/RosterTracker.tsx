"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../app/page.module.css";
import { Player, PlayerStats } from "../utils/sampleData";

interface RosterTrackerProps {
  teamIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  draftedPlayers: { player: Player; teamIndex: number; round?: number; overallPick?: number }[];
  onSelectTeam: (index: number) => void;
  numRounds: number;
  projectionOverrides?: Record<string, Partial<PlayerStats>>;
  onUpdateProjectionOverride?: (playerId: string, stats: Partial<PlayerStats>) => void;
  onResetProjectionOverride?: (playerId: string) => void;
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

type RosterSlotDefinition = typeof ROSTER_SLOTS[number];
type SlotAssignment = string | "bench";
type EditableStatKey = keyof PlayerStats;

const HITTER_PROJECTION_FIELDS: { key: EditableStatKey; label: string; step?: string }[] = [
  { key: "AB", label: "AB" },
  { key: "R", label: "R" },
  { key: "HR", label: "HR" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "SB" },
  { key: "AVG", label: "AVG", step: "0.001" },
];

const PITCHER_PROJECTION_FIELDS: { key: EditableStatKey; label: string; step?: string }[] = [
  { key: "IP", label: "IP", step: "0.1" },
  { key: "W", label: "W" },
  { key: "SV", label: "SV" },
  { key: "SO", label: "SO" },
  { key: "ERA", label: "ERA", step: "0.01" },
  { key: "WHIP", label: "WHIP", step: "0.01" },
];

const canPlayerUseRosterSlot = (player: Player, slot: RosterSlotDefinition) => {
  if (slot.type === "pitcher") return player.isPitcher;
  if (player.isPitcher) return false;
  if (player.positions.includes("C") && !slot.positions.includes("C")) return false;
  return player.positions.some((position) => slot.positions.includes(position));
};

const SLOT_DISPLAY_LABELS = ROSTER_SLOTS.map((slot, index) => {
  const matchingSlots = ROSTER_SLOTS
    .slice(0, index + 1)
    .filter((candidate) => candidate.label === slot.label).length;
  const totalMatchingSlots = ROSTER_SLOTS.filter((candidate) => candidate.label === slot.label).length;

  return totalMatchingSlots > 1 ? `${slot.label} ${matchingSlots}` : slot.label;
});

export default function RosterTracker({
  teamIndex,
  teamNames,
  userTeamIndex,
  draftedPlayers,
  onSelectTeam,
  numRounds,
  projectionOverrides = {},
  onUpdateProjectionOverride,
  onResetProjectionOverride,
  targets,
}: RosterTrackerProps) {
  const [slotAssignmentsByTeam, setSlotAssignmentsByTeam] = useState<Record<number, Record<string, SlotAssignment>>>({});
  const [editingProjectionPlayerId, setEditingProjectionPlayerId] = useState<string | null>(null);
  const [projectionDraft, setProjectionDraft] = useState<Partial<PlayerStats>>({});
  const [scaleHittingStatsWithAB, setScaleHittingStatsWithAB] = useState(false);
  const [hittingScaleBaseline, setHittingScaleBaseline] = useState<Partial<PlayerStats>>({});
  const [scaleTargetAB, setScaleTargetAB] = useState("");

  const selectedDraftedPlayers = useMemo(() => {
    return draftedPlayers.filter((dp) => dp.teamIndex === teamIndex);
  }, [draftedPlayers, teamIndex]);

  // Get all players drafted by the currently selected team
  const sourceDrafted = useMemo(() => {
    return selectedDraftedPlayers.map((dp) => dp.player);
  }, [selectedDraftedPlayers]);

  const myDrafted = useMemo(() => {
    if (teamIndex !== userTeamIndex) return sourceDrafted;

    return sourceDrafted.map((player) => ({
      ...player,
      stats: {
        ...player.stats,
        ...(projectionOverrides[player.id] || {}),
      },
    }));
  }, [sourceDrafted, teamIndex, userTeamIndex, projectionOverrides]);

  const sourcePlayerMap = useMemo(
    () => new Map(sourceDrafted.map((player) => [player.id, player])),
    [sourceDrafted]
  );

  const draftCapital = useMemo(() => {
    const getPickCapital = (round?: number) => {
      if (!round || round <= 0) return 1;
      return Math.max(0.6, 10 * Math.pow(0.86, round - 1));
    };

    const getCapitalBucket = (player: Player) => {
      if (!player.isPitcher) return "Hit";
      if (player.positions.includes("SP")) return "SP";
      return "RP";
    };

    const buckets = selectedDraftedPlayers.reduce(
      (totals, draftedPlayer) => {
        const capital = getPickCapital(draftedPlayer.round);
        const player = draftedPlayer.player;

        if (!player.isPitcher) {
          totals.hitters += capital;
        } else if (player.positions.includes("SP")) {
          totals.sp += capital;
        } else {
          totals.rp += capital;
        }

        totals.total += capital;
        return totals;
      },
      { hitters: 0, sp: 0, rp: 0, total: 0 }
    );

    const pct = (value: number) => buckets.total > 0 ? Math.round((value / buckets.total) * 100) : 0;
    const pitcherPct = pct(buckets.sp + buckets.rp);
    const hitterPct = pct(buckets.hitters);
    const spPct = pct(buckets.sp);
    const rpPct = pct(buckets.rp);
    const picks = selectedDraftedPlayers
      .map((draftedPlayer) => {
        const capital = getPickCapital(draftedPlayer.round);
        return {
          player: draftedPlayer.player,
          round: draftedPlayer.round,
          overallPick: draftedPlayer.overallPick,
          bucket: getCapitalBucket(draftedPlayer.player),
          capital,
          pct: pct(capital),
        };
      })
      .sort((a, b) => (a.overallPick ?? 9999) - (b.overallPick ?? 9999));

    let note = "Draft picks will shape this build as players are selected.";
    if (buckets.total > 0) {
      if (spPct >= 45 && selectedDraftedPlayers.length <= 6) {
        note = "Early SP capital is heavy. Bats can take priority unless SP value falls.";
      } else if (pitcherPct <= 20 && selectedDraftedPlayers.length >= 4) {
        note = "Pitching capital is light. Watch upcoming SP/RP windows.";
      } else if (hitterPct >= 78 && selectedDraftedPlayers.length >= 5) {
        note = "Hitter capital is heavy. Start tracking pitching entry points.";
      } else if (rpPct >= 18 && selectedDraftedPlayers.length <= 10) {
        note = "Relief capital is already meaningful. Be selective with more saves.";
      } else {
        note = "Capital balance is reasonable for this stage.";
      }
    }

    return {
      hitters: buckets.hitters,
      sp: buckets.sp,
      rp: buckets.rp,
      total: buckets.total,
      hitterPct,
      pitcherPct,
      spPct,
      rpPct,
      picks,
      note,
    };
  }, [selectedDraftedPlayers]);

  const editingProjectionPlayer = editingProjectionPlayerId
    ? sourcePlayerMap.get(editingProjectionPlayerId) || null
    : null;

  const slotAssignments = slotAssignmentsByTeam[teamIndex] || {};

  useEffect(() => {
    const draftedIdsByTeam = draftedPlayers.reduce<Record<number, Set<string>>>((acc, draftedPlayer) => {
      if (!acc[draftedPlayer.teamIndex]) acc[draftedPlayer.teamIndex] = new Set();
      acc[draftedPlayer.teamIndex].add(draftedPlayer.player.id);
      return acc;
    }, {});

    setSlotAssignmentsByTeam((current) => {
      let changed = false;
      const next: Record<number, Record<string, SlotAssignment>> = {};

      Object.entries(current).forEach(([teamKey, assignments]) => {
        const assignedTeamIndex = Number(teamKey);
        const validPlayerIds = draftedIdsByTeam[assignedTeamIndex] || new Set<string>();
        const validAssignments = Object.fromEntries(
          Object.entries(assignments).filter(([playerId]) => validPlayerIds.has(playerId))
        );

        if (Object.keys(validAssignments).length !== Object.keys(assignments).length) changed = true;
        if (Object.keys(validAssignments).length > 0) next[assignedTeamIndex] = validAssignments;
      });

      return changed ? next : current;
    });
  }, [draftedPlayers]);

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
    const manuallyBenched = new Set(
      myDrafted
        .filter((player) => slotAssignments[player.id] === "bench")
        .map((player) => player.id)
    );
    const manuallyPlaced = new Set<string>();

    myDrafted.forEach((player) => {
      const assignedSlotId = slotAssignments[player.id];
      if (!assignedSlotId || assignedSlotId === "bench") return;

      const slot = slots.find((candidate) => candidate.id === assignedSlotId);
      const slotDefinition = slot ? ROSTER_SLOTS[Number(slot.id.replace("slot-", ""))] : undefined;
      if (slot && slotDefinition && !slot.player && canPlayerUseRosterSlot(player, slotDefinition)) {
        slot.player = player;
        manuallyPlaced.add(player.id);
      }
    });

    // Sort drafted players: active roster positions first, utility next
    const unplaced = myDrafted.filter(
      (player) => !manuallyPlaced.has(player.id) && !manuallyBenched.has(player.id)
    );
    const canPlayerUseSlot = (player: Player, slot: typeof slots[number]) => {
      const slotIndex = Number(slot.id.replace("slot-", ""));
      return canPlayerUseRosterSlot(player, ROSTER_SLOTS[slotIndex]);
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
    bench.push(
      ...myDrafted.filter((player) => manuallyBenched.has(player.id)),
      ...unplaced
    );

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
  }, [myDrafted, numRounds, slotAssignments]);

  const movePlayer = (player: Player, destination: SlotAssignment) => {
    if (teamIndex !== userTeamIndex) return;

    const sourceSlot = roster.active.find((slot) => slot.player?.id === player.id);
    const destinationSlot = destination === "bench"
      ? null
      : roster.active.find((slot) => slot.id === destination);
    const displacedPlayer = destinationSlot?.player;

    setSlotAssignmentsByTeam((current) => {
      const teamAssignments = { ...(current[teamIndex] || {}) };
      teamAssignments[player.id] = destination;

      if (displacedPlayer && displacedPlayer.id !== player.id) {
        const sourceSlotIndex = sourceSlot
          ? Number(sourceSlot.id.replace("slot-", ""))
          : -1;
        const canSwapIntoSource =
          sourceSlotIndex >= 0 &&
          canPlayerUseRosterSlot(displacedPlayer, ROSTER_SLOTS[sourceSlotIndex]);

        if (canSwapIntoSource) {
          teamAssignments[displacedPlayer.id] = sourceSlot!.id;
        } else {
          delete teamAssignments[displacedPlayer.id];
        }
      }

      return {
        ...current,
        [teamIndex]: teamAssignments,
      };
    });
  };

  const openProjectionEditor = (player: Player) => {
    const sourcePlayer = sourcePlayerMap.get(player.id) || player;
    setEditingProjectionPlayerId(player.id);
    setProjectionDraft({
      ...sourcePlayer.stats,
      ...(projectionOverrides[player.id] || {}),
    });
    setScaleHittingStatsWithAB(false);
    setHittingScaleBaseline({});
    setScaleTargetAB("");
  };

  const closeProjectionEditor = () => {
    setEditingProjectionPlayerId(null);
    setProjectionDraft({});
    setScaleHittingStatsWithAB(false);
    setHittingScaleBaseline({});
    setScaleTargetAB("");
  };

  const saveProjectionOverride = () => {
    if (!editingProjectionPlayer || !onUpdateProjectionOverride) return;

    const fields = editingProjectionPlayer.isPitcher
      ? PITCHER_PROJECTION_FIELDS
      : HITTER_PROJECTION_FIELDS;
    const changedStats = fields.reduce<Partial<PlayerStats>>((acc, field) => {
      const nextValue = projectionDraft[field.key];
      const sourceValue = editingProjectionPlayer.stats[field.key];
      if (nextValue !== undefined && nextValue !== sourceValue) {
        acc[field.key] = nextValue;
      }
      return acc;
    }, {});

    if (Object.keys(changedStats).length > 0) {
      onUpdateProjectionOverride(editingProjectionPlayer.id, changedStats);
    } else {
      onResetProjectionOverride?.(editingProjectionPlayer.id);
    }
    closeProjectionEditor();
  };

  const resetProjectionEditor = () => {
    if (!editingProjectionPlayer) return;
    onResetProjectionOverride?.(editingProjectionPlayer.id);
    setProjectionDraft({ ...editingProjectionPlayer.stats });
  };

  const updateProjectionField = (field: EditableStatKey, value: number) => {
    setProjectionDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const setHittingScaleMode = (enabled: boolean) => {
    setScaleHittingStatsWithAB(enabled);
    if (enabled) {
      setHittingScaleBaseline({ ...projectionDraft });
      setScaleTargetAB(String(projectionDraft.AB ?? ""));
    } else {
      setHittingScaleBaseline({});
      setScaleTargetAB("");
    }
  };

  const applyHittingScale = () => {
    const baselineAB = Number(hittingScaleBaseline.AB || 0);
    const targetAB = Number(scaleTargetAB);
    if (baselineAB <= 0 || targetAB <= 0) return;

    const ratio = targetAB / baselineAB;
    setProjectionDraft((current) => {
      const scaled = { ...current, AB: targetAB };
      (["R", "HR", "RBI", "SB"] as const).forEach((stat) => {
        scaled[stat] = Math.round(Number(hittingScaleBaseline[stat] || 0) * ratio);
      });
      return scaled;
    });
  };

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
                    <div className={styles.rosterPlayerContent}>
                      <div className={styles.rosterPlayerTop}>
                        <span className={styles.rosterPlayerName}>
                          <span>{slot.player.name}</span>
                          {slot.player.positions.length > 1 && (
                            <span className={styles.rosterEligibility}>
                              {slot.player.positions.join("/")}
                            </span>
                          )}
                          {teamIndex === userTeamIndex && projectionOverrides[slot.player.id] && (
                            <span className={styles.rosterCustomProjection}>Custom</span>
                          )}
                        </span>
                        <span className={styles.rosterPlayerValue}>
                          ${slot.player.value.toFixed(1)}
                        </span>
                      </div>
                      {teamIndex === userTeamIndex && (
                        <div className={styles.rosterPlayerControls}>
                          <button
                            type="button"
                            className={styles.rosterProjectionButton}
                            onClick={() => openProjectionEditor(slot.player!)}
                            title={`Edit ${slot.player.name} projections`}
                            aria-label={`Edit ${slot.player.name} projections`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <select
                            className={styles.rosterSlotSelect}
                            aria-label={`Move ${slot.player.name}`}
                            value={slot.id}
                            onChange={(event) => movePlayer(slot.player!, event.target.value as SlotAssignment)}
                            title={`Move ${slot.player.name} to another eligible roster slot`}
                          >
                            {ROSTER_SLOTS.map((candidate, candidateIndex) => (
                              canPlayerUseRosterSlot(slot.player!, candidate) ? (
                                <option key={`slot-${candidateIndex}`} value={`slot-${candidateIndex}`}>
                                  {SLOT_DISPLAY_LABELS[candidateIndex]}
                                </option>
                              ) : null
                            ))}
                            <option value="bench">BN</option>
                          </select>
                        </div>
                      )}
                    </div>
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
                    <div className={styles.rosterPlayerContent}>
                      <div className={styles.rosterPlayerTop}>
                        <span className={styles.rosterPlayerName}>
                          <span>{slot.player.name}</span>
                          {slot.player.positions.length > 1 && (
                            <span className={styles.rosterEligibility}>
                              {slot.player.positions.join("/")}
                            </span>
                          )}
                          {teamIndex === userTeamIndex && projectionOverrides[slot.player.id] && (
                            <span className={styles.rosterCustomProjection}>Custom</span>
                          )}
                        </span>
                        <span className={styles.rosterPlayerValue}>
                          ${slot.player.value.toFixed(1)}
                        </span>
                      </div>
                      {teamIndex === userTeamIndex && (
                        <div className={styles.rosterPlayerControls}>
                          <button
                            type="button"
                            className={styles.rosterProjectionButton}
                            onClick={() => openProjectionEditor(slot.player!)}
                            title={`Edit ${slot.player.name} projections`}
                            aria-label={`Edit ${slot.player.name} projections`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <select
                            className={styles.rosterSlotSelect}
                            aria-label={`Move ${slot.player.name}`}
                            value="bench"
                            onChange={(event) => movePlayer(slot.player!, event.target.value as SlotAssignment)}
                            title={`Move ${slot.player.name} to an eligible active roster slot`}
                          >
                            {ROSTER_SLOTS.map((candidate, candidateIndex) => (
                              canPlayerUseRosterSlot(slot.player!, candidate) ? (
                                <option key={`slot-${candidateIndex}`} value={`slot-${candidateIndex}`}>
                                  {SLOT_DISPLAY_LABELS[candidateIndex]}
                                </option>
                              ) : null
                            ))}
                            <option value="bench">BN</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                      Empty
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.draftCapitalPanel}>
            <div className={styles.draftCapitalHeader}>
              <span>Draft Capital</span>
              <span>{draftCapital.total > 0 ? `${draftCapital.pitcherPct}% pitching` : "No picks yet"}</span>
            </div>

            <div className={styles.draftCapitalStack} aria-label="Draft capital split">
              <div
                className={`${styles.draftCapitalSegment} ${styles.draftCapitalHitters}`}
                style={{ width: `${draftCapital.hitterPct}%` }}
                title={`Hitters: ${draftCapital.hitterPct}%`}
              />
              <div
                className={`${styles.draftCapitalSegment} ${styles.draftCapitalSp}`}
                style={{ width: `${draftCapital.spPct}%` }}
                title={`SP: ${draftCapital.spPct}%`}
              />
              <div
                className={`${styles.draftCapitalSegment} ${styles.draftCapitalRp}`}
                style={{ width: `${draftCapital.rpPct}%` }}
                title={`RP: ${draftCapital.rpPct}%`}
              />
            </div>

            <div className={styles.draftCapitalLegend}>
              <span><b className={styles.draftCapitalDotHitters} />Hit {draftCapital.hitterPct}%</span>
              <span><b className={styles.draftCapitalDotSp} />SP {draftCapital.spPct}%</span>
              <span><b className={styles.draftCapitalDotRp} />RP {draftCapital.rpPct}%</span>
            </div>

            <p className={styles.draftCapitalNote}>{draftCapital.note}</p>

            <details className={styles.draftCapitalDetails}>
              <summary>
                <span>Pick Breakdown</span>
                <span>{draftCapital.picks.length} picks</span>
              </summary>
              {draftCapital.picks.length > 0 ? (
                <div className={styles.draftCapitalPickList}>
                  {draftCapital.picks.map((pick) => (
                    <div key={pick.player.id} className={styles.draftCapitalPickRow}>
                      <div className={styles.draftCapitalPickMain}>
                        <span className={styles.draftCapitalPickName}>{pick.player.name}</span>
                        <span className={styles.draftCapitalPickMeta}>
                          {pick.bucket} · R{pick.round ?? "-"}
                          {pick.overallPick ? ` · P${pick.overallPick}` : ""}
                        </span>
                      </div>
                      <div className={styles.draftCapitalPickValue}>
                        <span>{pick.pct}%</span>
                        <small>{pick.capital.toFixed(1)} cap</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.draftCapitalEmpty}>Drafted players will appear here.</p>
              )}
            </details>
          </div>
        </div>
      </div>

      {typeof document !== "undefined" && editingProjectionPlayer && createPortal((
        <div className={styles.projectionEditorBackdrop} onClick={closeProjectionEditor}>
          <div className={styles.projectionEditorModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.projectionEditorHeader}>
              <div>
                <h3>Edit Projections</h3>
                <p>
                  {editingProjectionPlayer.name} | {editingProjectionPlayer.positions.join("/")}
                </p>
              </div>
              <button type="button" onClick={closeProjectionEditor} aria-label="Close projection editor">
                &times;
              </button>
            </div>

            {!editingProjectionPlayer.isPitcher && (
              <div className={styles.projectionScaleOption}>
                <div>
                  <strong>When AB changes</strong>
                  <small>Scale mode adjusts R, HR, RBI, and SB. AVG stays unchanged.</small>
                </div>
                <div className={styles.projectionScaleModes}>
                  <button
                    type="button"
                    data-active={!scaleHittingStatsWithAB}
                    onClick={() => setHittingScaleMode(false)}
                  >
                    Independent
                  </button>
                  <button
                    type="button"
                    data-active={scaleHittingStatsWithAB}
                    onClick={() => setHittingScaleMode(true)}
                  >
                    Scale stats
                  </button>
                </div>
                {scaleHittingStatsWithAB && (
                  <div className={styles.projectionScaleApply}>
                    <label>
                      Target AB
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={scaleTargetAB}
                        onChange={(event) => setScaleTargetAB(event.target.value)}
                      />
                    </label>
                    <button type="button" onClick={applyHittingScale}>
                      Apply Scale
                    </button>
                    <span>
                      {Number(hittingScaleBaseline.AB || 0).toFixed(0)} AB baseline
                      {" -> "}
                      {Number(scaleTargetAB || 0).toFixed(0)} AB
                      {" ("}
                      {Number(hittingScaleBaseline.AB || 0) > 0 && Number(scaleTargetAB) > 0
                        ? `${(Number(scaleTargetAB) / Number(hittingScaleBaseline.AB || 1)).toFixed(2)}x`
                        : "enter target"}
                      {")"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.projectionEditorGrid}>
              {(editingProjectionPlayer.isPitcher
                ? PITCHER_PROJECTION_FIELDS
                : HITTER_PROJECTION_FIELDS
              ).map((field) => {
                const sourceValue = editingProjectionPlayer.stats[field.key] ?? 0;
                const currentValue = projectionDraft[field.key] ?? sourceValue;
                const isChanged = currentValue !== sourceValue;

                return (
                  <label key={field.key} className={styles.projectionEditorField} data-changed={isChanged}>
                    <span>
                      {field.label}
                      <small>Source {sourceValue}</small>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={field.step || "1"}
                      value={currentValue}
                      disabled={scaleHittingStatsWithAB && field.key === "AB"}
                      onFocus={(event) => event.currentTarget.select()}
                      onClick={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        const value = event.target.value === "" ? 0 : Number(event.target.value);
                        updateProjectionField(field.key, value);
                      }}
                    />
                  </label>
                );
              })}
            </div>

            <div className={styles.projectionEditorActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetProjectionEditor}
                disabled={!projectionOverrides[editingProjectionPlayer.id]}
              >
                Reset to Source
              </button>
              <div>
                <button type="button" className="btn btn-secondary" onClick={closeProjectionEditor}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={saveProjectionOverride}>
                  Save Projections
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
