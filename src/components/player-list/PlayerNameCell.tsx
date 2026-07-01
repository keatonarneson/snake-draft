import { Player } from "../../types/draft";

interface PlayerNameCellProps {
  isPlayerTargeted: boolean;
  onToggleTargetPlayer?: (playerId: string) => void;
  player: Player;
}

export function PlayerNameCell({ isPlayerTargeted, onToggleTargetPlayer, player }: PlayerNameCellProps) {
  return (
    <td>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{player.name}</span>
          {onToggleTargetPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTargetPlayer(player.id);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: isPlayerTargeted ? "var(--warning)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
              title={isPlayerTargeted ? "Remove target" : "Target player"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isPlayerTargeted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
          <span className="badge badge-secondary" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{player.team}</span>
          <span className="badge badge-primary" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{player.positions.join(",")}</span>
        </div>
      </div>
    </td>
  );
}
