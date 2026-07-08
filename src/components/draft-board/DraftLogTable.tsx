"use client";

import React, { Dispatch, SetStateAction } from "react";
import { CpuProfile, DraftPick, getCpuArchetype, getCpuProfile } from "../../engine";
import { Player } from "../../types/draft";
import { DraftLogFilterType, DraftLogSortKey } from "./useDraftLogState";

interface DraftLogTableProps {
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  playerMap: Map<string, Player>;
  cpuSavesStrategies: string[];
  cpuProfiles: CpuProfile[];
  debugSearchQuery: string;
  setDebugSearchQuery: Dispatch<SetStateAction<string>>;
  debugFilterType: DraftLogFilterType;
  setDebugFilterType: Dispatch<SetStateAction<DraftLogFilterType>>;
  debugSortKey: DraftLogSortKey;
  expandedPickIndex: number | null;
  setExpandedPickIndex: Dispatch<SetStateAction<number | null>>;
  filteredPicks: DraftPick[];
  setDraftLogSort: (sortKey: DraftLogSortKey) => void;
  getDraftLogSortLabel: (sortKey: DraftLogSortKey) => string;
}

export default function DraftLogTable({
  currentPickIndex,
  teamNames,
  userTeamIndex,
  playerMap,
  cpuSavesStrategies,
  cpuProfiles,
  debugSearchQuery,
  setDebugSearchQuery,
  debugFilterType,
  setDebugFilterType,
  debugSortKey,
  expandedPickIndex,
  setExpandedPickIndex,
  filteredPicks,
  setDraftLogSort,
  getDraftLogSortLabel,
}: DraftLogTableProps) {
  return (
    <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", gap: "8px", flexGrow: 1, maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="Search by player or team name..."
              value={debugSearchQuery}
              onChange={(e) => setDebugSearchQuery(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                padding: "6px 12px",
                fontSize: "0.8rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {(["all", "drafted", "undrafted"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDebugFilterType(type)}
                style={{
                  background: debugFilterType === type ? "var(--success)" : "rgba(255,255,255,0.05)",
                  border: "none",
                  color: debugFilterType === type ? "#ffffff" : "var(--text-secondary)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {type === "all" ? "All Picks" : type === "drafted" ? "Drafted Only" : "Pending Only"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {([
              { key: "pick", label: "Pick Order" },
              { key: "team", label: "Team" },
            ] as const).map((sort) => (
              <button
                key={sort.key}
                onClick={() => setDraftLogSort(sort.key)}
                style={{
                  background: debugSortKey === sort.key ? "var(--primary)" : "rgba(255,255,255,0.05)",
                  border: "none",
                  color: debugSortKey === sort.key ? "#ffffff" : "var(--text-secondary)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {sort.label}{getDraftLogSortLabel(sort.key)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flexGrow: 1, overflowY: "auto", background: "rgba(0, 0, 0, 0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                  <button
                    type="button"
                    onClick={() => setDraftLogSort("pick")}
                    style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    Pick #{getDraftLogSortLabel("pick")}
                  </button>
                </th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Round</th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
                  <button
                    type="button"
                    onClick={() => setDraftLogSort("team")}
                    style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    Team{getDraftLogSortLabel("team")}
                  </button>
                </th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Player Drafted</th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>ADP</th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>Min/Max</th>
                <th style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "right" }}>CPU Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredPicks.map((pick) => {
                const isDrafted = pick.playerDraftedId !== null;
                const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
                const isUser = pick.teamIndex === userTeamIndex;
                const isExpanded = expandedPickIndex === pick.overallPick;
                const cpuDetails = pick.cpuScoreDetails;
                const cpuProfile = cpuProfiles[pick.teamIndex] || getCpuProfile(pick.teamIndex, userTeamIndex);
                const cpuArchetype = isUser ? "USER" : cpuProfile.archetype || getCpuArchetype(pick.teamIndex, userTeamIndex);
                const cpuProfileLabel = isUser ? "USER" : cpuProfile.label;
                const cpuSavesStrategy = cpuProfile.savesStrategy || cpuSavesStrategies[pick.teamIndex] || "balanced";

                let rowBg = "transparent";
                if (isUser) {
                  rowBg = "rgba(99, 102, 241, 0.03)";
                } else if (pick.overallPick === currentPickIndex + 1) {
                  rowBg = "rgba(245, 158, 11, 0.05)";
                }

                return (
                  <React.Fragment key={pick.overallPick}>
                    <tr
                      onClick={() => {
                        if (isDrafted && cpuDetails) {
                          setExpandedPickIndex(isExpanded ? null : pick.overallPick);
                        }
                      }}
                      style={{
                        background: rowBg,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        cursor: isDrafted && cpuDetails ? "pointer" : "default",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        #{pick.overallPick}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        Round {pick.round}, Pick {pick.pickInRound}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: isUser ? 700 : 500, color: isUser ? "var(--primary)" : "var(--text-primary)" }}>
                            {teamNames[pick.teamIndex]}
                          </span>
                          <span
                            className={`badge ${
                              isUser
                                ? "badge-primary"
                                : cpuArchetype === "market"
                                ? "badge-secondary"
                                : cpuArchetype === "projection"
                                ? "badge-accent"
                                : cpuArchetype === "need"
                                ? "badge-warning"
                                : cpuArchetype === "upside"
                                ? "badge-danger"
                                : "badge-outline"
                            }`}
                            style={{ fontSize: "0.55rem", padding: "1px 5px", textTransform: "uppercase" }}
                          >
                            {cpuProfileLabel}
                          </span>
                          {!isUser && (
                            <span
                              className={`badge ${
                                cpuSavesStrategy === "aggressive"
                                  ? "badge-danger"
                                  : cpuSavesStrategy === "wait"
                                  ? "badge-secondary"
                                  : "badge-outline"
                              }`}
                              style={{ fontSize: "0.55rem", padding: "1px 5px", textTransform: "uppercase" }}
                            >
                              {cpuSavesStrategy} SV
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {draftedPlayer ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {draftedPlayer.name}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              {draftedPlayer.positions.join("/")} - {draftedPlayer.team}
                            </span>
                          </div>
                        ) : pick.overallPick === currentPickIndex + 1 ? (
                          <span style={{ color: "var(--warning)", fontWeight: 700 }}>
                            ON THE CLOCK
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>
                        {draftedPlayer ? draftedPlayer.adp.toFixed(1) : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {draftedPlayer ? `${draftedPlayer.minPick || 1}-${draftedPlayer.maxPick || 350}` : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {isDrafted ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <span style={{ fontWeight: 700, color: pick.cpuScore !== undefined && pick.cpuScore >= 30 ? "var(--success)" : pick.cpuScore !== undefined && pick.cpuScore >= 15 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              {pick.cpuScore !== undefined ? pick.cpuScore.toFixed(2) : "-"}
                            </span>
                            {cpuDetails && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", color: "var(--text-muted)" }}
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            )}
                          </div>
                        ) : "-"}
                      </td>
                    </tr>

                    {isExpanded && cpuDetails && (
                      <tr style={{ background: "rgba(255,255,255,0.01)" }}>
                        <td colSpan={7} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Base Value</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700 }}>
                                ${cpuDetails.baseValue.toFixed(2)}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                ADP: ${cpuDetails.adpDollars.toFixed(1)} | Consensus: ${cpuDetails.consensusDollars.toFixed(1)}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Positional scarcity</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: cpuDetails.scarcityBonus > 0 ? "var(--primary)" : "var(--text-secondary)" }}>
                                +{cpuDetails.scarcityBonus.toFixed(2)}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Roster, Cat & Saves</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.rosterNeedBonus + cpuDetails.categoryNeedBonus + (cpuDetails.savesStrategyBonus || 0)) > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                                +{(cpuDetails.rosterNeedBonus + cpuDetails.categoryNeedBonus + (cpuDetails.savesStrategyBonus || 0)).toFixed(2)}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                Roster: +{cpuDetails.rosterNeedBonus.toFixed(1)} | Cat: +{cpuDetails.categoryNeedBonus.toFixed(1)} | SV: {cpuDetails.savesStrategyBonus > 0 ? "+" : ""}{(cpuDetails.savesStrategyBonus || 0).toFixed(1)}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Upside & Urgency</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.upsideBonus + cpuDetails.positionRunBonus + (cpuDetails.urgencyBonus || 0)) > 0 ? "var(--accent)" : "var(--text-secondary)" }}>
                                +{(cpuDetails.upsideBonus + cpuDetails.positionRunBonus + (cpuDetails.urgencyBonus || 0)).toFixed(2)}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                Upside: +{cpuDetails.upsideBonus.toFixed(1)} | Runs: +{cpuDetails.positionRunBonus.toFixed(1)} | Urg: +{(cpuDetails.urgencyBonus || 0).toFixed(1)}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Playing Time / Noise</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: (cpuDetails.roleSecurityBonus + cpuDetails.randomNoise) >= 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                +{(cpuDetails.roleSecurityBonus + cpuDetails.randomNoise).toFixed(2)}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                PT: +{cpuDetails.roleSecurityBonus.toFixed(1)} | Noise: {cpuDetails.randomNoise >= 0 ? "+" : ""}{cpuDetails.randomNoise.toFixed(1)}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--danger)", textTransform: "uppercase" }}>Penalties</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: "var(--danger)" }}>
                                -{(cpuDetails.reachPenalty + cpuDetails.rosterPenalty).toFixed(2)}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                Reach: -{cpuDetails.reachPenalty.toFixed(1)} | Roster: -{cpuDetails.rosterPenalty.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredPicks.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No picks matched your search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </>
  );
}
