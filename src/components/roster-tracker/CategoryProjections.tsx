"use client";

import React from "react";
import styles from "../RosterTracker.module.css";
import { calculateCategoryStats } from "../../engine/categoryStats";
import type { LeagueTargets } from "../../engine/config";

type CategoryStats = ReturnType<typeof calculateCategoryStats>;

const MAX_TARGET_PERCENT = 130;
const TARGET_MARKER_POSITION = `${(100 / MAX_TARGET_PERCENT) * 100}%`;

function percentOfTarget(val: number, target: number, invert = false) {
  if (invert) {
    // ERA/WHIP: a value below target is "over 100%".
    if (val === 0) return 0;
    return Math.min(MAX_TARGET_PERCENT, Math.round((target / val) * 100));
  }
  return Math.min(MAX_TARGET_PERCENT, Math.round((val / target) * 100));
}

function barWidth(val: number, target: number, invert = false) {
  return `${(percentOfTarget(val, target, invert) / MAX_TARGET_PERCENT) * 100}%`;
}

interface StatBarProps {
  label: string;
  value: string | number;
  target: number | string;
  width: string;
  background?: string;
}

function StatBar({ label, value, target, width, background }: StatBarProps) {
  return (
    <div className={styles.statBarItem}>
      <div className={styles.statBarLabels}>
        <span>
          {label}: {value}
        </span>
        <span className={styles.statBarTargetLabel}>T: {target}</span>
      </div>
      <div className={styles.statBarContainer}>
        <div className={styles.statBarFill} style={{ width, ...(background ? { background } : {}) }} />
        <div className={styles.statBarTargetLine} style={{ left: TARGET_MARKER_POSITION }} />
      </div>
    </div>
  );
}

interface CategoryProjectionsProps {
  stats: CategoryStats;
  targets: LeagueTargets;
}

export default function CategoryProjections({ stats, targets }: CategoryProjectionsProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.01)",
        border: "1px solid var(--border-muted)",
        padding: "16px",
        borderRadius: "10px",
      }}
    >
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          display: "block",
          marginBottom: "12px",
          textTransform: "uppercase",
        }}
      >
        Projected Category Standings
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Hitting Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--primary)",
              borderBottom: "1px solid rgba(99, 102, 241, 0.15)",
              paddingBottom: "4px",
              marginBottom: "4px",
              letterSpacing: "0.05em",
            }}
          >
            HITTING
          </span>

          <StatBar label="R" value={stats.R} target={targets.R} width={barWidth(stats.R, targets.R)} />
          <StatBar label="HR" value={stats.HR} target={targets.HR} width={barWidth(stats.HR, targets.HR)} />
          <StatBar label="RBI" value={stats.RBI} target={targets.RBI} width={barWidth(stats.RBI, targets.RBI)} />
          <StatBar
            label="SB"
            value={stats.SB}
            target={targets.SB}
            width={barWidth(stats.SB, targets.SB)}
            background="linear-gradient(90deg, var(--secondary), var(--accent))"
          />
          <StatBar
            label="AVG"
            value={stats.AVG > 0 ? stats.AVG.toFixed(3) : ".000"}
            target={targets.AVG}
            width={barWidth(stats.AVG, targets.AVG)}
          />
        </div>

        {/* Pitching Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--secondary)",
              borderBottom: "1px solid rgba(6, 182, 212, 0.15)",
              paddingBottom: "4px",
              marginBottom: "4px",
              letterSpacing: "0.05em",
            }}
          >
            PITCHING
          </span>

          <StatBar
            label="W"
            value={stats.W}
            target={targets.W}
            width={barWidth(stats.W, targets.W)}
            background="linear-gradient(90deg, var(--secondary), var(--primary))"
          />
          <StatBar
            label="SV"
            value={stats.SV}
            target={targets.SV}
            width={barWidth(stats.SV, targets.SV)}
            background="linear-gradient(90deg, var(--accent), var(--secondary))"
          />
          <StatBar
            label="SO"
            value={stats.SO}
            target={targets.SO}
            width={barWidth(stats.SO, targets.SO)}
            background="linear-gradient(90deg, var(--secondary), var(--primary))"
          />
          <StatBar
            label="ERA"
            value={stats.ERA > 0 ? stats.ERA.toFixed(2) : "0.00"}
            target={targets.ERA}
            width={stats.ERA > 0 ? barWidth(stats.ERA, targets.ERA, true) : "0%"}
            background={
              stats.ERA > targets.ERA
                ? "rgba(239, 68, 68, 0.4)"
                : "linear-gradient(90deg, var(--success), var(--secondary))"
            }
          />
          <StatBar
            label="WHIP"
            value={stats.WHIP > 0 ? stats.WHIP.toFixed(2) : "0.00"}
            target={targets.WHIP}
            width={stats.WHIP > 0 ? barWidth(stats.WHIP, targets.WHIP, true) : "0%"}
            background={
              stats.WHIP > targets.WHIP
                ? "rgba(239, 68, 68, 0.4)"
                : "linear-gradient(90deg, var(--success), var(--secondary))"
            }
          />
        </div>
      </div>
    </div>
  );
}
