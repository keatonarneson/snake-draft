"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

interface EditPickModalProps {
  editingPick: DraftPick | null;
  teamName: string;
  editPlayerId: string;
  editPlayerOptions: Player[];
  canSave: boolean;
  onPlayerChange: (playerId: string) => void;
  onSave: (playerId?: string) => void;
  onClose: () => void;
}

const MAX_RESULTS = 60;

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
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isRecording = Boolean(editingPick) && !editingPick?.playerDraftedId;

  // Focus the search box when the modal mounts (the parent remounts it per pick).
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return editPlayerOptions.slice(0, MAX_RESULTS);
    return editPlayerOptions
      .filter((player) =>
        player.name.toLowerCase().includes(query) ||
        player.team.toLowerCase().includes(query) ||
        player.positions.some((position) => position.toLowerCase().includes(query))
      )
      .slice(0, MAX_RESULTS);
  }, [search, editPlayerOptions]);

  // Clamp the highlight to the current results without storing derived state.
  const safeHighlight = filteredPlayers.length === 0
    ? 0
    : Math.min(highlightIndex, filteredPlayers.length - 1);

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeRow = container.querySelector<HTMLElement>('[data-highlighted="true"]');
    activeRow?.scrollIntoView({ block: "nearest" });
  }, [safeHighlight, filteredPlayers]);

  if (!editingPick || typeof document === "undefined") return null;

  const commitPlayer = (playerId: string) => {
    onPlayerChange(playerId);
    onSave(playerId);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => Math.min(current + 1, filteredPlayers.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const player = filteredPlayers[safeHighlight];
      if (player) commitPlayer(player.id);
    }
  };

  return createPortal((
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
        role="dialog"
        aria-modal="true"
        aria-label={`${isRecording ? "Record" : "Edit"} pick ${editingPick.overallPick}`}
        style={{
          width: "min(520px, 100%)",
          background: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {isRecording ? "Record" : "Edit"} Pick #{editingPick.overallPick}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Round {editingPick.round}, Pick {editingPick.pickInRound} - {teamName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
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

        <input
          ref={inputRef}
          className="premium-input"
          type="text"
          value={search}
          placeholder="Search by name, team, or position..."
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightIndex(0);
          }}
          style={{ width: "100%" }}
        />

        <div
          ref={listRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: "320px",
            overflowY: "auto",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "4px",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          {filteredPlayers.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              No available players match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filteredPlayers.map((player, index) => {
              const isHighlighted = index === safeHighlight;
              const isCurrent = player.id === editPlayerId;
              return (
                <button
                  key={player.id}
                  type="button"
                  data-highlighted={isHighlighted}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => commitPlayer(player.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: isCurrent ? "1px solid var(--primary)" : "1px solid transparent",
                    background: isHighlighted ? "rgba(99, 102, 241, 0.18)" : "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                >
                  <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {player.name}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      {player.team} &middot; {player.positions.join("/")} &middot; ADP {player.adp.toFixed(0)}
                    </span>
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: player.value < 0 ? "var(--danger)" : "var(--success)" }}>
                    ${player.value.toFixed(1)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
            ↑↓ to navigate &middot; Enter to {isRecording ? "record" : "save"} &middot; Esc to close
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!canSave || filteredPlayers.length === 0}
              onClick={() => {
                const player = filteredPlayers[safeHighlight];
                if (player) commitPlayer(player.id);
              }}
            >
              {isRecording ? "Record Pick" : "Save Pick"}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
