"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CpuProfile, getCpuProfile, getCpuProfileTemplates } from "../../engine";

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

  if (!isOpen || typeof document === "undefined") return null;

  const visibleProfileRows = profilesTab === "assigned" ? profileRows : profileLibraryRows;

  return createPortal((
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(8, 11, 17, 0.78)",
        backdropFilter: "blur(10px)",
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "calc(100vw - 48px)",
          maxWidth: "1680px",
          maxHeight: "90vh",
          background: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              CPU Profiles
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Persistent team behavior weights used by the CPU draft model.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "var(--text-muted)",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "3px", gap: "3px" }}>
          {([
            { id: "assigned", label: "Assigned Teams" },
            { id: "library", label: "All Profiles" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProfilesTab(tab.id)}
              style={{
                border: "none",
                borderRadius: "6px",
                padding: "7px 12px",
                fontSize: "0.76rem",
                fontWeight: profilesTab === tab.id ? 800 : 600,
                cursor: "pointer",
                background: profilesTab === tab.id ? "var(--accent)" : "transparent",
                color: profilesTab === tab.id ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              {tab.label}
            </button>
          ))}
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
      </div>
    </div>
  ), document.body);
}
