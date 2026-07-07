"use client";

import React, { useMemo, useState } from "react";
import { CpuProfile, getCpuProfile, getCpuProfileTemplates } from "../../engine";
import { ModalShell, SegmentedControl } from "../ui";

interface CpuProfilesModalProps {
  isOpen: boolean;
  teamNames: string[];
  userTeamIndex: number;
  cpuProfiles: CpuProfile[];
  onClose: () => void;
}

const profileWeightRows: { key: keyof CpuProfile; label: string }[] = [
  { key: "marketTrust", label: "Market Trust" },
  { key: "projectionTrust", label: "Projection Trust" },
  { key: "rosterNeed", label: "Roster Need" },
  { key: "categoryNeed", label: "Category Need" },
  { key: "scarcity", label: "Scarcity" },
  { key: "runReaction", label: "Run Reaction" },
  { key: "upside", label: "Upside" },
  { key: "reachTolerance", label: "Reach Tolerance" },
  { key: "pitcherPreference", label: "Pitcher Lean" },
  { key: "hitterPreference", label: "Hitter Lean" },
  { key: "closerAggression", label: "Closer Aggression" },
  { key: "randomness", label: "Randomness" },
];

export default function CpuProfilesModal({
  isOpen,
  teamNames,
  userTeamIndex,
  cpuProfiles,
  onClose,
}: CpuProfilesModalProps) {
  const [profilesTab, setProfilesTab] = useState<"assigned" | "library">("assigned");

  const profileRows = useMemo(() => {
    return teamNames.map((teamName, index) => ({
      name: teamName,
      isUser: index === userTeamIndex,
      profile: cpuProfiles[index] || getCpuProfile(index, userTeamIndex),
    }));
  }, [teamNames, userTeamIndex, cpuProfiles]);

  const profileLibraryRows = useMemo(() => {
    return getCpuProfileTemplates().map((profile) => ({
      name: profile.label,
      isUser: false,
      profile,
    }));
  }, []);

  const visibleProfileRows = profilesTab === "assigned" ? profileRows : profileLibraryRows;

  return (
    <ModalShell
      isOpen={isOpen}
      title="CPU Profiles"
      subtitle="Persistent team behavior weights used by the CPU draft model."
      width="calc(100vw - 48px)"
      maxWidth="1680px"
      maxHeight="90vh"
      onClose={onClose}
    >
      <div style={{ alignSelf: "flex-start", minWidth: "280px" }}>
        <SegmentedControl
          accent="accent"
          options={[
            { id: "assigned", label: "Assigned Teams" },
            { id: "library", label: "All Profiles" },
          ]}
          value={profilesTab}
          onChange={setProfilesTab}
        />
      </div>

      <div style={{ overflow: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: "1480px" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "left", position: "sticky", left: 0, background: "#172033", zIndex: 2, minWidth: "150px" }}>{profilesTab === "assigned" ? "Team" : "Profile"}</th>
              <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "left", minWidth: "150px" }}>Profile</th>
              <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "left", minWidth: "100px" }}>Type</th>
              <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "left", minWidth: "90px" }}>SV Plan</th>
              {profileWeightRows.map((weight) => (
                <th key={weight.key} style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "right", whiteSpace: "nowrap", minWidth: "110px" }}>
                  {weight.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleProfileRows.map(({ name, isUser, profile }) => (
              <tr key={`${profilesTab}-${name}-${profile.id}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isUser ? "rgba(99, 102, 241, 0.06)" : "transparent" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: isUser ? "var(--primary)" : "var(--text-primary)", position: "sticky", left: 0, background: isUser ? "#19203a" : "#111827", zIndex: 1 }}>
                  {name}
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {profile.label}
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {profile.archetype}
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {profile.savesStrategy}
                </td>
                {profileWeightRows.map((weight) => {
                  const value = Number(profile[weight.key]);
                  return (
                    <td
                      key={weight.key}
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color: value > 1.15 ? "var(--success)" : value < 0.85 ? "var(--warning)" : "var(--text-secondary)",
                        fontWeight: value > 1.15 || value < 0.85 ? 700 : 500,
                      }}
                    >
                      {value.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
