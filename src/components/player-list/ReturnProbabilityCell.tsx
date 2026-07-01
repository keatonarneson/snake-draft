import { ReturnTimelinePoint } from "./playerListMetrics";

interface ReturnProbabilityCellProps {
  isDrafted: boolean;
  pReturn: number;
  returnLevel: string;
  timeline: ReturnTimelinePoint[];
}

export function ReturnProbabilityCell({ isDrafted, pReturn, returnLevel, timeline }: ReturnProbabilityCellProps) {
  if (isDrafted) {
    return (
      <td>
        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>-</span>
      </td>
    );
  }

  return (
    <td>
      <span
        className={`badge ${returnLevel === "high" ? "badge-success" : returnLevel === "med" ? "badge-warning" : "badge-danger"}`}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "help",
        }}
        title={timeline.map((t) => `${t.label}: ${Math.round(t.probability * 100)}%`).join("\n")}
      >
        {Math.round(pReturn * 100)}%
      </span>
    </td>
  );
}
