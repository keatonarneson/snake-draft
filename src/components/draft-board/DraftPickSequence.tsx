"use client";

import styles from "./DraftPickSequence.module.css";
import { DraftPick } from "../../engine";
import { Player } from "../../types/draft";

interface DraftPickSequenceProps {
  picks: DraftPick[];
  currentPickIndex: number;
  teamNames: string[];
  userTeamIndex: number;
  isLiveDraftMode?: boolean;
  playerMap: Map<string, Player>;
  canEditPicks: boolean;
  onEditPick: (pickIndex: number) => void;
  onFocusPlayer?: (playerId: string) => void;
}

interface PickRowProps {
  canEditPicks: boolean;
  index: number;
  isCurrent?: boolean;
  isLiveDraftMode?: boolean;
  isUser: boolean;
  pick: DraftPick;
  playerMap: Map<string, Player>;
  teamName: string;
  onEditPick: (pickIndex: number) => void;
  onFocusPlayer?: (playerId: string) => void;
}

function PickRow({
  canEditPicks,
  index,
  isCurrent = false,
  isLiveDraftMode = false,
  isUser,
  pick,
  playerMap,
  teamName,
  onEditPick,
  onFocusPlayer,
}: PickRowProps) {
  const draftedPlayer = pick.playerDraftedId ? playerMap.get(pick.playerDraftedId) : null;
  const canFocusPlayer = Boolean(draftedPlayer && onFocusPlayer);
  const canEditCompletedPick = canEditPicks && Boolean(draftedPlayer);
  const canSetLiveCurrentPick = canEditPicks && isCurrent && isLiveDraftMode && !draftedPlayer;
  const actionLabel = canEditCompletedPick ? "Edit" : canSetLiveCurrentPick ? "Set Pick" : null;
  const focusDraftedPlayer = () => {
    if (draftedPlayer) {
      onFocusPlayer?.(draftedPlayer.id);
    }
  };

  return (
    <div
      className={styles.pickRow}
      data-current={isCurrent}
      data-user={isUser}
      data-drafted={Boolean(draftedPlayer)}
      data-focusable={canFocusPlayer}
      role={canFocusPlayer ? "button" : undefined}
      tabIndex={canFocusPlayer ? 0 : undefined}
      onClick={canFocusPlayer ? focusDraftedPlayer : undefined}
      onKeyDown={(event) => {
        if (!canFocusPlayer) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          focusDraftedPlayer();
        }
      }}
    >
      <div className={styles.pickMain}>
        <span className={styles.pickNumber}>#{pick.overallPick}</span>
        <div className={styles.pickInfo}>
          <div className={styles.pickMeta}>
            <span>R{pick.round}.{pick.pickInRound}</span>
            <span>{teamName}</span>
          </div>
          {draftedPlayer ? (
            <span className={styles.playerName}>
              {draftedPlayer.name}
              <span className={styles.playerPositions}> {draftedPlayer.positions.join("/")}</span>
            </span>
          ) : (
            <span className={styles.emptyPick}>{isCurrent ? "On the clock" : "Queued"}</span>
          )}
        </div>
      </div>

      <div className={styles.pickActions}>
        {actionLabel && (
          <button
            type="button"
            className={styles.editButton}
            onClick={(event) => {
              event.stopPropagation();
              onEditPick(index);
            }}
            title={draftedPlayer ? "Change this pick" : "Set this pick manually"}
          >
            {actionLabel}
          </button>
        )}
        {draftedPlayer ? (
          <span className={styles.playerValue} data-negative={draftedPlayer.value < 0}>
            ${draftedPlayer.value.toFixed(1)}
          </span>
        ) : isUser ? (
          <span className={styles.pickSlot}>You</span>
        ) : null}
      </div>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return <div className={styles.emptySection}>{label}</div>;
}

export default function DraftPickSequence({
  picks,
  currentPickIndex,
  teamNames,
  userTeamIndex,
  isLiveDraftMode = false,
  playerMap,
  canEditPicks,
  onEditPick,
  onFocusPlayer,
}: DraftPickSequenceProps) {
  const pastPicks = picks.slice(0, currentPickIndex).reverse();
  const currentPick = picks[currentPickIndex];

  return (
    <div className={styles.trackerLayout}>
      <section className={styles.trackerSection}>
        <div className={styles.sectionHeader}>
          <span>On Clock</span>
          <small>{currentPick ? `Pick #${currentPick.overallPick}` : "Complete"}</small>
        </div>
        {currentPick ? (
          <PickRow
            canEditPicks={canEditPicks}
            index={currentPickIndex}
            isCurrent
            isLiveDraftMode={isLiveDraftMode}
            isUser={currentPick.teamIndex === userTeamIndex}
            pick={currentPick}
            playerMap={playerMap}
            teamName={teamNames[currentPick.teamIndex]}
            onEditPick={onEditPick}
            onFocusPlayer={onFocusPlayer}
          />
        ) : (
          <EmptySection label="Draft complete." />
        )}
      </section>

      <section className={styles.trackerSection}>
        <div className={styles.sectionHeader}>
          <span>Past Picks</span>
          <small>{pastPicks.length > 0 ? `${pastPicks.length} drafted` : "None yet"}</small>
        </div>
        <div className={`${styles.pickStack} ${styles.pastPickStack}`}>
          {pastPicks.length > 0 ? (
            pastPicks.map((pick) => {
              const index = pick.overallPick - 1;
              return (
                <PickRow
                  key={pick.overallPick}
                  canEditPicks={canEditPicks}
                  index={index}
                  isLiveDraftMode={isLiveDraftMode}
                  isUser={pick.teamIndex === userTeamIndex}
                  pick={pick}
                  playerMap={playerMap}
                  teamName={teamNames[pick.teamIndex]}
                  onEditPick={onEditPick}
                  onFocusPlayer={onFocusPlayer}
                />
              );
            })
          ) : (
            <EmptySection label="Drafted players will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}
