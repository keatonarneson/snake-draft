import { Recommendation, ScarcityInfo } from "../../engine";
import { Player } from "../../types/draft";
import { ModalShell } from "../ui";
import styles from "./PlayerComparison.module.css";

interface PlayerComparisonTrayProps {
  players: Player[];
  onClear: () => void;
  onCompare: () => void;
  onRemove: (playerId: string) => void;
}

interface PlayerComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  recommendations: Map<string, Recommendation>;
  scarcityMap: Record<string, ScarcityInfo>;
}

const HITTING_STATS: (keyof Player["stats"])[] = ["R", "HR", "RBI", "SB", "AVG"];
const PITCHING_STATS: (keyof Player["stats"])[] = ["W", "SV", "SO", "ERA", "WHIP"];

function formatStat(player: Player, field: keyof Player["stats"]): string {
  const value = player.stats[field];
  if (value === undefined) return "—";
  if (field === "AVG") return value.toFixed(3);
  if (field === "ERA" || field === "WHIP") return value.toFixed(2);
  return value.toFixed(0);
}

function getPositionPressure(player: Player, scarcityMap: Record<string, ScarcityInfo>) {
  const pressure = player.positions.reduce((best, position) => {
    const info = scarcityMap[position];
    return info && info.scarcityPressure > best ? info.scarcityPressure : best;
  }, 0);

  if (pressure >= 0.7) return { label: "High", value: pressure };
  if (pressure >= 0.4) return { label: "Medium", value: pressure };
  return { label: "Low", value: pressure };
}

export function PlayerComparisonTray({ players, onClear, onCompare, onRemove }: PlayerComparisonTrayProps) {
  if (players.length === 0) return null;

  return (
    <div className={styles.tray} aria-live="polite">
      <div className={styles.trayPlayers}>
        <strong>Compare ({players.length}/2)</strong>
        {players.map((player) => (
          <button key={player.id} type="button" className={styles.playerChip} onClick={() => onRemove(player.id)}>
            {player.name} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <div className={styles.trayActions}>
        <button type="button" className="btn btn-secondary" onClick={onClear}>Clear</button>
        <button type="button" className="btn btn-primary" disabled={players.length !== 2} onClick={onCompare}>
          Compare players
        </button>
      </div>
    </div>
  );
}

export function PlayerComparisonModal({
  isOpen,
  onClose,
  players,
  recommendations,
  scarcityMap,
}: PlayerComparisonModalProps) {
  if (players.length !== 2) return null;

  const [first, second] = players;
  const firstRec = recommendations.get(first.id);
  const secondRec = recommendations.get(second.id);
  const firstScore = firstRec?.score ?? first.value;
  const secondScore = secondRec?.score ?? second.value;
  const bestOverall = firstScore >= secondScore ? first : second;
  const firstReturn = firstRec?.pReturn;
  const secondReturn = secondRec?.pReturn;
  const mostUrgent = firstReturn !== undefined && secondReturn !== undefined
    ? (firstReturn <= secondReturn ? first : second)
    : null;
  const samePlayerLeads = mostUrgent?.id === bestOverall.id;
  const bothHitters = players.every((player) => !player.isPitcher);
  const bothPitchers = players.every((player) => player.isPitcher);
  const statGroups = bothHitters
    ? [{ label: "Hitting projections", fields: HITTING_STATS }]
    : bothPitchers
      ? [{ label: "Pitching projections", fields: PITCHING_STATS }]
      : [
          { label: "Hitting projections", fields: HITTING_STATS },
          { label: "Pitching projections", fields: PITCHING_STATS },
        ];

  const generalRows = [
    { label: "Recommendation score", values: players.map((player) => (recommendations.get(player.id)?.score ?? player.value).toFixed(1)) },
    { label: "Auction value", values: players.map((player) => `$${player.value.toFixed(0)}`) },
    { label: "ADP range", values: players.map((player) => `${player.adp.toFixed(1)} (${player.minPick}–${player.maxPick})`) },
    { label: "Available next pick", values: players.map((player) => {
      const probability = recommendations.get(player.id)?.pReturn;
      return probability === undefined ? "—" : `${Math.round(probability * 100)}%`;
    }) },
    { label: "Roster fit", values: players.map((player) => recommendations.get(player.id)?.isBench ? "Bench / depth" : "Active lineup") },
    { label: "Position pressure", values: players.map((player) => getPositionPressure(player, scarcityMap).label) },
  ];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Player comparison"
      subtitle={`${first.name} vs. ${second.name}`}
      width="min(920px, calc(100vw - 32px))"
      maxHeight="92vh"
    >
      <div className={styles.modalBody}>
        <div className={styles.decisionSummary}>
          <strong>Draft read:</strong>{" "}
          {mostUrgent
            ? samePlayerLeads
              ? `${bestOverall.name} leads the recommendation and is less likely to reach your next pick.`
              : `${bestOverall.name} leads overall; ${mostUrgent.name} is the more urgent choice.`
            : `${bestOverall.name} leads the current recommendation.`}
        </div>

        <div className={styles.comparisonGrid}>
          <div className={styles.cornerLabel}>Metric</div>
          {players.map((player) => (
            <div key={player.id} className={styles.playerHeading}>
              <strong>{player.name}</strong>
              <span>{player.team} · {player.positions.join(", ")}</span>
            </div>
          ))}

          {generalRows.map((row) => (
            <div key={row.label} className={styles.gridRow}>
              <div className={styles.metricLabel}>{row.label}</div>
              {row.values.map((value, index) => <div key={players[index].id} className={styles.metricValue}>{value}</div>)}
            </div>
          ))}

          {statGroups.map((group) => (
            <div key={group.label} className={styles.statGroup}>
              <div className={styles.sectionLabel}>{group.label}</div>
              {group.fields.map((field) => (
                <div key={field} className={styles.gridRow}>
                  <div className={styles.metricLabel}>{field}</div>
                  {players.map((player) => (
                    <div key={player.id} className={styles.metricValue}>{formatStat(player, field)}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
