import { calculateAdpValue } from "../../engine";
import { Player } from "../../types/draft";

export function ExpandIconCell({ isExpanded }: { isExpanded: boolean }) {
  return (
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
  );
}

export function AdpCell({ player }: { player: Player }) {
  return (
    <td>
      <div style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        <span style={{ fontWeight: 600 }}>{player.adp.toFixed(0)}</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
          ({player.minPick}-{player.maxPick})
        </span>
      </div>
    </td>
  );
}

export function MarketValueCell({ adp }: { adp: number }) {
  return (
    <td>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
        ${calculateAdpValue(adp).toFixed(1)}
      </span>
    </td>
  );
}

export function AuctionValueCell({ value }: { value: number }) {
  return (
    <td>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: value >= 0 ? "var(--success)" : "var(--danger)" }}>
        ${value.toFixed(1)}
      </span>
    </td>
  );
}

export function ScoreCell({ isDrafted, score }: { isDrafted: boolean; score: number }) {
  return (
    <td>
      {isDrafted ? (
        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>-</span>
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>
          {score.toFixed(1)}
        </span>
      )}
    </td>
  );
}
