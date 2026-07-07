"use client";

import React, { useState } from "react";
import { RiskStyle, SavesStrategy, useSandboxSettings } from "./SandboxSettingsContext";
import { DisclosureSection, SegmentedControl, SliderField } from "../ui";

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
    <DisclosureSection
      title="Algorithm Sandbox Settings"
      isOpen={isSandboxOpen}
      onToggle={() => setIsSandboxOpen(!isSandboxOpen)}
      icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
      }
    >
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
          <SliderField label="Trust Projections" value={trustProjections} min={0.5} max={2.0} step={0.1} onChange={(value) => onSandboxChange({ trustProjections: value })} />
          <SliderField label="Draft Urgency" value={draftUrgency} min={0.0} max={2.0} step={0.1} onChange={(value) => onSandboxChange({ draftUrgency: value })} />
          <SliderField label="Category Balance" value={categoryBalance} min={0.0} max={3.0} step={0.1} onChange={(value) => onSandboxChange({ categoryBalance: value })} />
          <SliderField label="Roster Fit" value={rosterFit} min={0.0} max={2.0} step={0.1} onChange={(value) => onSandboxChange({ rosterFit: value })} />
          <SliderField label="Position Pressure" value={positionScarcity} min={0.0} max={3.0} step={0.1} onChange={(value) => onSandboxChange({ positionScarcity: value })} />
          <SliderField label="Reach Tolerance" value={reachTolerance} min={0.0} max={2.0} step={0.1} onChange={(value) => onSandboxChange({ reachTolerance: value })} />

          {/* Risk Style Segment */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Risk Style</label>
            <SegmentedControl
              options={(["safe", "balanced", "aggressive"] as const).map((mode: RiskStyle) => ({ id: mode, label: mode.toUpperCase() }))}
              value={riskStyle}
              onChange={(mode) => onSandboxChange({ riskStyle: mode })}
            />
          </div>

          {/* Saves Strategy Segment */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Saves Strategy</label>
            <SegmentedControl
              options={(["wait", "balanced", "aggressive"] as const).map((mode: SavesStrategy) => ({ id: mode, label: mode.toUpperCase() }))}
              value={savesStrategy}
              onChange={(mode) => onSandboxChange({ savesStrategy: mode })}
            />
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
                <SliderField
                  compact
                  label="Rank Scarcity Dilution"
                  value={rankScarcityCoeff}
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  valueLabel={`$${rankScarcityCoeff.toFixed(2)} / rank`}
                  onChange={(value) => onSandboxChange({ rankScarcityCoeff: value })}
                />
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
    </DisclosureSection>
  );
}
