"use client";

import React from "react";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

interface EditPickModalProps {
  editingPick: DraftPick | null;
  teamName: string;
  editPlayerId: string;
  editPlayerOptions: Player[];
  canSave: boolean;
  onPlayerChange: (playerId: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditPickModal({
  editingPick,
  teamName,
  editPlayerId,
  editPlayerOptions,
  canSave,
  onPlayerChange,
  onSave,
  onClose,
}: EditPickModalProps) {
  if (!editingPick) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 11, 17, 0.74)",
        backdropFilter: "blur(8px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Edit Pick #{editingPick.overallPick}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Round {editingPick.round}, Pick {editingPick.pickInRound} - {teamName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "var(--text-muted)",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 700 }}>
            Player
          </label>
          <select
            className="premium-input"
            value={editPlayerId}
            onChange={(e) => onPlayerChange(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="">Select a player...</option>
            {editPlayerOptions.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} - {player.team} - {player.positions.join("/")} - ADP {player.adp.toFixed(0)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canSave}
            onClick={onSave}
          >
            Save Pick
          </button>
        </div>
      </div>
    </div>
  );
}
