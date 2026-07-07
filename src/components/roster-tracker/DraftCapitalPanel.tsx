"use client";

import React from "react";
import styles from "../RosterTracker.module.css";
import { calculateDraftCapital } from "../../engine/draftCapital";

type DraftCapital = ReturnType<typeof calculateDraftCapital>;

export default function DraftCapitalPanel({ draftCapital }: { draftCapital: DraftCapital }) {
  return (
    <div className={styles.draftCapitalPanel}>
      <div className={styles.draftCapitalHeader}>
        <span>Draft Capital</span>
        <span>{draftCapital.total > 0 ? `${draftCapital.pitcherPct}% pitching` : "No picks yet"}</span>
      </div>

      <div className={styles.draftCapitalStack} aria-label="Draft capital split">
        <div
          className={`${styles.draftCapitalSegment} ${styles.draftCapitalHitters}`}
          style={{ width: `${draftCapital.hitterPct}%` }}
          title={`Hitters: ${draftCapital.hitterPct}%`}
        />
        <div
          className={`${styles.draftCapitalSegment} ${styles.draftCapitalSp}`}
          style={{ width: `${draftCapital.spPct}%` }}
          title={`SP: ${draftCapital.spPct}%`}
        />
        <div
          className={`${styles.draftCapitalSegment} ${styles.draftCapitalRp}`}
          style={{ width: `${draftCapital.rpPct}%` }}
          title={`RP: ${draftCapital.rpPct}%`}
        />
      </div>

      <div className={styles.draftCapitalLegend}>
        <span>
          <b className={styles.draftCapitalDotHitters} />Hit {draftCapital.hitterPct}%
        </span>
        <span>
          <b className={styles.draftCapitalDotSp} />SP {draftCapital.spPct}%
        </span>
        <span>
          <b className={styles.draftCapitalDotRp} />RP {draftCapital.rpPct}%
        </span>
      </div>

      <p className={styles.draftCapitalNote}>{draftCapital.note}</p>

      <details className={styles.draftCapitalDetails}>
        <summary>
          <span>Pick Breakdown</span>
          <span>{draftCapital.picks.length} picks</span>
        </summary>
        {draftCapital.picks.length > 0 ? (
          <div className={styles.draftCapitalPickList}>
            {draftCapital.picks.map((pick) => (
              <div key={pick.player.id} className={styles.draftCapitalPickRow}>
                <div className={styles.draftCapitalPickMain}>
                  <span className={styles.draftCapitalPickName}>{pick.player.name}</span>
                  <span className={styles.draftCapitalPickMeta}>
                    {pick.bucket} - R{pick.round ?? "-"}
                    {pick.overallPick ? ` - P${pick.overallPick}` : ""}
                  </span>
                </div>
                <div className={styles.draftCapitalPickValue}>
                  <span>{pick.pct}%</span>
                  <small>{pick.capital.toFixed(1)} cap</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.draftCapitalEmpty}>Drafted players will appear here.</p>
        )}
      </details>
    </div>
  );
}
