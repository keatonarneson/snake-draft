"use client";

import React from "react";
import { ProjectionSystem } from "../../data/projections";
import { Field, NumberField, SegmentedControl } from "../ui";

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
      <Field label="League Size (Teams)">
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
      </Field>

      {/* User Slot */}
      <NumberField
        label={`Your Draft Position (Slot ${userPosition})`}
        value={userPosition}
        disabled={isDraftStarted}
        onValueChange={(value) => {
          const val = Math.max(1, Math.min(numTeams, value || 1));
          onConfigChange({ userPosition: val });
        }}
          min={1}
          max={numTeams}
      />

      {/* Rounds */}
      <NumberField
        label="Draft Rounds"
        value={numRounds}
        disabled={isDraftStarted}
        onValueChange={(value) => {
          const val = Math.max(5, Math.min(40, value || 30));
          onConfigChange({ numRounds: val });
        }}
          min={5}
          max={40}
      />

      {/* Draft Mode */}
      <Field
        label="Draft Mode"
        hint={draftMode === "live" ? "Record each real draft pick as it happens. CPU auto-picks stay off." : undefined}
      >
        <SegmentedControl
          options={[
            { id: "mock", label: "Mock" },
            { id: "live", label: "Live" },
          ]}
          value={draftMode}
          disabled={isDraftStarted}
          onChange={(mode) => onConfigChange({ draftMode: mode })}
        />
      </Field>

      {/* Projections System */}
      <Field label="Projections Database">
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
      </Field>

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
        <Field label="CPU Profile Assignment">
          <SegmentedControl
            options={[
              { id: "fixed", label: "Fixed" },
              { id: "random", label: "Randomized" },
            ]}
            value={cpuProfileMode}
            disabled={isDraftStarted}
            onChange={(mode) => onConfigChange({ cpuProfileMode: mode })}
          />
        </Field>
      )}
    </>
  );
}
