"use client";

import React, { useState } from "react";
import { CpuProfile, DraftPick } from "../../engine";
import { Player } from "../../types/draft";
import { usePlayerMap } from "../../hooks/usePlayerMap";
import BoardGrid from "./BoardGrid";
import DraftLogTable from "./DraftLogTable";
import { useDraftLogState } from "./useDraftLogState";
import { usePicksUntilUser } from "./usePicksUntilUser";

interface BoardViewProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  players: Player[];
  cpuSavesStrategies?: string[];
  cpuProfiles?: CpuProfile[];
}

type BoardMode = "grid" | "log";

export default function BoardView({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  players,
  cpuSavesStrategies = [],
  cpuProfiles = [],
}: BoardViewProps) {
  const [mode, setMode] = useState<BoardMode>("grid");
  const playerMap = usePlayerMap(players);
  const picksUntilUser = usePicksUntilUser({ picks, currentPickIndex, userTeamIndex });
  const {
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
  } = useDraftLogState({ picks, teamNames, playerMap });

  const tabs: { id: BoardMode; label: string }[] = [
    { id: "grid", label: "Board" },
    { id: "log", label: "Draft Log" },
  ];

  return (
    <div
      className="card glow-panel"
      style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 210px)", minHeight: "520px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <h3 className="cardTitle" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          League Draft Board
        </h3>
        <div role="tablist" aria-label="Board view mode" style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", padding: "3px", borderRadius: "8px" }}>
          {tabs.map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(tab.id)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  background: active ? "var(--primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "grid" ? (
        <BoardGrid
          picks={picks}
          currentPickIndex={currentPickIndex}
          teamNames={teamNames}
          userTeamIndex={userTeamIndex}
          playerMap={playerMap}
          picksUntilUser={picksUntilUser}
        />
      ) : (
        <DraftLogTable
          currentPickIndex={currentPickIndex}
          teamNames={teamNames}
          userTeamIndex={userTeamIndex}
          playerMap={playerMap}
          cpuSavesStrategies={cpuSavesStrategies}
          cpuProfiles={cpuProfiles}
          debugSearchQuery={debugSearchQuery}
          setDebugSearchQuery={setDebugSearchQuery}
          debugFilterType={debugFilterType}
          setDebugFilterType={setDebugFilterType}
          debugSortKey={debugSortKey}
          expandedPickIndex={expandedPickIndex}
          setExpandedPickIndex={setExpandedPickIndex}
          filteredPicks={filteredPicks}
          setDraftLogSort={setDraftLogSort}
          getDraftLogSortLabel={getDraftLogSortLabel}
        />
      )}
    </div>
  );
}
