import React from "react";
import { Recommendation } from "../../engine";
import { Player } from "../../types/draft";

interface RecommendationScorePanelProps {
  draftedCount: number;
  isDrafted: boolean;
  player: Player;
  rec?: Recommendation;
}

function formulaText(rec: Recommendation, player: Player) {
  const urgencyCoeff = rec.weights.draftUrgency ?? 1.0;
  const weightedScarcity = rec.scarcityDropOff * rec.weights.scarcity * urgencyCoeff;
  const urgencyTimingBoost = (1.0 - rec.pReturn) * Math.max(0.0, player.value) * 0.35 * urgencyCoeff;
  const parts = [
    `$${player.value.toFixed(1)} base`,
    `+$${weightedScarcity.toFixed(1)} scarcity`,
    `${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(1)} stats`,
    rec.upsideBonus > 0 ? `+$${rec.upsideBonus.toFixed(1)} upside` : "",
    rec.reachPenalty < 0 ? `-$${Math.abs(rec.reachPenalty).toFixed(1)} reach` : "",
    urgencyTimingBoost > 0 ? `+$${urgencyTimingBoost.toFixed(1)} urgency` : "",
  ].filter(Boolean);

  return rec.isBench ? `(${parts.join(" ")}) * ${rec.weights.benchDiscount}` : parts.join(" ");
}

function DetailLine({
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

export function RecommendationScorePanel({ draftedCount, isDrafted, player, rec }: RecommendationScorePanelProps) {
  if (!rec) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recommendation Score Breakdown
        </span>
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
          {isDrafted
            ? "Player already drafted. No active recommendation statistics."
            : "No active recommendation statistics for this player."}
        </div>
      </div>
    );
  }

  const urgencyCoeff = rec.weights.draftUrgency ?? 1.0;
  const weightedScarcity = rec.scarcityDropOff * rec.weights.scarcity * urgencyCoeff;
  const weightedValuePreservation = (rec.scarcityDetails?.valuePreservation ?? 0) * rec.weights.scarcity * urgencyCoeff;
  const weightedScarcityRank = (rec.scarcityDetails?.scarcityRank ?? 0) * rec.weights.scarcity * urgencyCoeff;
  const urgencyTimingBoost = (1.0 - rec.pReturn) * Math.max(0.0, player.value) * 0.35 * urgencyCoeff;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Recommendation Score Breakdown
      </span>

      <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "6px", display: "flex", justifyContent: "space-between" }}>
          <span>Formula: Score = (Base + Stats + Scarcity + Upside + Reach) * Bench</span>
          <span className="badge badge-accent" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>{rec.phase.toUpperCase()} PHASE</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <DetailLine
            color={player.value >= 0 ? "var(--success)" : "var(--danger)"}
            label="Base Auction Value ($):"
            value={`$${player.value.toFixed(1)}`}
          />
          <DetailLine
            color={rec.statsAdjustment >= 0 ? "var(--success)" : "var(--danger)"}
            label={`Stats Need Adjustment (wt: ${rec.weights.needs}):`}
            value={`${rec.statsAdjustment >= 0 ? "+" : ""}$${rec.statsAdjustment.toFixed(1)}`}
          />

          <div style={{ borderLeft: "2px solid rgba(255,255,255,0.08)", paddingLeft: "8px", margin: "4px 0", display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Scarcity Premium (wt: {rec.weights.scarcity}):</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                +${weightedScarcity.toFixed(1)}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                  (risk: {Math.round((1 - rec.pReturn) * 100)}%)
                </span>
              </span>
            </div>

            {rec.scarcityDetails && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", paddingLeft: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>- Value Preservation:</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    +${weightedValuePreservation.toFixed(1)}
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                      (gap: ${rec.scarcityDetails.valuePreservation.toFixed(1)})
                    </span>
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", paddingLeft: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>- Scarcity Rank Bonus:</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    +${weightedScarcityRank.toFixed(1)}
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                      (wt: {Math.round(rec.scarcityDetails.qualityWeight * 100)}%)
                    </span>
                  </span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic", paddingLeft: "8px", marginTop: "2px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "2px" }}>
                  {rec.scarcityDetails.qualityWeight >= 0.7 ? (
                    <span><strong>Strong value preservation:</strong> Top-tier {rec.scarcityDetails.position} who secures high value before the remaining pool thins.</span>
                  ) : rec.scarcityDetails.qualityWeight >= 0.3 ? (
                    <span><strong>Limited preservation:</strong> Solid alternative at {rec.scarcityDetails.position}. Pool is thin, but player quality limits reach benefit.</span>
                  ) : (
                    <span><strong>Replacement level:</strong> Low-value {rec.scarcityDetails.position} depth. Scarcity premium is capped to avoid overpaying.</span>
                  )}
                </div>
              </>
            )}
          </div>

          {urgencyTimingBoost > 0 && (
            <DetailLine
              color="var(--success)"
              label={`Draft Urgency Timing Boost (wt: ${urgencyCoeff.toFixed(1)}):`}
              value={`+$${urgencyTimingBoost.toFixed(1)}`}
            />
          )}
          {rec.weights.upside > 0 && (
            <DetailLine
              color="var(--success)"
              label={`Upside Bonus (wt: ${rec.weights.upside}):`}
              value={
                <>
                  +${rec.upsideBonus.toFixed(1)}
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                    (gap: {(player.adp - player.minPick).toFixed(0)} picks)
                  </span>
                </>
              }
            />
          )}
          {rec.weights.reach > 0 && rec.reachPenalty < 0 && (
            <DetailLine
              color="var(--danger)"
              label={`Reach Penalty (wt: ${rec.weights.reach}):`}
              value={
                <>
                  ${rec.reachPenalty.toFixed(1)}
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                    (reach: {(player.adp - (draftedCount + 1)).toFixed(0)} picks)
                  </span>
                </>
              }
            />
          )}
          <DetailLine
            color={rec.isBench ? "var(--warning)" : "var(--text-muted)"}
            label="Forced to Bench Discount:"
            value={rec.isBench ? `YES (x${rec.weights.benchDiscount})` : "NO (x1.0)"}
          />

          <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Final Score:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: "var(--primary)" }}>
                {rec.score.toFixed(1)}
              </span>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "right", maxWidth: "240px", wordBreak: "break-all" }}>
                {formulaText(rec, player)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
