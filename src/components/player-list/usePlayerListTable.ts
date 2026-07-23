import { useMemo, useState } from "react";
import { Recommendation } from "../../engine";
import { Player } from "../../types/draft";

export type ProjectionSortField = keyof Player["stats"];
export type SortField = "value" | "adp" | "pReturn" | "name" | "score" | ProjectionSortField;
export type SortOrder = "asc" | "desc";

const projectionSortFields = new Set<SortField>([
  "AB", "R", "HR", "RBI", "SB", "AVG", "IP", "W", "SV", "SO", "ERA", "WHIP",
]);
const hittingProjectionSortFields = new Set<ProjectionSortField>(["AB", "R", "HR", "RBI", "SB", "AVG"]);
const pitchingProjectionSortFields = new Set<ProjectionSortField>(["IP", "W", "SV", "SO", "ERA", "WHIP"]);

export function isProjectionSortField(field: SortField): field is ProjectionSortField {
  return projectionSortFields.has(field);
}

interface DraftedPlayer {
  player: Player;
}

interface UsePlayerListTableOptions {
  availablePlayers: Player[];
  draftedPlayers: DraftedPlayer[];
  recommendations: Recommendation[];
}

const positionFilterOptions = ["ALL", "C", "1B", "2B", "3B", "SS", "CI", "MI", "OF", "UT", "P", "SP", "RP"];

const positionGroups: Record<string, string[]> = {
  CI: ["1B", "3B"],
  MI: ["2B", "SS"],
};

function matchesPositionFilter(player: Player, selectedPosition: string): boolean {
  if (selectedPosition === "ALL") return true;
  if (selectedPosition === "UT") return !player.isPitcher;
  if (selectedPosition === "P") return player.isPitcher;

  const eligiblePositions = positionGroups[selectedPosition] ?? [selectedPosition];
  return player.positions.some((position) => eligiblePositions.includes(position));
}

export function usePlayerListTable({
  availablePlayers,
  draftedPlayers,
  recommendations,
}: UsePlayerListTableOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPositionState] = useState("ALL");
  const [showDrafted, setShowDrafted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const recMap = useMemo(() => {
    return new Map(recommendations.map((r) => [r.player.id, r]));
  }, [recommendations]);

  const fullPool = useMemo(() => {
    if (!showDrafted) return availablePlayers;

    const draftedWithProps: Player[] = draftedPlayers.map((d) => d.player);
    return [...availablePlayers, ...draftedWithProps];
  }, [availablePlayers, draftedPlayers, showDrafted]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return fullPool.filter((player) => {
      const nameMatch =
        player.name.toLowerCase().includes(normalizedSearch) ||
        player.team.toLowerCase().includes(normalizedSearch);

      const posMatch = matchesPositionFilter(player, selectedPosition);

      return nameMatch && posMatch;
    });
  }, [fullPool, searchTerm, selectedPosition]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers];

    sorted.sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

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
      } else if (isProjectionSortField(sortField)) {
        aVal = a.stats[sortField];
        bVal = b.stats[sortField];
      }

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredPlayers, recMap, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }

    setSortField(field);
    setSortOrder(field === "adp" || field === "name" || field === "ERA" || field === "WHIP" ? "asc" : "desc");
  };

  const setSelectedPosition = (position: string) => {
    setSelectedPositionState(position);
    if (!isProjectionSortField(sortField)) return;

    if (position === "ALL") {
      setSortField("score");
      setSortOrder("desc");
      return;
    }

    const isPitcherFilter = ["P", "SP", "RP"].includes(position);
    const compatibleSort = isPitcherFilter
      ? pitchingProjectionSortFields.has(sortField)
      : hittingProjectionSortFields.has(sortField);

    if (!compatibleSort) {
      setSortField("score");
      setSortOrder("desc");
    }
  };

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerId((current) => (current === playerId ? null : playerId));
  };

  return {
    expandedPlayerId,
    handleSort,
    positionFilterOptions,
    recMap,
    searchTerm,
    selectedPosition,
    setSearchTerm,
    setSelectedPosition,
    setShowDrafted,
    showDrafted,
    sortField,
    sortedPlayers,
    sortOrder,
    toggleExpand,
  };
}
