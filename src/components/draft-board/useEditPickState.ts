import { useMemo, useState } from "react";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

interface UseEditPickStateOptions {
  picks: DraftPick[];
  players: Player[];
  onEditPick?: (pickIndex: number, playerId: string) => void;
}

export function useEditPickState({
  picks,
  players,
  onEditPick,
}: UseEditPickStateOptions) {
  const [editingPickIndex, setEditingPickIndex] = useState<number | null>(null);
  const [editPlayerId, setEditPlayerId] = useState("");

  const editingPick = editingPickIndex !== null ? picks[editingPickIndex] : null;

  const editPlayerOptions = useMemo(() => {
    if (editingPickIndex === null) return [];

    const draftedElsewhere = new Set(
      picks
        .filter((pick, index) => index !== editingPickIndex && pick.playerDraftedId)
        .map((pick) => pick.playerDraftedId as string)
    );

    return players
      .filter((player) => !draftedElsewhere.has(player.id))
      .sort((a, b) => a.adp - b.adp);
  }, [editingPickIndex, picks, players]);

  const openEditPick = (pickIndex: number) => {
    const pick = picks[pickIndex];
    setEditingPickIndex(pickIndex);
    setEditPlayerId(pick?.playerDraftedId || "");
  };

  const closeEditPick = () => {
    setEditingPickIndex(null);
    setEditPlayerId("");
  };

  const saveEditedPick = () => {
    if (editingPickIndex === null || !editPlayerId || !onEditPick) return;
    onEditPick(editingPickIndex, editPlayerId);
    closeEditPick();
  };

  return {
    editingPick,
    editPlayerId,
    setEditPlayerId,
    editPlayerOptions,
    openEditPick,
    closeEditPick,
    saveEditedPick,
  };
}
