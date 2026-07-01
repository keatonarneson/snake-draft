import { useMemo, useState } from "react";
import { Recommendation } from "../../engine";
import { Player } from "../../types/draft";

export type SortField = "value" | "adp" | "pReturn" | "name" | "score";
export type SortOrder = "asc" | "desc";

interface DraftedPlayer {
  player: Player;
}

interface UsePlayerListTableOptions {
  availablePlayers: Player[];
  draftedPlayers: DraftedPlayer[];
  recommendations: Recommendation[];
}

const positionFilterOptions = ["ALL", "C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "UT"];

export function usePlayerListTable({
  availablePlayers,
  draftedPlayers,
  recommendations,
}: UsePlayerListTableOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("ALL");
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

      let posMatch = true;
      if (selectedPosition !== "ALL") {
        posMatch = selectedPosition === "UT" ? !player.isPitcher : player.positions.includes(selectedPosition);
      }

      return nameMatch && posMatch;
    });
  }, [fullPool, searchTerm, selectedPosition]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers];

    sorted.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

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
  }, [filteredPlayers, recMap, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }

    setSortField(field);
    setSortOrder(field === "adp" || field === "name" ? "asc" : "desc");
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
