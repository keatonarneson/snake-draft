"use client";

import React, { useState, useMemo } from "react";
import styles from "../app/page.module.css";
import { Player } from "../utils/sampleData";
import { Recommendation, calculateAdpValue, calculateCpuScore } from "../utils/draftEngine";

interface PlayerListProps {
  availablePlayers: Player[];
  draftedPlayers: { player: Player; overallPick: number; round: number; teamName: string; teamIndex: number }[];
  recommendations: Recommendation[];
  onDraftPlayer: (playerId: string) => void;
  isOnClock: boolean; // Is user on the clock?
  currentTeamName: string; // Name of the team currently picking
  currentPickIndex?: number;
  currentTeamIndex?: number;
  numRounds?: number;
  isDraftStarted?: boolean;
  isDraftComplete?: boolean;
}

type SortField = "value" | "adp" | "pReturn" | "name" | "score";
type SortOrder = "asc" | "desc";

export default function PlayerList({
  availablePlayers,
  draftedPlayers,
  recommendations,
  onDraftPlayer,
  isOnClock,
  currentTeamName,
  currentPickIndex,
  currentTeamIndex,
  numRounds,
  isDraftStarted,
  isDraftComplete,
}: PlayerListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("ALL");
  const [showDrafted, setShowDrafted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // Map to get recommendation stats easily
  const recMap = useMemo(() => {
    return new Map(recommendations.map((r) => [r.player.id, r]));
  }, [recommendations]);

  // Positions to filter by
  const positionFilterOptions = ["ALL", "C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "UT"];

  // Toggle expanded row
  const toggleExpand = (playerId: string) => {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null);
    } else {
      setExpandedPlayerId(playerId);
    }
  };

  // Compile full pool based on toggle
  const fullPool = useMemo(() => {
    if (showDrafted) {
      // Create objects that look like available players
      const draftedWithProps: Player[] = draftedPlayers.map((d) => d.player);
      return [...availablePlayers, ...draftedWithProps];
    }
    return availablePlayers;
  }, [availablePlayers, draftedPlayers, showDrafted]);

  // Handle Search and Filter
  const filteredPlayers = useMemo(() => {
    return fullPool.filter((player) => {
      // Search match
      const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        player.team.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Position match
      let posMatch = true;
      if (selectedPosition !== "ALL") {
        if (selectedPosition === "UT") {
          // In fantasy, utility players are usually non-pitchers
          posMatch = !player.isPitcher;
        } else {
          posMatch = player.positions.includes(selectedPosition);
        }
      }

      return nameMatch && posMatch;
    });
  }, [fullPool, searchTerm, selectedPosition]);

  // Handle sorting
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers];
    sorted.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      const aRec = recMap.get(a.id);
      const bRec = recMap.get(b.id);

      if (sortField === "name") {
        aVal = a.name;
        bVal = b.name;
      } else if (sortField === "adp") {
        aVal = a.adp;
        bVal = b.adp;
      } else if (sortField === "value") {
        aVal = a.value;
        bVal = b.value;
      } else if (sortField === "pReturn") {
        aVal = aRec ? aRec.pReturn : 0;
        bVal = bRec ? bRec.pReturn : 0;
      } else if (sortField === "score") {
        aVal = aRec ? aRec.score : a.value;
        bVal = bRec ? bRec.score : b.value;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPlayers, sortField, sortOrder, recMap]);

  // Handle click on column header
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Defaults: ascending for ADP and Name, descending for values & probabilities
      if (field === "adp" || field === "name") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  const getReturnLevel = (p: number) => {
    if (p >= 0.70) return "high";
    if (p >= 0.30) return "med";
    return "low";
  };

  const formatPercent = (p: number) => {
    return `${Math.round(p * 100)}%`;
  };

  return (
    <div className={styles.card} style={{ flexGrow: 1 }}>
      <div className={styles.tableHeaderActions}>
        <h3 className={styles.cardTitle} style={{ margin: 0 }}>
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Player Pool
        </h3>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showDrafted}
              onChange={() => setShowDrafted(!showDrafted)}
              style={{ accentColor: "var(--primary)" }}
            />
            Show Drafted
          </label>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search players by name, team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {positionFilterOptions.map((pos) => (
            <button
              key={pos}
              className={`${styles.filterBtn} ${selectedPosition === pos ? styles.filterBtnActive : ""}`}
              onClick={() => setSelectedPosition(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Player Pool Table */}
      <div className="premium-table-container" style={{ maxHeight: "580px", overflowY: "auto" }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>Info</th>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Player {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => handleSort("adp")} style={{ cursor: "pointer", width: "110px" }}>
                ADP (Range) {sortField === "adp" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th style={{ width: "90px" }}>
                Market $
              </th>
              <th onClick={() => handleSort("value")} style={{ cursor: "pointer", width: "90px" }}>
                Auction $ {sortField === "value" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th style={{ width: "160px" }}>Projections</th>
              <th onClick={() => handleSort("pReturn")} style={{ cursor: "pointer", width: "100px" }}>
                Return Prob {sortField === "pReturn" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => handleSort("score")} style={{ cursor: "pointer", width: "100px" }}>
                Score {sortField === "score" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th style={{ width: "90px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const rec = recMap.get(player.id);
              const isDrafted = draftedPlayers.some((d) => d.player.id === player.id);
              const draftDetail = draftedPlayers.find((d) => d.player.id === player.id);
              const isExpanded = expandedPlayerId === player.id;
              
              const pReturn = rec ? rec.pReturn : 0;
              const recScore = rec ? rec.score : player.value;
              const returnLevel = getReturnLevel(pReturn);

              return (
                <React.Fragment key={player.id}>
                  <tr 
                    style={{ opacity: isDrafted ? 0.55 : 1, cursor: "pointer" }}
                    onClick={() => toggleExpand(player.id)}
                  >
                    {/* Expand icon column */}
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </td>

                    {/* Name / Team / Pos */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{player.name}</span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                          <span className="badge badge-secondary" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{player.team}</span>
                          <span className="badge badge-primary" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{player.positions.join(",")}</span>
                        </div>
                      </div>
                    </td>

                    {/* ADP (Min - Max) */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{player.adp.toFixed(1)}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          ({player.minPick} - {player.maxPick})
                        </span>
                      </div>
                    </td>

                    {/* Market Dollar value */}
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-secondary)" }}>
                        ${calculateAdpValue(player.adp).toFixed(1)}
                      </span>
                    </td>

                    {/* Dollar value */}
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: player.value >= 0 ? "var(--success)" : "var(--danger)" }}>
                        ${player.value.toFixed(1)}
                      </span>
                    </td>

                    {/* Projections Summary */}
                    <td>
                      {player.isPitcher ? (
                        <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          <span>{player.stats.SO || 0} SO | {(player.stats.ERA || 0).toFixed(2)} ERA</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{(player.stats.IP || 0).toFixed(0)} IP | {(player.stats.WHIP || 0).toFixed(2)} WHIP</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          <span>{player.stats.HR || 0} HR | {player.stats.SB || 0} SB | {(player.stats.AVG || 0).toFixed(3)}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{player.stats.R || 0} R | {player.stats.RBI || 0} RBI</span>
                        </div>
                      )}
                    </td>

                    {/* Return Probability */}
                    <td>
                      {isDrafted ? (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                      ) : (
                        <span className={`${styles.recReturnGlow}`} data-level={returnLevel} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                          {formatPercent(pReturn)}
                        </span>
                      )}
                    </td>

                    {/* Score */}
                    <td>
                      {isDrafted ? (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                      ) : (
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>
                          {recScore.toFixed(1)}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td>
                      {isDrafted ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          Picked {draftDetail?.round}-{draftDetail?.overallPick && (draftDetail.overallPick % 12 || 12)}
                        </span>
                      ) : (
                        <button
                          className={`btn ${isOnClock ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDraftPlayer(player.id);
                          }}
                        >
                          {isOnClock ? "Draft" : "Force Pick"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Row for projections */}
                  {isExpanded && (
                    <tr style={{ background: "rgba(255, 255, 255, 0.015)" }}>
                      <td colSpan={9} style={{ padding: "16px 20px" }}>
                        {(() => {
                          const isDraftActive = !!(isDraftStarted && !isDraftComplete && currentPickIndex !== undefined && currentTeamIndex !== undefined);
                          let cpuDetails: any = null;
                          if (isDraftActive && currentPickIndex !== undefined && currentTeamIndex !== undefined) {
                            const pCurr = currentPickIndex + 1;
                            const cpuRoster = draftedPlayers
                              .filter((d) => d.teamIndex === currentTeamIndex)
                              .map((d) => d.player);
                            cpuDetails = calculateCpuScore(player, pCurr, cpuRoster, numRounds || 23, 0.5);
                          }

                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "24px", alignItems: "start" }}>
                              {/* Left Column: Projections */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Projected Season Statistics
                                </span>
                                
                                {player.isPitcher ? (
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>IP</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.IP}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Wins (W)</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.W}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Saves (SV)</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.SV}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Strikeouts (SO)</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.SO}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>ERA</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem", color: "var(--secondary)" }}>{player.stats.ERA?.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>WHIP</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem", color: "var(--secondary)" }}>{player.stats.WHIP?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>AB</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.AB}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Runs (R)</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.R}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>HR</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.HR}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>RBI</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.RBI}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Steals (SB)</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{player.stats.SB}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>AVG</span>
                                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem", color: "var(--secondary)" }}>{player.stats.AVG?.toFixed(3)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Middle Column: Score Breakdown */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Recommendation Score Breakdown
                                </span>

                                {rec ? (
                                  <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                                      <span>Formula: Score = (Base + Stats + Scarcity + Upside + Reach) * Bench</span>
                                      <span className="badge badge-accent" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>{rec.phase.toUpperCase()} PHASE</span>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>Base Auction Value ($):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: player.value >= 0 ? "var(--success)" : "var(--danger)" }}>
                                          ${player.value.toFixed(1)}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>Stats Need Adjustment (wt: {rec.weights.needs}):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: rec.statsAdjustment >= 0 ? "var(--success)" : "var(--danger)" }}>
                                          {rec.statsAdjustment >= 0 ? "+" : ""}${rec.statsAdjustment.toFixed(1)}
                                        </span>
                                      </div>
                                      
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>Scarcity Premium (wt: {rec.weights.scarcity}):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                          +${(rec.scarcityDropOff * (1 - rec.pReturn) * rec.weights.scarcity).toFixed(1)}
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                            (drop: ${rec.scarcityDropOff.toFixed(1)}, risk: {Math.round((1 - rec.pReturn) * 100)}%)
                                          </span>
                                        </span>
                                      </div>

                                      {rec.weights.upside > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                          <span style={{ color: "var(--text-secondary)" }}>Upside Bonus (wt: {rec.weights.upside}):</span>
                                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--success)" }}>
                                            +${rec.upsideBonus.toFixed(1)}
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                              (gap: {(player.adp - player.minPick).toFixed(0)} picks)
                                            </span>
                                          </span>
                                        </div>
                                      )}

                                      {rec.weights.reach > 0 && rec.reachPenalty < 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                          <span style={{ color: "var(--text-secondary)" }}>Reach Penalty (wt: {rec.weights.reach}):</span>
                                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--danger)" }}>
                                            ${rec.reachPenalty.toFixed(1)}
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                              (reach: {(player.adp - (draftedPlayers.length + 1)).toFixed(0)} picks)
                                            </span>
                                          </span>
                                        </div>
                                      )}

                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>Forced to Bench Discount:</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: rec.isBench ? "var(--warning)" : "var(--text-muted)" }}>
                                          {rec.isBench ? `YES (x${rec.weights.benchDiscount})` : "NO (x1.0)"}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Final Score:</span>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: "var(--primary)" }}>
                                          {rec.score.toFixed(1)}
                                        </span>
                                        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                                          {rec.isBench 
                                            ? `($${player.value.toFixed(1)} + $${(rec.scarcityDropOff * (1 - rec.pReturn) * rec.weights.scarcity).toFixed(1)} scarcity ${rec.statsAdjustment >= 0 ? "+" : ""}${rec.statsAdjustment.toFixed(1)} stats ${rec.upsideBonus > 0 ? ` +$${rec.upsideBonus.toFixed(1)}` : ""}${rec.reachPenalty < 0 ? ` -$${Math.abs(rec.reachPenalty).toFixed(1)}` : ""}) * ${rec.weights.benchDiscount}`
                                            : `$${player.value.toFixed(1)} + $${(rec.scarcityDropOff * (1 - rec.pReturn) * rec.weights.scarcity).toFixed(1)} scarcity ${rec.statsAdjustment >= 0 ? "+" : ""}${rec.statsAdjustment.toFixed(1)} stats ${rec.upsideBonus > 0 ? ` +$${rec.upsideBonus.toFixed(1)}` : ""}${rec.reachPenalty < 0 ? ` -$${Math.abs(rec.reachPenalty).toFixed(1)}` : ""}`
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                                    Player already drafted. No active recommendation statistics.
                                  </div>
                                )}
                              </div>

                              {/* Right Column: CPU Drafting Score */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  CPU Drafting Score (Debug)
                                </span>

                                {isDraftActive && cpuDetails ? (
                                  <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                                      <span>Formula: 80% ADP + 10% Proj + 7% Need + 3% Rand</span>
                                      <span className="badge badge-primary" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>{currentTeamName}</span>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>1. ADP/Market Score (80%):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                          {(cpuDetails.adpScore * 0.80).toFixed(2)}
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                            (raw: {cpuDetails.adpScore.toFixed(1)})
                                          </span>
                                        </span>
                                      </div>

                                      {/* Sub-breakdown of ADP Score */}
                                      <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px", borderLeft: "2px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                          <span>Base Market Value ($):</span>
                                          <span style={{ fontFamily: "var(--font-mono)" }}>${cpuDetails.marketVal.toFixed(1)}</span>
                                        </div>
                                        {cpuDetails.penalty > 0 && (
                                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--danger)" }}>
                                            <span>Reach Penalty:</span>
                                            <span style={{ fontFamily: "var(--font-mono)" }}>-${cpuDetails.penalty.toFixed(1)}</span>
                                          </div>
                                        )}
                                        {cpuDetails.bonus > 0 && (
                                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--success)" }}>
                                            <span>Slide Bonus:</span>
                                            <span style={{ fontFamily: "var(--font-mono)" }}>+${cpuDetails.bonus.toFixed(1)}</span>
                                          </div>
                                        )}
                                        {cpuDetails.urgency > 0 && (
                                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--warning)" }}>
                                            <span>ADP Urgency:</span>
                                            <span style={{ fontFamily: "var(--font-mono)" }}>+${cpuDetails.urgency.toFixed(1)}</span>
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "4px" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>2. Proj Value Score (10%):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                          {(cpuDetails.projScore * 0.10).toFixed(2)}
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                            (raw: {cpuDetails.projScore.toFixed(1)})
                                          </span>
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>3. Roster Need Score (7%):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                          {(cpuDetails.needScore * 0.07).toFixed(2)}
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                            ({cpuDetails.isBench ? "Bench: 2.0" : "Active: 30.0"})
                                          </span>
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                        <span style={{ color: "var(--text-secondary)" }}>4. Randomness (3%):</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                          {(cpuDetails.randScore * 0.03).toFixed(2)}
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                            (raw: {cpuDetails.randScore.toFixed(1)})
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Total CPU Score:</span>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: "var(--secondary)" }}>
                                          {cpuDetails.score.toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                                          {`0.8*${cpuDetails.adpScore.toFixed(1)} + 0.1*${cpuDetails.projScore.toFixed(1)} + 0.07*${cpuDetails.needScore.toFixed(0)} + 0.03*${cpuDetails.randScore.toFixed(1)}`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                                    {!isDraftStarted 
                                      ? "Start the draft to see CPU evaluation details."
                                      : isDraftComplete
                                        ? "Draft completed. CPU evaluations are closed."
                                        : "No active pick context."
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
