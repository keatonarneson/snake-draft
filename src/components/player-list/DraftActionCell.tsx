import { Player } from "../../types/draft";

interface DraftDetail {
  overallPick: number;
  player: Player;
  round: number;
}

interface DraftActionCellProps {
  draftDetail?: DraftDetail;
  isDrafted: boolean;
  isOnClock: boolean;
  onDraftPlayer: (playerId: string) => void;
  playerId: string;
}

export function DraftActionCell({ draftDetail, isDrafted, isOnClock, onDraftPlayer, playerId }: DraftActionCellProps) {
  return (
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
            onDraftPlayer(playerId);
          }}
        >
          {isOnClock ? "Draft" : "Force Pick"}
        </button>
      )}
    </td>
  );
}
