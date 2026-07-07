"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./DraftRoom.module.css";
import { Player, PlayerStats } from "../../types/draft";
import {
  calculatePositionScarcity,
  getRecommendations,
  DraftPick,
  CpuScoreDetails,
  CpuProfile,
  calculateCpuScore,
  calculateCategoryNeeds,
  CategoryNeeds,
  getCpuArchetype,
  getCpuProfile,
  getCpuProfileTemplates,
  selectCpuPick,
} from "../../engine";
import SettingsPanel from "../../components/SettingsPanel";
import { SandboxSettingsProvider } from "../../components/settings-panel";
import DraftBoard from "../../components/DraftBoard";
import PlayerList from "../../components/PlayerList";
import RosterTracker from "../../components/RosterTracker";
import DashboardSummary from "../../components/DashboardSummary";
import StandingsView from "../../components/StandingsView";
import { useDraftState } from "../../hooks/useDraftState";
import { useDraftTargets } from "../../hooks/useDraftTargets";
import { useProjectionLoader } from "../../hooks/useProjectionLoader";
import { usePersistedSnapshot } from "../../hooks/usePersistedSnapshot";
import type { ProjectionSystem } from "../../data/projections";

interface SandboxPreset {
  trustProjections: number;
  draftUrgency: number;
  categoryBalance: number;
  rosterFit: number;
  positionScarcity: number;
  riskStyle: "safe" | "balanced" | "aggressive";
  reachTolerance: number;
  savesStrategy: "wait" | "balanced" | "aggressive";
  rankScarcityCoeff: number;
}

type CpuProfileMode = "fixed" | "random";
type DraftMode = "mock" | "live";
type MobileSection = "setup" | "draft" | "roster";
type CenterView = "draft" | "plan" | "standings";

const DEFAULT_TARGETS = {
  R: 1125,
  HR: 315,
  RBI: 1103,
  SB: 190,
  AVG: 0.263,
  W: 93,
  SV: 88,
  SO: 1275,
  ERA: 3.65,
  WHIP: 1.2,
};
type TargetBenchmarks = typeof DEFAULT_TARGETS;

// Bump when the snapshot shape changes so stale saves are discarded on load.
const SNAPSHOT_VERSION = 1;
const DRAFT_STORAGE_KEY = "snake-draft:draft-snapshot";

interface DraftSnapshot {
  version: number;
  picks: DraftPick[];
  currentPickIndex: number;
  isDraftStarted: boolean;
  numTeams: number;
  userPosition: number;
  numRounds: number;
  draftMode: DraftMode;
  cpuProfileMode: CpuProfileMode;
  projectionSystem: ProjectionSystem;
  targets: TargetBenchmarks;
  sandbox: {
    trustProjections: number;
    draftUrgency: number;
    categoryBalance: number;
    rosterFit: number;
    positionScarcity: number;
    riskStyle: "safe" | "balanced" | "aggressive";
    reachTolerance: number;
    savesStrategy: "wait" | "balanced" | "aggressive";
    rankScarcityCoeff: number;
    activePreset: string;
  };
  cpuProfiles: CpuProfile[];
  cpuSavesStrategies: string[];
  projectionOverrides: Record<string, Partial<PlayerStats>>;
}

const PRESETS: Record<string, SandboxPreset> = {
  balanced: {
    trustProjections: 1.0,
    draftUrgency: 1.0,
    categoryBalance: 1.0,
    rosterFit: 1.0,
    positionScarcity: 1.0,
    riskStyle: "balanced",
    reachTolerance: 1.0,
    savesStrategy: "balanced",
    rankScarcityCoeff: 0.15,
  },
  value_hunter: {
    trustProjections: 1.6,
    draftUrgency: 0.2,
    categoryBalance: 0.3,
    rosterFit: 0.3,
    positionScarcity: 0.3,
    riskStyle: "safe",
    reachTolerance: 0.2,
    savesStrategy: "wait",
    rankScarcityCoeff: 0.05,
  },
  market_realist: {
    trustProjections: 1.0,
    draftUrgency: 1.6,
    categoryBalance: 1.0,
    rosterFit: 1.0,
    positionScarcity: 1.6,
    riskStyle: "balanced",
    reachTolerance: 1.6,
    savesStrategy: "balanced",
    rankScarcityCoeff: 0.25,
  },
  category_builder: {
    trustProjections: 1.0,
    draftUrgency: 1.0,
    categoryBalance: 1.6,
    rosterFit: 1.6,
    positionScarcity: 1.0,
    riskStyle: "balanced",
    reachTolerance: 1.0,
    savesStrategy: "balanced",
    rankScarcityCoeff: 0.15,
  },
  upside_chaser: {
    trustProjections: 0.5,
    draftUrgency: 1.0,
    categoryBalance: 1.0,
    rosterFit: 0.5,
    positionScarcity: 1.0,
    riskStyle: "aggressive",
    reachTolerance: 1.6,
    savesStrategy: "wait",
    rankScarcityCoeff: 0.15,
  },
  safe_draft: {
    trustProjections: 1.5,
    draftUrgency: 0.4,
    categoryBalance: 1.0,
    rosterFit: 1.5,
    positionScarcity: 1.0,
    riskStyle: "safe",
    reachTolerance: 0.4,
    savesStrategy: "balanced",
    rankScarcityCoeff: 0.10,
  },
};

export default function DraftRoom() {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const [numTeams, setNumTeams] = useState(12);
  const [userPosition, setUserPosition] = useState(5); // 1-indexed draft slot
  const [numRounds, setNumRounds] = useState(30);
  const [draftMode, setDraftMode] = useState<DraftMode>("mock");
  const [simSpeed, setSimSpeed] = useState<"manual" | "paced" | "instant">("paced");
  const [cpuProfileMode, setCpuProfileMode] = useState<CpuProfileMode>("fixed");
  
  // Sandbox Algorithmic Weights (Simplified Knobs)
  const [trustProjections, setTrustProjections] = useState(1.0);
  const [draftUrgency, setDraftUrgency] = useState(1.0);
  const [categoryBalance, setCategoryBalance] = useState(1.0);
  const [rosterFit, setRosterFit] = useState(1.0);
  const [positionScarcityWeight, setPositionScarcityWeight] = useState(1.0);
  const [riskStyle, setRiskStyle] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [reachTolerance, setReachTolerance] = useState(1.0);
  const [savesStrategy, setSavesStrategy] = useState<"wait" | "balanced" | "aggressive">("balanced");
  const [rankScarcityCoeff, setRankScarcityCoeff] = useState(0.15);
  
  const [activePreset, setActivePreset] = useState<string>("balanced");
  
  // Custom Target Benchmarks
  const [targets, setTargets] = useState<TargetBenchmarks>(DEFAULT_TARGETS);
  
  const [cpuSavesStrategies, setCpuSavesStrategies] = useState<string[]>([]);
  const [cpuProfiles, setCpuProfiles] = useState<CpuProfile[]>([]);
  const [projectionOverrides, setProjectionOverrides] = useState<Record<string, Partial<PlayerStats>>>({});
  const [activeMobileSection, setActiveMobileSection] = useState<MobileSection>("draft");
  const [activeCenterView, setActiveCenterView] = useState<CenterView>("draft");
  
  // Track which team's roster is currently selected in the sidebar
  const [rosterViewTeamIndex, setRosterViewTeamIndex] = useState(4); // default to user index (userPosition - 1)

  const {
    picks,
    currentPickIndex,
    currentPick,
    draftedPlayerIds,
    isDraftStarted,
    isDraftComplete,
    setIsDraftStarted,
    resetDraftSequence,
    draftPlayer,
    setPickPlayer,
    undoLastPick,
    loadDraft,
  } = useDraftState({
    calculatePickScoreDetails,
    initialNumRounds: numRounds,
    initialNumTeams: numTeams,
    onUndoLastPick: () => setSimSpeed("manual"),
  });

  const isLiveDraftMode = draftMode === "live";

  const {
    players,
    projectionSystem,
    setProjectionSystem,
    isUsingCsv,
    isLoadingProjections,
    projectionLoadFailed,
  } = useProjectionLoader();

  const {
    roundTargets,
    setRoundTargets,
    toggleTargetPlayer,
    setRoundPositionTarget,
    moveTargetPlayer,
    addTargetPlayerToRound,
  } = useDraftTargets({
    players,
    currentPickIndex,
    picks,
    userPosition,
    draftedPlayerIds,
  });

  useEffect(() => {
    setRoundTargets({});
  }, [projectionSystem, numTeams, numRounds, userPosition, setRoundTargets]);

  // ----------------------------------------------------
  // Initialize or Reset Draft
  // ----------------------------------------------------
  const assignCpuProfiles = useCallback((teamsCount: number, userPos: number, profileMode: CpuProfileMode = cpuProfileMode) => {
    const userTeamIndex = userPos - 1;
    const templates = getCpuProfileTemplates();

    return Array.from({ length: teamsCount }, (_, i) => {
      if (i === userTeamIndex) return getCpuProfile(i, userTeamIndex);
      if (profileMode === "random") {
        return templates[Math.floor(Math.random() * templates.length)] || getCpuProfile(i, userTeamIndex);
      }
      return getCpuProfile(i, userTeamIndex);
    });
  }, [cpuProfileMode]);

  const initDraft = useCallback((teamsCount: number, roundsCount: number, userPos: number, profileMode: CpuProfileMode = cpuProfileMode) => {
    resetDraftSequence(teamsCount, roundsCount);
    setRosterViewTeamIndex(userPos - 1);
    setRoundTargets({});
    setProjectionOverrides({});

    const profiles = assignCpuProfiles(teamsCount, userPos, profileMode);
    setCpuProfiles(profiles);
    setCpuSavesStrategies(profiles.map((profile) => profile.savesStrategy));
  }, [resetDraftSequence, setRoundTargets, assignCpuProfiles, cpuProfileMode]);

  // Generate team names list
  const teamNames = useMemo(() => {
    const names = [];
    for (let i = 1; i <= numTeams; i++) {
      if (i === userPosition) {
        names.push(`Team ${i} (You)`);
      } else {
        names.push(`Team ${i}`);
      }
    }
    return names;
  }, [numTeams, userPosition]);

  // ----------------------------------------------------
  // Derivations & Calculations
  // ----------------------------------------------------
  const isUserTurn = !isDraftComplete && currentPick?.teamIndex === userPosition - 1;
  const canRecordPick = isDraftStarted && !isDraftComplete;
  const playerActionLabel = isLiveDraftMode ? "Mark Drafted" : undefined;

  // List of already drafted players with extra details
  const draftedPlayersDetails = useMemo(() => {
    const list: { player: Player; overallPick: number; round: number; teamName: string; teamIndex: number }[] = [];
    const playerMap = new Map(players.map((p) => [p.id, p]));

    picks.slice(0, currentPickIndex).forEach((pick) => {
      if (pick.playerDraftedId) {
        const player = playerMap.get(pick.playerDraftedId);
        if (player) {
          list.push({
            player,
            overallPick: pick.overallPick,
            round: pick.round,
            teamIndex: pick.teamIndex,
            teamName: teamNames[pick.teamIndex],
          });
        }
      }
    });

    return list;
  }, [picks, currentPickIndex, players, teamNames]);

  // Available players pool
  const availablePlayers = useMemo(() => {
    return players.filter((p) => !draftedPlayerIds.has(p.id));
  }, [players, draftedPlayerIds]);

  // Find user's next pick overall number (1-indexed)
  const userNextPickOverall = useMemo(() => {
    if (isDraftComplete) return picks.length + 1;
    
    // Find the next pick in the sequence belonging to the user
    for (let i = currentPickIndex + 1; i < picks.length; i++) {
      if (picks[i].teamIndex === userPosition - 1) {
        return picks[i].overallPick;
      }
    }
    
    // If no future pick, return a value beyond the end of the draft
    return picks.length + 2;
  }, [picks, currentPickIndex, userPosition, isDraftComplete]);

  const userPicks = useMemo(() => {
    return picks.filter((p) => p.teamIndex === userPosition - 1);
  }, [picks, userPosition]);

  // Calculate real-time position scarcity
  const positionScarcity = useMemo(() => {
    const positions = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];
    const pCurr = isDraftComplete ? picks.length : currentPick?.overallPick ?? picks.length;
    const pNext = userNextPickOverall;

    return calculatePositionScarcity(players, availablePlayers, pCurr, pNext, positions, rankScarcityCoeff, numTeams);
  }, [players, availablePlayers, userNextPickOverall, isDraftComplete, picks.length, currentPick, rankScarcityCoeff, numTeams]);

  // Get user's drafted players
  const userDraftedPlayers = useMemo(() => {
    return draftedPlayersDetails
      .filter((d) => d.teamIndex === userPosition - 1)
      .map((d) => ({
        ...d.player,
        stats: {
          ...d.player.stats,
          ...(projectionOverrides[d.player.id] || {}),
        },
      }));
  }, [draftedPlayersDetails, userPosition, projectionOverrides]);

  const userCategoryNeeds: CategoryNeeds = useMemo(() => {
    return calculateCategoryNeeds(userDraftedPlayers, numRounds, targets);
  }, [userDraftedPlayers, numRounds, targets]);

  const updateProjectionOverride = useCallback((playerId: string, stats: Partial<PlayerStats>) => {
    setProjectionOverrides((current) => ({
      ...current,
      [playerId]: stats,
    }));
  }, []);

  const resetProjectionOverride = useCallback((playerId: string) => {
    setProjectionOverrides((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }, []);

  // Calculate smart pick recommendations for the user
  const recommendations = useMemo(() => {
    const pCurr = isDraftComplete ? picks.length : currentPick?.overallPick ?? picks.length;
    const pNext = userNextPickOverall;
    const round = isDraftComplete ? numRounds : currentPick?.round ?? numRounds;

    // Map simplified state levers to raw engine parameters
    const needsMultiplier = categoryBalance;
    const scarcityMultiplier = positionScarcityWeight;
    const reachMultiplier = Math.max(0.0, 2.0 - reachTolerance);
    const upsideMultiplier = riskStyle === "safe" ? 0.0 : riskStyle === "aggressive" ? 2.0 : 1.0;
    const benchPenaltyMultiplier = rosterFit;

    return getRecommendations(
      availablePlayers,
      pCurr,
      pNext,
      positionScarcity,
      userDraftedPlayers,
      numRounds,
      round,
      {
        needsMultiplier,
        scarcityMultiplier,
        reachMultiplier,
        upsideMultiplier,
        benchPenaltyMultiplier,
        trustProjections,
        draftUrgency,
        savesStrategy,
      },
      targets
    );
  }, [
    availablePlayers,
    userNextPickOverall,
    positionScarcity,
    isDraftComplete,
    picks.length,
    currentPick,
    userDraftedPlayers,
    numRounds,
    trustProjections,
    draftUrgency,
    categoryBalance,
    rosterFit,
    positionScarcityWeight,
    riskStyle,
    reachTolerance,
    savesStrategy,
    targets,
  ]);

  // ----------------------------------------------------
  // Draft Actions
  // ----------------------------------------------------
  function calculatePickScoreDetails(
    playerId: string,
    pickIndex: number,
    draftPicks: DraftPick[],
    cpuScore?: number,
    cpuScoreDetails?: CpuScoreDetails
  ) {
    let finalCpuScore = cpuScore;
    let finalCpuScoreDetails = cpuScoreDetails;
    const pick = draftPicks[pickIndex];

    // In live mode we only track real picks; CPU archetype scoring is
    // meaningless (and expensive on large projection sets), so skip it.
    if (isLiveDraftMode) {
      return { finalCpuScore, finalCpuScoreDetails };
    }

    if (finalCpuScore === undefined && pick) {
      const playerObj = players.find(p => p.id === playerId);
      if (playerObj) {
        const teamIndex = pick.teamIndex;
        const playerMap = new Map(players.map((p) => [p.id, p]));
        const priorRoster = draftPicks
          .slice(0, pickIndex)
          .filter((draftPick) => draftPick.teamIndex === teamIndex && draftPick.playerDraftedId)
          .map((draftPick) => playerMap.get(draftPick.playerDraftedId as string))
          .filter((player): player is Player => Boolean(player));
        const cpuArchetype = getCpuArchetype(teamIndex, userPosition - 1);
        const cpuProfile = cpuProfiles[teamIndex] || getCpuProfile(teamIndex, userPosition - 1);
        const strategy = cpuProfile.savesStrategy || cpuSavesStrategies[teamIndex] || "balanced";
        const details = calculateCpuScore(
          playerObj,
          pick.overallPick,
          priorRoster,
          numRounds,
          cpuArchetype,
          positionScarcity,
          pickIndex,
          draftPicks,
          players,
          strategy,
          0.0, // no random noise for manual/edit pick logs
          cpuProfile
        );
        finalCpuScore = details.score;
        finalCpuScoreDetails = details;
      }
    }

    return { finalCpuScore, finalCpuScoreDetails };
  }

  const recordDraftPlayer = useCallback((playerId: string) => {
    if (isLiveDraftMode) {
      draftPlayer(playerId, 0);
      return;
    }

    draftPlayer(playerId);
  }, [draftPlayer, isLiveDraftMode]);

  // ----------------------------------------------------
  // CPU Drafting Logic
  // ----------------------------------------------------
  const executeCpuPick = useCallback(() => {
    if (currentPickIndex >= picks.length || !currentPick) return;

    const cpuTeamIndex = currentPick.teamIndex;
    if (cpuTeamIndex === userPosition - 1) return; // Wait for user

    const cpuProfile = cpuProfiles[cpuTeamIndex] || getCpuProfile(cpuTeamIndex, userPosition - 1);
    const strategy = cpuProfile.savesStrategy || cpuSavesStrategies[cpuTeamIndex] || "balanced";
    const cpuRoster = draftedPlayersDetails
      .filter((d) => d.teamIndex === cpuTeamIndex)
      .map((d) => d.player);

    const selection = selectCpuPick({
      cpuProfile,
      cpuArchetype: cpuProfile.archetype,
      strategy,
      cpuRoster,
      availablePlayers,
      numRounds,
      scarcityMap: positionScarcity,
      currentPickIndex,
      currentOverallPick: currentPick.overallPick,
      currentRound: currentPick.round,
      picks,
      allPlayers: players,
    });

    if (selection) {
      draftPlayer(selection.playerId, selection.score, selection.details);
    }
  }, [currentPickIndex, picks, currentPick, userPosition, draftedPlayersDetails, numRounds, availablePlayers, draftPlayer, positionScarcity, players, cpuSavesStrategies, cpuProfiles]);

  // Effect to drive CPU picks
  useEffect(() => {
    if (!isDraftStarted || isDraftComplete || !currentPick) return;
    if (isLiveDraftMode) return;

    const cpuTeamIndex = currentPick.teamIndex;
    const isCpuTurn = cpuTeamIndex !== userPosition - 1;

    if (isCpuTurn) {
      if (simSpeed === "instant") {
        executeCpuPick();
      } else if (simSpeed === "paced") {
        const timer = setTimeout(() => {
          executeCpuPick();
        }, 500);
        return () => clearTimeout(timer);
      }
      // If manual, we wait for the user to trigger the click
    }
  }, [currentPickIndex, userPosition, simSpeed, isDraftComplete, currentPick, executeCpuPick, isDraftStarted, isLiveDraftMode]);

  // ----------------------------------------------------
  // Configuration Changes
  // ----------------------------------------------------
  const handleConfigChange = (newConfig: {
    numTeams?: number;
    userPosition?: number;
    numRounds?: number;
    draftMode?: DraftMode;
    simSpeed?: "manual" | "paced" | "instant";
    cpuProfileMode?: CpuProfileMode;
  }) => {
    const nextNumTeams = newConfig.numTeams ?? numTeams;
    const nextUserPosition = newConfig.userPosition ?? userPosition;
    const nextNumRounds = newConfig.numRounds ?? numRounds;
    const shouldResetDraft =
      newConfig.numTeams !== undefined ||
      newConfig.userPosition !== undefined ||
      newConfig.numRounds !== undefined ||
      newConfig.draftMode !== undefined ||
      newConfig.cpuProfileMode !== undefined;

    if (newConfig.numTeams !== undefined) setNumTeams(newConfig.numTeams);
    if (newConfig.userPosition !== undefined) {
      setUserPosition(newConfig.userPosition);
      setRosterViewTeamIndex(newConfig.userPosition - 1);
    }
    if (newConfig.numRounds !== undefined) setNumRounds(newConfig.numRounds);
    if (newConfig.draftMode !== undefined) {
      setDraftMode(newConfig.draftMode);
      if (newConfig.draftMode === "live") {
        setSimSpeed("manual");
      }
    }
    if (newConfig.simSpeed !== undefined) setSimSpeed(newConfig.simSpeed);
    if (newConfig.cpuProfileMode !== undefined) setCpuProfileMode(newConfig.cpuProfileMode);
    if (shouldResetDraft) {
      initDraft(nextNumTeams, nextNumRounds, nextUserPosition, newConfig.cpuProfileMode ?? cpuProfileMode);
    }
  };

  const handleProjectionSystemChange = (system: typeof projectionSystem) => {
    setProjectionSystem(system);
    initDraft(numTeams, numRounds, userPosition);
  };

  const checkAndSetActivePreset = (
    trust: number,
    urgency: number,
    balance: number,
    fit: number,
    scarcity: number,
    risk: "safe" | "balanced" | "aggressive",
    reach: number,
    saves: "wait" | "balanced" | "aggressive",
    rankScarcity: number
  ) => {
    let matchedPreset = "custom";
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (
        preset.trustProjections === trust &&
        preset.draftUrgency === urgency &&
        preset.categoryBalance === balance &&
        preset.rosterFit === fit &&
        preset.positionScarcity === scarcity &&
        preset.riskStyle === risk &&
        preset.reachTolerance === reach &&
        preset.savesStrategy === saves &&
        preset.rankScarcityCoeff === rankScarcity
      ) {
        matchedPreset = key;
        break;
      }
    }
    setActivePreset(matchedPreset);
  };

  const handleSandboxChange = useCallback((changes: {
    trustProjections?: number;
    draftUrgency?: number;
    categoryBalance?: number;
    rosterFit?: number;
    positionScarcity?: number;
    riskStyle?: "safe" | "balanced" | "aggressive";
    reachTolerance?: number;
    savesStrategy?: "wait" | "balanced" | "aggressive";
    rankScarcityCoeff?: number;
  }) => {
    const newTrust = changes.trustProjections !== undefined ? changes.trustProjections : trustProjections;
    const newUrgency = changes.draftUrgency !== undefined ? changes.draftUrgency : draftUrgency;
    const newBalance = changes.categoryBalance !== undefined ? changes.categoryBalance : categoryBalance;
    const newFit = changes.rosterFit !== undefined ? changes.rosterFit : rosterFit;
    const newScarcity = changes.positionScarcity !== undefined ? changes.positionScarcity : positionScarcityWeight;
    const newRisk = changes.riskStyle !== undefined ? changes.riskStyle : riskStyle;
    const newReach = changes.reachTolerance !== undefined ? changes.reachTolerance : reachTolerance;
    const newSaves = changes.savesStrategy !== undefined ? changes.savesStrategy : savesStrategy;
    const newRankScarcity = changes.rankScarcityCoeff !== undefined ? changes.rankScarcityCoeff : rankScarcityCoeff;

    if (changes.trustProjections !== undefined) setTrustProjections(changes.trustProjections);
    if (changes.draftUrgency !== undefined) setDraftUrgency(changes.draftUrgency);
    if (changes.categoryBalance !== undefined) setCategoryBalance(changes.categoryBalance);
    if (changes.rosterFit !== undefined) setRosterFit(changes.rosterFit);
    if (changes.positionScarcity !== undefined) setPositionScarcityWeight(changes.positionScarcity);
    if (changes.riskStyle !== undefined) setRiskStyle(changes.riskStyle);
    if (changes.reachTolerance !== undefined) setReachTolerance(changes.reachTolerance);
    if (changes.savesStrategy !== undefined) setSavesStrategy(changes.savesStrategy);
    if (changes.rankScarcityCoeff !== undefined) setRankScarcityCoeff(changes.rankScarcityCoeff);

    checkAndSetActivePreset(newTrust, newUrgency, newBalance, newFit, newScarcity, newRisk, newReach, newSaves, newRankScarcity);
  }, [trustProjections, draftUrgency, categoryBalance, rosterFit, positionScarcityWeight, riskStyle, reachTolerance, savesStrategy, rankScarcityCoeff]);

  const handlePresetSelect = useCallback((presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setTrustProjections(preset.trustProjections);
      setDraftUrgency(preset.draftUrgency);
      setCategoryBalance(preset.categoryBalance);
      setRosterFit(preset.rosterFit);
      setPositionScarcityWeight(preset.positionScarcity);
      setRiskStyle(preset.riskStyle);
      setReachTolerance(preset.reachTolerance);
      setSavesStrategy(preset.savesStrategy);
      setRankScarcityCoeff(preset.rankScarcityCoeff);
      setActivePreset(presetName);
    }
  }, []);

  const handleReset = () => {
    initDraft(numTeams, numRounds, userPosition);
  };

  const sandboxValue = useMemo(() => ({
    trustProjections,
    draftUrgency,
    categoryBalance,
    rosterFit,
    positionScarcity: positionScarcityWeight,
    riskStyle,
    reachTolerance,
    savesStrategy,
    rankScarcityCoeff,
    activePreset,
    onPresetSelect: handlePresetSelect,
    onSandboxChange: handleSandboxChange,
  }), [
    trustProjections,
    draftUrgency,
    categoryBalance,
    rosterFit,
    positionScarcityWeight,
    riskStyle,
    reachTolerance,
    savesStrategy,
    rankScarcityCoeff,
    activePreset,
    handlePresetSelect,
    handleSandboxChange,
  ]);

  // ----------------------------------------------------
  // Persistence (localStorage) + data-load warning
  // ----------------------------------------------------
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [dataWarningDismissed, setDataWarningDismissed] = useState(false);

  const draftSnapshot = useMemo<DraftSnapshot>(() => ({
    version: SNAPSHOT_VERSION,
    picks,
    currentPickIndex,
    isDraftStarted,
    numTeams,
    userPosition,
    numRounds,
    draftMode,
    cpuProfileMode,
    projectionSystem,
    targets,
    sandbox: {
      trustProjections,
      draftUrgency,
      categoryBalance,
      rosterFit,
      positionScarcity: positionScarcityWeight,
      riskStyle,
      reachTolerance,
      savesStrategy,
      rankScarcityCoeff,
      activePreset,
    },
    cpuProfiles,
    cpuSavesStrategies,
    projectionOverrides,
  }), [
    picks,
    currentPickIndex,
    isDraftStarted,
    numTeams,
    userPosition,
    numRounds,
    draftMode,
    cpuProfileMode,
    projectionSystem,
    targets,
    trustProjections,
    draftUrgency,
    categoryBalance,
    rosterFit,
    positionScarcityWeight,
    riskStyle,
    reachTolerance,
    savesStrategy,
    rankScarcityCoeff,
    activePreset,
    cpuProfiles,
    cpuSavesStrategies,
    projectionOverrides,
  ]);

  // Only start writing once the draft is underway, so a fresh page load never
  // clobbers a saved draft before the user decides whether to resume it.
  const persistEnabled = isDraftStarted || currentPickIndex > 0;
  const { restorable: savedDraft, clearSaved } = usePersistedSnapshot<DraftSnapshot>(
    DRAFT_STORAGE_KEY,
    draftSnapshot,
    persistEnabled
  );

  // Offer resume only before the current session touches the draft; once the
  // user starts (persistEnabled) the saved snapshot is this session's own data.
  const canRestore =
    !!savedDraft &&
    !persistEnabled &&
    !restoreDismissed &&
    savedDraft.version === SNAPSHOT_VERSION &&
    (savedDraft.currentPickIndex > 0 || savedDraft.isDraftStarted);

  const handleRestoreDraft = useCallback(() => {
    if (!savedDraft) return;
    setNumTeams(savedDraft.numTeams);
    setUserPosition(savedDraft.userPosition);
    setRosterViewTeamIndex(savedDraft.userPosition - 1);
    setNumRounds(savedDraft.numRounds);
    setDraftMode(savedDraft.draftMode);
    setCpuProfileMode(savedDraft.cpuProfileMode);
    setProjectionSystem(savedDraft.projectionSystem);
    setTargets(savedDraft.targets);

    const s = savedDraft.sandbox;
    setTrustProjections(s.trustProjections);
    setDraftUrgency(s.draftUrgency);
    setCategoryBalance(s.categoryBalance);
    setRosterFit(s.rosterFit);
    setPositionScarcityWeight(s.positionScarcity);
    setRiskStyle(s.riskStyle);
    setReachTolerance(s.reachTolerance);
    setSavesStrategy(s.savesStrategy);
    setRankScarcityCoeff(s.rankScarcityCoeff);
    setActivePreset(s.activePreset);

    setCpuProfiles(savedDraft.cpuProfiles);
    setCpuSavesStrategies(savedDraft.cpuSavesStrategies);
    setProjectionOverrides(savedDraft.projectionOverrides);

    // Resume paused so a restored CPU turn doesn't immediately auto-draft.
    setSimSpeed("manual");
    loadDraft(savedDraft.picks, savedDraft.currentPickIndex, savedDraft.isDraftStarted);
    setRestoreDismissed(true);
  }, [savedDraft, loadDraft, setProjectionSystem]);

  const handleDiscardSavedDraft = useCallback(() => {
    clearSaved();
    setRestoreDismissed(true);
  }, [clearSaved]);

  const showDataWarning =
    !isLoadingProjections &&
    !dataWarningDismissed &&
    projectionSystem !== "mock" &&
    (!isUsingCsv || projectionLoadFailed);

  const savedDraftLabel = savedDraft
    ? `Round ${savedDraft.picks[savedDraft.currentPickIndex]?.round ?? savedDraft.numRounds}, pick ${
        savedDraft.currentPickIndex + 1
      } of ${savedDraft.picks.length}`
    : "";

  const projectionLabel = isUsingCsv
    ? `${projectionSystem === "thebat" ? "THE BAT" : projectionSystem.toUpperCase()} loaded`
    : "Mock data";

  const headerStatus = !isDraftStarted
    ? (isLiveDraftMode ? "Live setup" : "Draft setup")
    : isDraftComplete
      ? "Draft complete"
      : isUserTurn
        ? "Your turn"
        : currentPick
          ? teamNames[currentPick.teamIndex]
          : "In progress";

  const headerMeta = !isDraftStarted
    ? `${numTeams} teams - ${numRounds} rounds`
    : currentPick
      ? `R${currentPick.round}, Pick ${currentPick.pickInRound}`
      : "Ready";

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoMark} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18V9" />
              <path d="M9 18V5" />
              <path d="M14 18v-7" />
              <path d="M19 18V3" />
              <path d="M4 14l5-5 5 3 5-7" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.logoTitle}>DraftRadar</span>
            <span className={styles.logoSubtitle}>Baseball Draft Engine</span>
          </div>
          <span className={styles.datasetBadge}>{projectionLabel}</span>
        </div>

        <nav className={styles.topWorkspaceTabs} aria-label="Draft workspace views" role="tablist">
          {[
            { id: "draft" as const, label: "Draft Room" },
            { id: "plan" as const, label: "Targets" },
            { id: "standings" as const, label: "Standings" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={styles.topWorkspaceTab}
              data-active={activeCenterView === tab.id}
              role="tab"
              aria-selected={activeCenterView === tab.id}
              onClick={() => setActiveCenterView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <div className={styles.compactStatus}>
            <span className={styles.tickerLabel}>Status</span>
            <strong>{headerStatus}</strong>
            <span className={styles.tickerSub}>{headerMeta}</span>
            <span className={styles.statusDot} data-active={isDraftStarted && !isDraftComplete} />
          </div>
          <button type="button" className={styles.iconButton} aria-label="Settings" onClick={() => setActiveMobileSection("setup")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <nav className={styles.mobileSectionTabs} aria-label="Mobile dashboard sections" role="tablist">
        {[
          { id: "setup" as const, label: "Setup" },
          { id: "draft" as const, label: "Draft" },
          { id: "roster" as const, label: "Roster" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={styles.mobileSectionTab}
            data-active={activeMobileSection === tab.id}
            role="tab"
            aria-selected={activeMobileSection === tab.id}
            onClick={() => setActiveMobileSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {canRestore && (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <div className={styles.bannerText}>
            <strong>Resume your draft?</strong>
            <span>{savedDraftLabel}</span>
          </div>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.bannerButton} onClick={handleRestoreDraft}>
              Resume
            </button>
            <button type="button" className={styles.bannerDismiss} onClick={handleDiscardSavedDraft}>
              Start fresh
            </button>
          </div>
        </div>
      )}

      {showDataWarning && (
        <div className={`${styles.banner} ${styles.bannerWarning}`} role="alert">
          <div className={styles.bannerText}>
            <strong>Using sample data.</strong>
            <span>
              {projectionSystem === "thebat" ? "THE BAT" : projectionSystem.toUpperCase()} projections
              couldn&apos;t be loaded, so mock players are shown instead.
            </span>
          </div>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.bannerDismiss} onClick={() => setDataWarningDismissed(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <main className={styles.dashboardGrid}>
        {/* Left Column: Settings and Draft Queue */}
        <section className={styles.settingsSidebar} data-mobile-active={activeMobileSection === "setup"}>
          <SandboxSettingsProvider value={sandboxValue}>
            <SettingsPanel
              numTeams={numTeams}
              userPosition={userPosition}
              numRounds={numRounds}
              draftMode={draftMode}
              simSpeed={simSpeed}
              cpuProfileMode={cpuProfileMode}
              isDraftStarted={isDraftStarted}
              onConfigChange={handleConfigChange}
              onReset={handleReset}
              onAutoPick={executeCpuPick}
              onStartDraft={() => setIsDraftStarted(true)}
              targets={targets}
              onTargetsChange={setTargets}
              projectionSystem={projectionSystem}
              onProjectionSystemChange={handleProjectionSystemChange}
            />
          </SandboxSettingsProvider>
          <DraftBoard
            picks={picks}
            currentPickIndex={currentPickIndex}
            teamNames={teamNames}
            userTeamIndex={userPosition - 1}
            players={players}
            cpuSavesStrategies={cpuSavesStrategies}
            cpuProfiles={cpuProfiles}
            onUndoLastPick={undoLastPick}
            onEditPick={setPickPlayer}
            isLiveDraftMode={isLiveDraftMode}
          />
        </section>

        {/* Center Column: Recommendations and Main Player Pool */}
        <section className={styles.mainSection} data-mobile-active={activeMobileSection === "draft"}>
          {activeCenterView === "draft" && (
            <>
              <DashboardSummary
                displayMode="draft"
                recommendations={recommendations}
                scarcityMap={positionScarcity}
                onDraftPlayer={recordDraftPlayer}
                isOnClock={isLiveDraftMode ? canRecordPick : isDraftStarted && isUserTurn}
                draftActionLabel={playerActionLabel}
                roundTargets={roundTargets}
                onSetRoundPositionTarget={setRoundPositionTarget}
                onMoveTargetPlayer={moveTargetPlayer}
                onToggleTargetPlayer={toggleTargetPlayer}
                onAddTargetPlayerToRound={addTargetPlayerToRound}
                userPicks={userPicks}
                draftedPlayerIds={draftedPlayerIds}
                currentPickIndex={currentPickIndex}
                allPlayers={players}
                categoryNeeds={userCategoryNeeds}
                userRosterSize={userDraftedPlayers.length}
              />
              <PlayerList
                availablePlayers={availablePlayers}
                draftedPlayers={draftedPlayersDetails}
                recommendations={recommendations}
                onDraftPlayer={recordDraftPlayer}
                isOnClock={isLiveDraftMode ? canRecordPick : isDraftStarted && isUserTurn}
                draftActionLabel={playerActionLabel}
                currentTeamName={isDraftComplete || !isDraftStarted || !currentPick ? "" : teamNames[currentPick.teamIndex]}
                currentPickIndex={currentPickIndex}
                currentTeamIndex={isDraftComplete || !isDraftStarted || !currentPick ? undefined : currentPick.teamIndex}
                numRounds={numRounds}
                isDraftStarted={isDraftStarted}
                isDraftComplete={isDraftComplete}
                roundTargets={roundTargets}
                onToggleTargetPlayer={toggleTargetPlayer}
                picks={picks}
                userTeamIndex={userPosition - 1}
                scarcityMap={positionScarcity}
                cpuSavesStrategies={cpuSavesStrategies}
                cpuProfiles={cpuProfiles}
              />
            </>
          )}

          {activeCenterView === "plan" && (
            <DashboardSummary
              displayMode="plan"
              recommendations={recommendations}
              scarcityMap={positionScarcity}
              onDraftPlayer={recordDraftPlayer}
              isOnClock={isLiveDraftMode ? canRecordPick : isDraftStarted && isUserTurn}
              draftActionLabel={playerActionLabel}
              roundTargets={roundTargets}
              onSetRoundPositionTarget={setRoundPositionTarget}
              onMoveTargetPlayer={moveTargetPlayer}
              onToggleTargetPlayer={toggleTargetPlayer}
              onAddTargetPlayerToRound={addTargetPlayerToRound}
              userPicks={userPicks}
              draftedPlayerIds={draftedPlayerIds}
              currentPickIndex={currentPickIndex}
              allPlayers={players}
              categoryNeeds={userCategoryNeeds}
              userRosterSize={userDraftedPlayers.length}
            />
          )}

          {activeCenterView === "standings" && (
            <StandingsView
              teamNames={teamNames}
              userTeamIndex={userPosition - 1}
              draftedPlayers={draftedPlayersDetails}
              numRounds={numRounds}
              projectionOverrides={projectionOverrides}
            />
          )}
        </section>

        {/* Right Column: Roster Tracker */}
        <section className={styles.rosterSidebar} data-mobile-active={activeMobileSection === "roster"}>
          <RosterTracker
            teamIndex={rosterViewTeamIndex}
            teamNames={teamNames}
            userTeamIndex={userPosition - 1}
            draftedPlayers={draftedPlayersDetails}
            onSelectTeam={setRosterViewTeamIndex}
            numRounds={numRounds}
            targets={targets}
            projectionOverrides={projectionOverrides}
            onUpdateProjectionOverride={updateProjectionOverride}
            onResetProjectionOverride={resetProjectionOverride}
          />
        </section>
      </main>
    </div>
  );
}
