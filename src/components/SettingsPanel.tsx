"use client";

import React, { useState } from "react";
import styles from "../app/page.module.css";
import { ProjectionSystem } from "../data/projections";

interface SettingsPanelProps {
  numTeams: number;
  userPosition: number;
  numRounds: number;
  simSpeed: "manual" | "paced" | "instant";
  cpuProfileMode: "fixed" | "random";
  isDraftStarted: boolean;
  projectionSystem: ProjectionSystem;
  onProjectionSystemChange: (system: ProjectionSystem) => void;
  onConfigChange: (config: {
    numTeams?: number;
    userPosition?: number;
    numRounds?: number;
    simSpeed?: "manual" | "paced" | "instant";
    cpuProfileMode?: "fixed" | "random";
  }) => void;
  onReset: () => void;
  onAutoPick: () => void;
  onStartDraft: () => void;

  trustProjections: number;
  draftUrgency: number;
  categoryBalance: number;
  rosterFit: number;
  positionScarcity: number;
  riskStyle: "safe" | "balanced" | "aggressive";
  reachTolerance: number;
  savesStrategy: "wait" | "balanced" | "aggressive";
  rankScarcityCoeff: number;
  activePreset: string;
  onPresetSelect: (presetName: string) => void;
  onSandboxChange: (changes: {
    trustProjections?: number;
    draftUrgency?: number;
    categoryBalance?: number;
    rosterFit?: number;
    positionScarcity?: number;
    riskStyle?: "safe" | "balanced" | "aggressive";
    reachTolerance?: number;
    savesStrategy?: "wait" | "balanced" | "aggressive";
    rankScarcityCoeff?: number;
  }) => void;

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
  onTargetsChange: (targets: {
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
  }) => void;
}

export default function SettingsPanel({
  numTeams,
  userPosition,
  numRounds,
  simSpeed,
  cpuProfileMode,
  isDraftStarted,
  projectionSystem,
  onProjectionSystemChange,
  onConfigChange,
  onReset,
  onAutoPick,
  onStartDraft,
  trustProjections,
  draftUrgency,
  categoryBalance,
  rosterFit,
  positionScarcity,
  riskStyle,
  reachTolerance,
  savesStrategy,
  rankScarcityCoeff,
  activePreset,
  onPresetSelect,
  onSandboxChange,
  targets,
  onTargetsChange,
}: SettingsPanelProps) {
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isTargetsOpen, setIsTargetsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  return (
    <div className={styles.card}>
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Draft Settings
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

        {/* CPU Profile Assignment */}
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

        {/* Collapsible Sandbox Settings */}
        <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "12px", marginTop: "4px" }}>
          <button
            onClick={() => setIsSandboxOpen(!isSandboxOpen)}
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
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Algorithm Sandbox Settings
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="2.5"
              style={{
                transform: isSandboxOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease"
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isSandboxOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              {/* Preset Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  Draft Preset
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { id: "balanced", label: "Balanced" },
                    { id: "value_hunter", label: "Value Hunter" },
                    { id: "market_realist", label: "Market Realist" },
                    { id: "category_builder", label: "Category Builder" },
                    { id: "upside_chaser", label: "Upside Chaser" },
                    { id: "safe_draft", label: "Safe Draft" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onPresetSelect(preset.id)}
                      style={{
                        padding: "6px 8px",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                        border: activePreset === preset.id 
                          ? "1px solid var(--primary)" 
                          : "1px solid var(--glass-border)",
                        background: activePreset === preset.id 
                          ? "rgba(99, 102, 241, 0.15)" 
                          : "rgba(255, 255, 255, 0.02)",
                        color: activePreset === preset.id 
                          ? "#a5b4fc" 
                          : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: activePreset === preset.id ? 700 : 500,
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {activePreset === "custom" && (
                  <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontStyle: "italic", marginTop: "2px" }}>
                    Customized parameters active
                  </span>
                )}
              </div>

              {/* Sliders */}
              {/* Trust Projections */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Trust Projections</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{trustProjections.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={trustProjections}
                  onChange={(e) => onSandboxChange({ trustProjections: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Draft Urgency */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Draft Urgency</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{draftUrgency.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={draftUrgency}
                  onChange={(e) => onSandboxChange({ draftUrgency: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Category Balance */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Category Balance</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{categoryBalance.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="3.0"
                  step="0.1"
                  value={categoryBalance}
                  onChange={(e) => onSandboxChange({ categoryBalance: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Roster Fit */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Roster Fit</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{rosterFit.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={rosterFit}
                  onChange={(e) => onSandboxChange({ rosterFit: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Position Pressure */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Position Pressure</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{positionScarcity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="3.0"
                  step="0.1"
                  value={positionScarcity}
                  onChange={(e) => onSandboxChange({ positionScarcity: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Reach Tolerance */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Reach Tolerance</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>{reachTolerance.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={reachTolerance}
                  onChange={(e) => onSandboxChange({ reachTolerance: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                />
              </div>

              {/* Risk Style Segment */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Risk Style</label>
                <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", padding: "2px", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
                  {(["safe", "balanced", "aggressive"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSandboxChange({ riskStyle: mode })}
                      style={{
                        flex: 1,
                        padding: "5px 8px",
                        fontSize: "0.75rem",
                        borderRadius: "4px",
                        border: "none",
                        background: riskStyle === mode ? "var(--primary)" : "transparent",
                        color: riskStyle === mode ? "var(--text-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: riskStyle === mode ? 600 : 400,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saves Strategy Segment */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Saves Strategy</label>
                <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", padding: "2px", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
                  {(["wait", "balanced", "aggressive"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSandboxChange({ savesStrategy: mode })}
                      style={{
                        flex: 1,
                        padding: "5px 8px",
                        fontSize: "0.75rem",
                        borderRadius: "4px",
                        border: "none",
                        background: savesStrategy === mode ? "var(--primary)" : "transparent",
                        color: savesStrategy === mode ? "var(--text-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: savesStrategy === mode ? 600 : 400,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings collapsible drawer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    outline: "none"
                  }}
                >
                  <span>{isAdvancedOpen ? "Hide" : "Show"} Advanced Parameters</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ transform: isAdvancedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", marginLeft: "4px" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isAdvancedOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.1)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Rank Scarcity Dilution</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>${rankScarcityCoeff.toFixed(2)} / rank</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="0.50"
                        step="0.01"
                        value={rankScarcityCoeff}
                        onChange={(e) => onSandboxChange({ rankScarcityCoeff: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", outline: "none" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reset to Balanced default */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onPresetSelect("balanced")}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  marginTop: "4px",
                  alignSelf: "flex-end"
                }}
              >
                Reset to Balanced Default
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Targets Settings */}
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
                onClick={() =>
                  onTargetsChange({
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
                  })
                }
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

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
          {!isDraftStarted ? (
            <button className="btn btn-primary" onClick={onStartDraft} style={{ width: "100%", padding: "12px 16px", fontSize: "0.95rem" }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Draft
            </button>
          ) : (
            <>
              {simSpeed === "manual" && (
                <button className="btn btn-primary" onClick={onAutoPick} style={{ width: "100%" }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Trigger CPU Pick
                </button>
              )}

              <button className="btn btn-danger" onClick={onReset} style={{ width: "100%" }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset Draft
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
