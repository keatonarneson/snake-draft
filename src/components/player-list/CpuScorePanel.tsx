import React from "react";
import { CpuScoreDetails } from "../../engine";

interface CpuScorePanelProps {
  cpuDetails: CpuScoreDetails | null;
  cpuLabel: string;
  currentTeamName: string;
  isDraftActive: boolean;
  isDraftComplete?: boolean;
  isDraftStarted?: boolean;
}

function ScoreLine({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function cpuFormula(cpuDetails: CpuScoreDetails) {
  return [
    `$${cpuDetails.baseValue.toFixed(1)} base`,
    cpuDetails.rosterNeedBonus > 0 ? `+$${cpuDetails.rosterNeedBonus.toFixed(1)} need` : "",
    cpuDetails.categoryNeedBonus > 0 ? `+$${cpuDetails.categoryNeedBonus.toFixed(1)} cat` : "",
    cpuDetails.positionRunBonus > 0 ? `+$${cpuDetails.positionRunBonus.toFixed(1)} run` : "",
    cpuDetails.scarcityBonus > 0 ? `+$${cpuDetails.scarcityBonus.toFixed(1)} scarcity` : "",
    `${cpuDetails.roleSecurityBonus >= 0 ? "+" : ""}$${cpuDetails.roleSecurityBonus.toFixed(1)} role`,
    cpuDetails.upsideBonus > 0 ? `+$${cpuDetails.upsideBonus.toFixed(1)} upside` : "",
    cpuDetails.urgencyBonus > 0 ? `+$${cpuDetails.urgencyBonus.toFixed(1)} urgency` : "",
    cpuDetails.savesStrategyBonus !== 0 ? `${cpuDetails.savesStrategyBonus > 0 ? "+" : ""}$${cpuDetails.savesStrategyBonus.toFixed(1)} saves` : "",
    `${cpuDetails.randomNoise >= 0 ? "+" : ""}$${cpuDetails.randomNoise.toFixed(1)} rand`,
    cpuDetails.reachPenalty > 0 ? `-$${cpuDetails.reachPenalty.toFixed(1)} reach` : "",
    cpuDetails.rosterPenalty > 0 ? `-$${cpuDetails.rosterPenalty.toFixed(1)} roster` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function CpuScorePanel({
  cpuDetails,
  cpuLabel,
  currentTeamName,
  isDraftActive,
  isDraftComplete,
  isDraftStarted,
}: CpuScorePanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        CPU Drafting Score (Debug)
      </span>

      {isDraftActive && cpuDetails ? (
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="badge badge-accent" style={{ fontSize: "0.55rem", padding: "1px 6px" }}>
              {cpuLabel.toUpperCase()} CPU
            </span>
            <span className="badge badge-primary" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>{currentTeamName}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <ScoreLine label="Base Value (ADP + Consensus):" value={`$${cpuDetails.baseValue.toFixed(2)}`} />
            <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "1px", borderLeft: "2px solid rgba(255,255,255,0.05)", marginBottom: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>- ADP Market ($):</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>${cpuDetails.adpDollars.toFixed(1)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>- Consensus ($):</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>${cpuDetails.consensusDollars.toFixed(1)}</span>
              </div>
            </div>

            {cpuDetails.rosterNeedBonus > 0 && <ScoreLine color="var(--success)" label="Roster Need Bonus:" value={`+$${cpuDetails.rosterNeedBonus.toFixed(2)}`} />}
            {cpuDetails.categoryNeedBonus > 0 && <ScoreLine color="var(--success)" label="Category Need Bonus:" value={`+$${cpuDetails.categoryNeedBonus.toFixed(2)}`} />}
            {cpuDetails.positionRunBonus > 0 && <ScoreLine color="var(--success)" label="Position Run Bonus:" value={`+$${cpuDetails.positionRunBonus.toFixed(2)}`} />}
            {cpuDetails.scarcityBonus > 0 && <ScoreLine color="var(--success)" label="Scarcity Bonus:" value={`+$${cpuDetails.scarcityBonus.toFixed(2)}`} />}
            <ScoreLine
              color={cpuDetails.roleSecurityBonus >= 0 ? "var(--success)" : "var(--danger)"}
              label="Role Security:"
              value={`${cpuDetails.roleSecurityBonus >= 0 ? "+" : ""}$${cpuDetails.roleSecurityBonus.toFixed(2)}`}
            />
            {cpuDetails.upsideBonus > 0 && <ScoreLine color="var(--success)" label="Upside Bonus:" value={`+$${cpuDetails.upsideBonus.toFixed(2)}`} />}
            {cpuDetails.urgencyBonus > 0 && <ScoreLine color="var(--success)" label="Urgency Boost (ADP Slide):" value={`+$${cpuDetails.urgencyBonus.toFixed(2)}`} />}
            {cpuDetails.savesStrategyBonus !== 0 && (
              <ScoreLine
                color={cpuDetails.savesStrategyBonus > 0 ? "var(--success)" : "var(--danger)"}
                label="Saves Strategy Boost:"
                value={`${cpuDetails.savesStrategyBonus > 0 ? "+" : ""}$${cpuDetails.savesStrategyBonus.toFixed(2)}`}
              />
            )}
            <ScoreLine
              color={cpuDetails.randomNoise >= 0 ? "var(--success)" : "var(--danger)"}
              label="Random Noise (Gaussian):"
              value={`${cpuDetails.randomNoise >= 0 ? "+" : ""}$${cpuDetails.randomNoise.toFixed(2)}`}
            />
            {cpuDetails.reachPenalty > 0 && <ScoreLine color="var(--danger)" label="Reach Penalty:" value={`-$${cpuDetails.reachPenalty.toFixed(2)}`} />}
            {cpuDetails.rosterPenalty > 0 && <ScoreLine color="var(--danger)" label="Roster Penalty:" value={`-$${cpuDetails.rosterPenalty.toFixed(2)}`} />}
          </div>

          <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Total CPU Score:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: "var(--secondary)" }}>
                {cpuDetails.score.toFixed(2)}
              </span>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "right", maxWidth: "240px", wordBreak: "break-all" }}>
                {cpuFormula(cpuDetails)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
          {!isDraftStarted ? "Start the draft to see CPU evaluation details." : isDraftComplete ? "Draft completed. CPU evaluations are closed." : "No active pick context."}
        </div>
      )}
    </div>
  );
}
