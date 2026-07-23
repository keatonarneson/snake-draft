import { Player } from "../../types/draft";

interface PlayerNameCellProps {
  compareDisabled?: boolean;
  isCompared?: boolean;
  isPlayerTargeted: boolean;
  onToggleCompare?: (playerId: string) => void;
  onToggleTargetPlayer?: (playerId: string) => void;
  player: Player;
}

export function PlayerNameCell({
  compareDisabled = false,
  isCompared = false,
  isPlayerTargeted,
  onToggleCompare,
  onToggleTargetPlayer,
  player,
}: PlayerNameCellProps) {
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
          {onToggleCompare && (
            <button
              type="button"
              aria-label={isCompared ? `Remove ${player.name} from comparison` : `Compare ${player.name}`}
              aria-pressed={isCompared}
              disabled={compareDisabled}
              onClick={(event) => {
                event.stopPropagation();
                onToggleCompare(player.id);
              }}
              style={{
                alignItems: "center",
                background: isCompared ? "rgba(6, 182, 212, 0.16)" : "none",
                border: `1px solid ${isCompared ? "rgba(6, 182, 212, 0.45)" : "var(--glass-border)"}`,
                borderRadius: "4px",
                color: isCompared ? "var(--secondary)" : "var(--text-muted)",
                cursor: compareDisabled ? "not-allowed" : "pointer",
                display: "flex",
                fontSize: "0.6rem",
                fontWeight: 700,
                opacity: compareDisabled ? 0.4 : 1,
                padding: "1px 4px",
              }}
              title={compareDisabled ? "Two players are already selected" : isCompared ? "Remove from comparison" : "Add to comparison"}
            >
              VS
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
