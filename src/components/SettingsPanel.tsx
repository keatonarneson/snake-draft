"use client";

import React from "react";
import { ProjectionSystem } from "../data/projections";
import {
  DraftConfigSection,
  SandboxSettingsSection,
  TargetBenchmarksSection,
  TargetBenchmarks,
} from "./settings-panel";

interface SettingsPanelProps {
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
  onReset: () => void;
  onAutoPick: () => void;
  onStartDraft: () => void;

  targets: TargetBenchmarks;
  onTargetsChange: (targets: TargetBenchmarks) => void;
}

export default function SettingsPanel({
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
  onReset,
  onAutoPick,
  onStartDraft,
  targets,
  onTargetsChange,
}: SettingsPanelProps) {
  return (
    <div className="card glow-panel">
      <div className="cardHeader">
        <h3 className="cardTitle">
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
        <DraftConfigSection
          numTeams={numTeams}
          userPosition={userPosition}
          numRounds={numRounds}
          draftMode={draftMode}
          simSpeed={simSpeed}
          cpuProfileMode={cpuProfileMode}
          isDraftStarted={isDraftStarted}
          projectionSystem={projectionSystem}
          onProjectionSystemChange={onProjectionSystemChange}
          onConfigChange={onConfigChange}
        />

        {/* Algorithm sandbox weights are supplied via SandboxSettingsProvider. */}
        <SandboxSettingsSection />

        <TargetBenchmarksSection targets={targets} onTargetsChange={onTargetsChange} />

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
              {draftMode === "live" ? "Start Live Draft" : "Start Draft"}
            </button>
          ) : (
            <>
              {draftMode === "mock" && simSpeed === "manual" && (
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
