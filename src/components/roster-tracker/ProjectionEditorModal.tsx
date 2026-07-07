"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import styles from "../RosterTracker.module.css";
import { scaleHitterCountingStats } from "../../engine/categoryStats";
import { Player, PlayerStats } from "../../types/draft";

type EditableStatKey = keyof PlayerStats;

const HITTER_PROJECTION_FIELDS: { key: EditableStatKey; label: string; step?: string }[] = [
  { key: "AB", label: "AB" },
  { key: "R", label: "R" },
  { key: "HR", label: "HR" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "SB" },
  { key: "AVG", label: "AVG", step: "0.001" },
];

const PITCHER_PROJECTION_FIELDS: { key: EditableStatKey; label: string; step?: string }[] = [
  { key: "IP", label: "IP", step: "0.1" },
  { key: "W", label: "W" },
  { key: "SV", label: "SV" },
  { key: "SO", label: "SO" },
  { key: "ERA", label: "ERA", step: "0.01" },
  { key: "WHIP", label: "WHIP", step: "0.01" },
];

interface ProjectionEditorModalProps {
  /** Source player being edited (mount with key={player.id} so drafts reset per player). */
  player: Player;
  /** Existing override for this player, if any. */
  override?: Partial<PlayerStats>;
  onSave: (playerId: string, changedStats: Partial<PlayerStats>) => void;
  onResetOverride: (playerId: string) => void;
  onClose: () => void;
}

export default function ProjectionEditorModal({
  player,
  override,
  onSave,
  onResetOverride,
  onClose,
}: ProjectionEditorModalProps) {
  const [projectionDraft, setProjectionDraft] = useState<Partial<PlayerStats>>(() => ({
    ...player.stats,
    ...(override || {}),
  }));
  const [scaleHittingStatsWithAB, setScaleHittingStatsWithAB] = useState(false);
  const [hittingScaleBaseline, setHittingScaleBaseline] = useState<Partial<PlayerStats>>({});
  const [scaleTargetAB, setScaleTargetAB] = useState("");

  const fields = player.isPitcher ? PITCHER_PROJECTION_FIELDS : HITTER_PROJECTION_FIELDS;

  const updateProjectionField = (field: EditableStatKey, value: number) => {
    setProjectionDraft((current) => ({ ...current, [field]: value }));
  };

  const setHittingScaleMode = (enabled: boolean) => {
    setScaleHittingStatsWithAB(enabled);
    if (enabled) {
      setHittingScaleBaseline({ ...projectionDraft });
      setScaleTargetAB(String(projectionDraft.AB ?? ""));
    } else {
      setHittingScaleBaseline({});
      setScaleTargetAB("");
    }
  };

  const applyHittingScale = () => {
    const scaled = scaleHitterCountingStats(hittingScaleBaseline, Number(scaleTargetAB));
    if (!scaled) return;
    setProjectionDraft((current) => ({ ...current, ...scaled }));
  };

  const handleSave = () => {
    const changedStats = fields.reduce<Partial<PlayerStats>>((acc, field) => {
      const nextValue = projectionDraft[field.key];
      const sourceValue = player.stats[field.key];
      if (nextValue !== undefined && nextValue !== sourceValue) {
        acc[field.key] = nextValue;
      }
      return acc;
    }, {});

    if (Object.keys(changedStats).length > 0) {
      onSave(player.id, changedStats);
    } else {
      onResetOverride(player.id);
    }
    onClose();
  };

  const handleResetToSource = () => {
    onResetOverride(player.id);
    setProjectionDraft({ ...player.stats });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.projectionEditorBackdrop} onClick={onClose}>
      <div className={styles.projectionEditorModal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.projectionEditorHeader}>
          <div>
            <h3>Edit Projections</h3>
            <p>
              {player.name} | {player.positions.join("/")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close projection editor">
            &times;
          </button>
        </div>

        {!player.isPitcher && (
          <div className={styles.projectionScaleOption}>
            <div>
              <strong>When AB changes</strong>
              <small>Scale mode adjusts R, HR, RBI, and SB. AVG stays unchanged.</small>
            </div>
            <div className={styles.projectionScaleModes}>
              <button type="button" data-active={!scaleHittingStatsWithAB} onClick={() => setHittingScaleMode(false)}>
                Independent
              </button>
              <button type="button" data-active={scaleHittingStatsWithAB} onClick={() => setHittingScaleMode(true)}>
                Scale stats
              </button>
            </div>
            {scaleHittingStatsWithAB && (
              <div className={styles.projectionScaleApply}>
                <label>
                  Target AB
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={scaleTargetAB}
                    onChange={(event) => setScaleTargetAB(event.target.value)}
                  />
                </label>
                <button type="button" onClick={applyHittingScale}>
                  Apply Scale
                </button>
                <span>
                  {Number(hittingScaleBaseline.AB || 0).toFixed(0)} AB baseline
                  {" -> "}
                  {Number(scaleTargetAB || 0).toFixed(0)} AB
                  {" ("}
                  {Number(hittingScaleBaseline.AB || 0) > 0 && Number(scaleTargetAB) > 0
                    ? `${(Number(scaleTargetAB) / Number(hittingScaleBaseline.AB || 1)).toFixed(2)}x`
                    : "enter target"}
                  {")"}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={styles.projectionEditorGrid}>
          {fields.map((field) => {
            const sourceValue = player.stats[field.key] ?? 0;
            const currentValue = projectionDraft[field.key] ?? sourceValue;
            const isChanged = currentValue !== sourceValue;

            return (
              <label key={field.key} className={styles.projectionEditorField} data-changed={isChanged}>
                <span>
                  {field.label}
                  <small>Source {sourceValue}</small>
                </span>
                <input
                  type="number"
                  min="0"
                  step={field.step || "1"}
                  value={currentValue}
                  disabled={scaleHittingStatsWithAB && field.key === "AB"}
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  onChange={(event) => {
                    const value = event.target.value === "" ? 0 : Number(event.target.value);
                    updateProjectionField(field.key, value);
                  }}
                />
              </label>
            );
          })}
        </div>

        <div className={styles.projectionEditorActions}>
          <button type="button" className="btn btn-secondary" onClick={handleResetToSource} disabled={!override}>
            Reset to Source
          </button>
          <div>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save Projections
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
