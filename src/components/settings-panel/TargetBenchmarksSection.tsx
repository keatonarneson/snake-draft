"use client";

import React, { useState } from "react";
import { DisclosureSection, NumberField } from "../ui";
import { LEAGUE_TARGETS, type LeagueTargets } from "../../engine/config";

export type TargetBenchmarks = LeagueTargets;

const DEFAULT_TARGETS: TargetBenchmarks = LEAGUE_TARGETS;

const HITTING_FIELDS: {
  key: keyof TargetBenchmarks;
  label: string;
  parse?: "int" | "float";
  step?: string;
}[] = [
  { key: "R", label: "Runs (R)" },
  { key: "HR", label: "Home Runs (HR)" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "Stolen Bases (SB)" },
  { key: "AVG", label: "Average (AVG)", parse: "float", step: "0.001" },
];

const PITCHING_FIELDS: typeof HITTING_FIELDS = [
  { key: "W", label: "Wins (W)" },
  { key: "SV", label: "Saves (SV)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "ERA", label: "ERA", parse: "float", step: "0.01" },
  { key: "WHIP", label: "WHIP", parse: "float", step: "0.01" },
];

interface TargetBenchmarksSectionProps {
  targets: TargetBenchmarks;
  onTargetsChange: (targets: TargetBenchmarks) => void;
}

function TargetColumn({
  title,
  color,
  fields,
  targets,
  onTargetsChange,
}: {
  title: string;
  color: string;
  fields: typeof HITTING_FIELDS;
  targets: TargetBenchmarks;
  onTargetsChange: (targets: TargetBenchmarks) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color,
          borderBottom: `1px solid ${color === "var(--primary)" ? "rgba(99, 102, 241, 0.15)" : "rgba(6, 182, 212, 0.15)"}`,
          paddingBottom: "2px",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </span>

      {fields.map((field) => (
        <NumberField
          key={field.key}
          compact
          label={field.label}
          value={targets[field.key]}
          parse={field.parse}
          step={field.step}
          onValueChange={(value) => onTargetsChange({ ...targets, [field.key]: value })}
        />
      ))}
    </div>
  );
}

export default function TargetBenchmarksSection({
  targets,
  onTargetsChange,
}: TargetBenchmarksSectionProps) {
  const [isTargetsOpen, setIsTargetsOpen] = useState(false);

  return (
    <DisclosureSection
      title="Target Category Benchmarks"
      isOpen={isTargetsOpen}
      onToggle={() => setIsTargetsOpen(!isTargetsOpen)}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <TargetColumn
          title="HITTING"
          color="var(--primary)"
          fields={HITTING_FIELDS}
          targets={targets}
          onTargetsChange={onTargetsChange}
        />
        <TargetColumn
          title="PITCHING"
          color="var(--secondary)"
          fields={PITCHING_FIELDS}
          targets={targets}
          onTargetsChange={onTargetsChange}
        />
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onTargetsChange({ ...DEFAULT_TARGETS })}
        style={{
          padding: "6px 10px",
          fontSize: "0.75rem",
          marginTop: "4px",
          alignSelf: "flex-end",
        }}
      >
        Reset Targets to Default
      </button>
    </DisclosureSection>
  );
}
