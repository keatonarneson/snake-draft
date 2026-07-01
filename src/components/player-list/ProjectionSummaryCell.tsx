import { Player } from "../../types/draft";

export function ProjectionSummaryCell({ player }: { player: Player }) {
  if (player.isPitcher) {
    return (
      <td>
        <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          <span>{player.stats.SO || 0} SO | {(player.stats.ERA || 0).toFixed(2)} ERA</span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{(player.stats.IP || 0).toFixed(0)} IP | {(player.stats.WHIP || 0).toFixed(2)} WHIP</span>
        </div>
      </td>
    );
  }

  return (
    <td>
      <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        <span>{player.stats.HR || 0} HR | {player.stats.SB || 0} SB | {(player.stats.AVG || 0).toFixed(3)}</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{player.stats.R || 0} R | {player.stats.RBI || 0} RBI</span>
      </div>
    </td>
  );
}
