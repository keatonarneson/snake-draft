"use client";

import React, { useState } from "react";

export interface TargetBenchmarks {
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
}

const DEFAULT_TARGETS: TargetBenchmarks = {
  R: 1125,
  HR: 315,
  RBI: 1103,
  SB: 190,
  AVG: 0.263,
  W: 93,
  SV: 88,
  SO: 1275,
  ERA: 3.65,
  WHIP: 1.20,
};

interface TargetBenchmarksSectionProps {
  targets: TargetBenchmarks;
  onTargetsChange: (targets: TargetBenchmarks) => void;
}

export default function TargetBenchmarksSection({
  targets,
  onTargetsChange,
}: TargetBenchmarksSectionProps) {
  const [isTargetsOpen, setIsTargetsOpen] = useState(false);

  return (
    <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "12px", marginTop: "4px" }}>
      <button
        type="button"
        onClick={() => setIsTargetsOpen(!isTargetsOpen)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          color: "var(--text-primary)",
          fontWeight: 600,
          fontSize: "0.85rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: "4px 0",
          outline: "none"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Target Category Benchmarks
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2.5"
          style={{
            transform: isTargetsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isTargetsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Hitting Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid rgba(99, 102, 241, 0.15)", paddingBottom: "2px", letterSpacing: "0.05em" }}>
                HITTING
              </span>

              {/* R */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Runs (R)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.R}
                  onChange={(e) => onTargetsChange({ ...targets, R: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* HR */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Home Runs (HR)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.HR}
                  onChange={(e) => onTargetsChange({ ...targets, HR: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* RBI */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>RBI</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.RBI}
                  onChange={(e) => onTargetsChange({ ...targets, RBI: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* SB */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Stolen Bases (SB)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.SB}
                  onChange={(e) => onTargetsChange({ ...targets, SB: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* AVG */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Average (AVG)</label>
                <input
                  className="premium-input"
                  type="number"
                  step="0.001"
                  value={targets.AVG}
                  onChange={(e) => onTargetsChange({ ...targets, AVG: parseFloat(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>

            {/* Pitching Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--secondary)", borderBottom: "1px solid rgba(6, 182, 212, 0.15)", paddingBottom: "2px", letterSpacing: "0.05em" }}>
                PITCHING
              </span>

              {/* W */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Wins (W)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.W}
                  onChange={(e) => onTargetsChange({ ...targets, W: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* SV */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Saves (SV)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.SV}
                  onChange={(e) => onTargetsChange({ ...targets, SV: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* SO */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Strikeouts (SO)</label>
                <input
                  className="premium-input"
                  type="number"
                  value={targets.SO}
                  onChange={(e) => onTargetsChange({ ...targets, SO: parseInt(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* ERA */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>ERA</label>
                <input
                  className="premium-input"
                  type="number"
                  step="0.01"
                  value={targets.ERA}
                  onChange={(e) => onTargetsChange({ ...targets, ERA: parseFloat(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              {/* WHIP */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>WHIP</label>
                <input
                  className="premium-input"
                  type="number"
                  step="0.01"
                  value={targets.WHIP}
                  onChange={(e) => onTargetsChange({ ...targets, WHIP: parseFloat(e.target.value) || 0 })}
                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Reset Targets Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onTargetsChange({ ...DEFAULT_TARGETS })}
            style={{
              padding: "6px 10px",
              fontSize: "0.75rem",
              marginTop: "4px",
              alignSelf: "flex-end"
            }}
          >
            Reset Targets to Default
          </button>
        </div>
      )}
    </div>
  );
}
