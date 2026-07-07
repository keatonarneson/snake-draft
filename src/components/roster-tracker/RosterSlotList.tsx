"use client";

import React from "react";
import styles from "../RosterTracker.module.css";
import {
  BuiltRoster,
  canPlayerUseRosterSlot,
  ROSTER_SLOTS,
  RosterSlot,
  SLOT_DISPLAY_LABELS,
  SlotAssignment,
} from "../../engine/rosterSlots";
import { Player, PlayerStats } from "../../types/draft";

interface RosterSlotRowProps {
  slot: RosterSlot;
  isUser: boolean;
  isBench: boolean;
  hasOverride: boolean;
  onEditProjection: (player: Player) => void;
  onMovePlayer: (player: Player, destination: SlotAssignment) => void;
}

function RosterSlotRow({ slot, isUser, isBench, hasOverride, onEditProjection, onMovePlayer }: RosterSlotRowProps) {
  const slotClass = slot.player ? `${styles.rosterSlot} ${styles.rosterSlotFilled}` : styles.rosterSlot;

  return (
    <div className={slotClass}>
      <span className={styles.rosterSlotLabel} style={isBench ? { color: "var(--text-muted)" } : undefined}>
        {slot.label}
      </span>
      {slot.player ? (
        <div className={styles.rosterPlayerContent}>
          <div className={styles.rosterPlayerTop}>
            <span className={styles.rosterPlayerName}>
              <span>{slot.player.name}</span>
              {slot.player.positions.length > 1 && (
                <span className={styles.rosterEligibility}>{slot.player.positions.join("/")}</span>
              )}
              {isUser && hasOverride && <span className={styles.rosterCustomProjection}>Custom</span>}
            </span>
            <span className={styles.rosterPlayerValue}>${slot.player.value.toFixed(1)}</span>
          </div>
          {isUser && (
            <div className={styles.rosterPlayerControls}>
              <button
                type="button"
                className={styles.rosterProjectionButton}
                onClick={() => onEditProjection(slot.player!)}
                title={`Edit ${slot.player.name} projections`}
                aria-label={`Edit ${slot.player.name} projections`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <select
                className={styles.rosterSlotSelect}
                aria-label={`Move ${slot.player.name}`}
                value={isBench ? "bench" : slot.id}
                onChange={(event) => onMovePlayer(slot.player!, event.target.value as SlotAssignment)}
                title={`Move ${slot.player.name} to another eligible roster slot`}
              >
                {ROSTER_SLOTS.map((candidate, candidateIndex) =>
                  canPlayerUseRosterSlot(slot.player!, candidate) ? (
                    <option key={`slot-${candidateIndex}`} value={`slot-${candidateIndex}`}>
                      {SLOT_DISPLAY_LABELS[candidateIndex]}
                    </option>
                  ) : null
                )}
                <option value="bench">BN</option>
              </select>
            </div>
          )}
        </div>
      ) : (
        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>Empty</span>
      )}
    </div>
  );
}

interface RosterSlotListProps {
  roster: BuiltRoster;
  isUser: boolean;
  rosterCount: number;
  numRounds: number;
  projectionOverrides: Record<string, Partial<PlayerStats>>;
  onEditProjection: (player: Player) => void;
  onMovePlayer: (player: Player, destination: SlotAssignment) => void;
}

export default function RosterSlotList({
  roster,
  isUser,
  rosterCount,
  numRounds,
  projectionOverrides,
  onEditProjection,
  onMovePlayer,
}: RosterSlotListProps) {
  const renderRow = (slot: RosterSlot, isBench: boolean) => (
    <RosterSlotRow
      key={slot.id}
      slot={slot}
      isUser={isUser}
      isBench={isBench}
      hasOverride={Boolean(slot.player && projectionOverrides[slot.player.id])}
      onEditProjection={onEditProjection}
      onMovePlayer={onMovePlayer}
    />
  );

  return (
    <>
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Roster Slots ({rosterCount} / {numRounds})
      </span>

      <div className={styles.rosterList} style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
        {roster.active.map((slot) => renderRow(slot, false))}
        {roster.bench.map((slot) => renderRow(slot, true))}
      </div>
    </>
  );
}
