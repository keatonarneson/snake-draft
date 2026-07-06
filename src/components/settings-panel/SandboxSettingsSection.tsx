"use client";

import React, { useState } from "react";
import { RiskStyle, SavesStrategy, useSandboxSettings } from "./SandboxSettingsContext";

const PRESET_BUTTONS = [
  { id: "balanced", label: "Balanced" },
  { id: "value_hunter", label: "Value Hunter" },
  { id: "market_realist", label: "Market Realist" },
  { id: "category_builder", label: "Category Builder" },
  { id: "upside_chaser", label: "Upside Chaser" },
  { id: "safe_draft", label: "Safe Draft" },
];

export default function SandboxSettingsSection() {
  const {
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
  } = useSandboxSettings();

  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
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
              {PRESET_BUTTONS.map((preset) => (
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
              {(["safe", "balanced", "aggressive"] as const).map((mode: RiskStyle) => (
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
              {(["wait", "balanced", "aggressive"] as const).map((mode: SavesStrategy) => (
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
  );
}
