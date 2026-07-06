"use client";

import React from "react";
import { ProjectionSystem } from "../../data/projections";

interface DraftConfigSectionProps {
  numTeams: number;
  userPosition: number;
  numRounds: number;
  draftMode: "mock" | "live";
  simSpeed: "manual" | "paced" | "instant";
  cpuProfileMode: "fixed" | "random";
  isDraftStarted: boolean;
  projectionSystem: ProjectionSystem;
  onProjectionSystemChange: (system: ProjectionSystem) => void;
  onConfigChange: (config: {
    numTeams?: number;
    userPosition?: number;
    numRounds?: number;
    draftMode?: "mock" | "live";
    simSpeed?: "manual" | "paced" | "instant";
    cpuProfileMode?: "fixed" | "random";
  }) => void;
}

export default function DraftConfigSection({
  numTeams,
  userPosition,
  numRounds,
  draftMode,
  simSpeed,
  cpuProfileMode,
  isDraftStarted,
  projectionSystem,
  onProjectionSystemChange,
  onConfigChange,
}: DraftConfigSectionProps) {
  return (
    <>
      {/* Teams */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          League Size (Teams)
        </label>
        <select
          className="premium-input"
          value={numTeams}
          disabled={isDraftStarted}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onConfigChange({
              numTeams: val,
              // Adjust user position if it falls outside the new range
              userPosition: userPosition > val ? val : userPosition,
            });
          }}
          style={{ width: "100%" }}
        >
          <option value={8}>8 Teams</option>
          <option value={10}>10 Teams</option>
          <option value={12}>12 Teams</option>
          <option value={14}>14 Teams</option>
          <option value={15}>15 Teams</option>
        </select>
      </div>

      {/* User Slot */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Your Draft Position (Slot {userPosition})
        </label>
        <input
          className="premium-input"
          type="number"
          min={1}
          max={numTeams}
          value={userPosition}
          disabled={isDraftStarted}
          onChange={(e) => {
            const val = Math.max(1, Math.min(numTeams, parseInt(e.target.value) || 1));
            onConfigChange({ userPosition: val });
          }}
          style={{ width: "100%" }}
        />
      </div>

      {/* Rounds */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Draft Rounds
        </label>
        <input
          className="premium-input"
          type="number"
          min={5}
          max={40}
          value={numRounds}
          disabled={isDraftStarted}
          onChange={(e) => {
            const val = Math.max(5, Math.min(40, parseInt(e.target.value) || 30));
            onConfigChange({ numRounds: val });
          }}
          style={{ width: "100%" }}
        />
      </div>

      {/* Draft Mode */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Draft Mode
        </label>
        <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", padding: "2px", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
          {([
            { id: "mock", label: "Mock" },
            { id: "live", label: "Live" },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={isDraftStarted}
              onClick={() => onConfigChange({ draftMode: mode.id })}
              style={{
                flex: 1,
                padding: "7px 8px",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "none",
                background: draftMode === mode.id ? "var(--primary)" : "transparent",
                color: draftMode === mode.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: isDraftStarted ? "not-allowed" : "pointer",
                fontWeight: draftMode === mode.id ? 700 : 500,
                opacity: isDraftStarted ? 0.55 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {draftMode === "live" && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", lineHeight: 1.35 }}>
            Record each real draft pick as it happens. CPU auto-picks stay off.
          </span>
        )}
      </div>

      {/* Projections System */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Projections Database
        </label>
        <select
          className="premium-input"
          value={projectionSystem}
          disabled={isDraftStarted}
          onChange={(e) => {
            onProjectionSystemChange(e.target.value as ProjectionSystem);
          }}
          style={{ width: "100%" }}
        >
          <option value="oopsy">Oopsy Projections</option>
          <option value="thebat">THE BAT Projections</option>
          <option value="steamer">Steamer Projections</option>
          <option value="mock">Mock Projections (Built-in)</option>
        </select>
      </div>

      {/* Simulation Speed */}
      {draftMode === "mock" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          CPU Pick Behavior
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="simSpeed"
              checked={simSpeed === "paced"}
              onChange={() => onConfigChange({ simSpeed: "paced" })}
              style={{ accentColor: "var(--primary)" }}
            />
            Paced (500ms / pick)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="simSpeed"
              checked={simSpeed === "instant"}
              onChange={() => onConfigChange({ simSpeed: "instant" })}
              style={{ accentColor: "var(--primary)" }}
            />
            Instant CPU Drafting
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="simSpeed"
              checked={simSpeed === "manual"}
              onChange={() => onConfigChange({ simSpeed: "manual" })}
              style={{ accentColor: "var(--primary)" }}
            />
            Manual CPU Drafting
          </label>
        </div>
      </div>
      )}

      {/* CPU Profile Assignment */}
      {draftMode === "mock" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          CPU Profile Assignment
        </label>
        <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", padding: "2px", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
          {([
            { id: "fixed", label: "Fixed" },
            { id: "random", label: "Randomized" },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={isDraftStarted}
              onClick={() => onConfigChange({ cpuProfileMode: mode.id })}
              style={{
                flex: 1,
                padding: "7px 8px",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "none",
                background: cpuProfileMode === mode.id ? "var(--primary)" : "transparent",
                color: cpuProfileMode === mode.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: isDraftStarted ? "not-allowed" : "pointer",
                fontWeight: cpuProfileMode === mode.id ? 700 : 500,
                opacity: isDraftStarted ? 0.55 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
