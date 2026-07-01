import React from "react";
import { Player } from "../../types/draft";

interface PlayerProjectionPanelProps {
  player: Player;
}

function StatCell({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem", color: accent ? "var(--secondary)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

export function PlayerProjectionPanel({ player }: PlayerProjectionPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Projected Season Statistics
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px" }}>
        {player.isPitcher ? (
          <>
            <StatCell label="IP" value={player.stats.IP} />
            <StatCell label="Wins (W)" value={player.stats.W} />
            <StatCell label="Saves (SV)" value={player.stats.SV} />
            <StatCell label="Strikeouts (SO)" value={player.stats.SO} />
            <StatCell label="ERA" value={player.stats.ERA?.toFixed(2)} accent />
            <StatCell label="WHIP" value={player.stats.WHIP?.toFixed(2)} accent />
          </>
        ) : (
          <>
            <StatCell label="AB" value={player.stats.AB} />
            <StatCell label="Runs (R)" value={player.stats.R} />
            <StatCell label="HR" value={player.stats.HR} />
            <StatCell label="RBI" value={player.stats.RBI} />
            <StatCell label="Steals (SB)" value={player.stats.SB} />
            <StatCell label="AVG" value={player.stats.AVG?.toFixed(3)} accent />
          </>
        )}
      </div>
    </div>
  );
}
