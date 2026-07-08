"use client";

import React from "react";
import styles from "../DashboardSummary.module.css";
import { Recommendation } from "../../engine";
import { Player } from "../../types/draft";

interface DraftedPlayerDetail {
  overallPick: number;
  player: Player;
  round: number;
  teamName: string;
}

interface PlayerFocusBarProps {
  draftedDetail?: DraftedPlayerDetail;
  draftActionLabel?: string;
  isOnClock: boolean;
  onDraftPlayer: (playerId: string) => void;
  player?: Player | null;
  recommendation?: Recommendation;
  targetRound?: number;
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

function formatStatValue(value: number | undefined, stat: string) {
  if (value === undefined) return "-";
  if (stat === "AVG") return value.toFixed(3);
  if (stat === "ERA" || stat === "WHIP") return value.toFixed(2);
  return Math.round(value).toString();
}

function ProjectedStatsStrip({ player }: { player: Player }) {
  const statKeys = player.isPitcher
    ? ["IP", "W", "SV", "SO", "ERA", "WHIP"]
    : ["R", "HR", "RBI", "SB", "AVG"];

  return (
    <div className={styles.playerFocusStats} aria-label="Projected stats">
      {statKeys.map((stat) => (
        <span key={stat}>
          <small>{stat}</small>
          <b>{formatStatValue(player.stats[stat as keyof typeof player.stats], stat)}</b>
        </span>
      ))}
    </div>
  );
}

export function PlayerFocusBar({
  draftedDetail,
  draftActionLabel,
  isOnClock,
  onDraftPlayer,
  player,
  recommendation,
  targetRound,
}: PlayerFocusBarProps) {
  if (!player) {
    return (
      <section className={styles.playerFocusBar} data-empty="true" aria-label="Focused player">
        <div className={styles.playerFocusMain}>
          <div className={styles.playerFocusIdentity}>
            <strong>Player Focus</strong>
            <span>Select a player from the queue, recommendations, or pool.</span>
          </div>
        </div>

        <div className={styles.playerFocusMetrics}>
          <span>
            <small>Value</small>
            <b>-</b>
          </span>
          <span>
            <small>ADP</small>
            <b>-</b>
          </span>
          <span>
            <small>Return</small>
            <b>-</b>
          </span>
        </div>

        <div className={styles.playerFocusAction}>
          <span className={styles.playerFocusDrafted}>No player selected</span>
        </div>
      </section>
    );
  }

  const isDrafted = Boolean(draftedDetail);

  return (
    <section className={styles.playerFocusBar} aria-label="Focused player">
      <div className={styles.playerFocusMain}>
        <div className={styles.playerFocusIdentity}>
          <strong>{player.name}</strong>
          <span>{player.team} | {player.positions.join("/")}</span>
        </div>
      </div>

      <div className={styles.playerFocusMetrics}>
        <span>
          <small>Value</small>
          <b>${player.value.toFixed(1)}</b>
        </span>
        <span>
          <small>ADP</small>
          <b>{player.adp.toFixed(0)}</b>
        </span>
        {recommendation && (
          <>
            <span>
              <small>Return</small>
              <b>{formatPercent(recommendation.pReturn)}</b>
            </span>
            <span>
              <small>Score</small>
              <b>{recommendation.score.toFixed(1)}</b>
            </span>
          </>
        )}
        {targetRound && (
          <span data-accent="true">
            <small>Target</small>
            <b>R{targetRound}</b>
          </span>
        )}
      </div>

      <ProjectedStatsStrip player={player} />

      <div className={styles.playerFocusAction}>
        <a
          className={styles.playerFocusExternalLink}
          href="https://www.fangraphs.com/"
          target="_blank"
          rel="noreferrer"
          title="Open FanGraphs"
        >
          FanGraphs
        </a>
        {isDrafted ? (
          <span className={styles.playerFocusDrafted}>
            Drafted #{draftedDetail?.overallPick} by {draftedDetail?.teamName}
          </span>
        ) : (
          <button
            type="button"
            className={`btn ${isOnClock ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onDraftPlayer(player.id)}
          >
            {draftActionLabel ?? (isOnClock ? "Draft" : "Force Pick")}
          </button>
        )}
      </div>
    </section>
  );
}
