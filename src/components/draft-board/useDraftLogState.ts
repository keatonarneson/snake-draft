import { useMemo, useState } from "react";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

export type DraftLogFilterType = "all" | "drafted" | "undrafted";
export type DraftLogSortKey = "pick" | "team";
export type DraftLogSortDirection = "asc" | "desc";

interface UseDraftLogStateOptions {
  picks: DraftPick[];
  teamNames: string[];
  playerMap: Map<string, Player>;
}

export function useDraftLogState({
  picks,
  teamNames,
  playerMap,
}: UseDraftLogStateOptions) {
  const [debugSearchQuery, setDebugSearchQuery] = useState("");
  const [debugFilterType, setDebugFilterType] = useState<DraftLogFilterType>("all");
  const [debugSortKey, setDebugSortKey] = useState<DraftLogSortKey>("pick");
  const [debugSortDirection, setDebugSortDirection] = useState<DraftLogSortDirection>("asc");
  const [expandedPickIndex, setExpandedPickIndex] = useState<number | null>(null);

  const filteredPicks = useMemo(() => {
    const visiblePicks = picks.filter((pick) => {
      if (debugFilterType === "drafted" && !pick.playerDraftedId) return false;
      if (debugFilterType === "undrafted" && pick.playerDraftedId) return false;

      if (debugSearchQuery.trim() !== "") {
        const query = debugSearchQuery.toLowerCase();
        const teamName = teamNames[pick.teamIndex]?.toLowerCase() || "";
        const playerName = pick.playerDraftedId
          ? playerMap.get(pick.playerDraftedId)?.name.toLowerCase() || ""
          : "";

        return teamName.includes(query) || playerName.includes(query);
      }

      return true;
    });

    return [...visiblePicks].sort((a, b) => {
      const direction = debugSortDirection === "asc" ? 1 : -1;

      if (debugSortKey === "team") {
        const teamCompare = (teamNames[a.teamIndex] || "").localeCompare(teamNames[b.teamIndex] || "");
        if (teamCompare !== 0) return teamCompare * direction;
      }

      return (a.overallPick - b.overallPick) * direction;
    });
  }, [picks, debugFilterType, debugSearchQuery, teamNames, playerMap, debugSortKey, debugSortDirection]);

  const setDraftLogSort = (sortKey: DraftLogSortKey) => {
    if (debugSortKey === sortKey) {
      setDebugSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setDebugSortKey(sortKey);
    setDebugSortDirection("asc");
  };

  const getDraftLogSortLabel = (sortKey: DraftLogSortKey) => {
    if (debugSortKey !== sortKey) return "";
    return debugSortDirection === "asc" ? " (asc)" : " (desc)";
  };

  return {
    debugSearchQuery,
    setDebugSearchQuery,
    debugFilterType,
    setDebugFilterType,
    debugSortKey,
    debugSortDirection,
    expandedPickIndex,
    setExpandedPickIndex,
    filteredPicks,
    setDraftLogSort,
    getDraftLogSortLabel,
  };
}
