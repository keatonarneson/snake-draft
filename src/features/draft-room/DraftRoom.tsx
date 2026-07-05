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
  getCpuCloserPlan,
  isDraftableCloser,
  isPremiumCloser,
} from "../../engine";
import SettingsPanel from "../../components/SettingsPanel";
import DraftBoard from "../../components/DraftBoard";
import PlayerList from "../../components/PlayerList";
import RosterTracker from "../../components/RosterTracker";
import DashboardSummary from "../../components/DashboardSummary";
import StandingsView from "../../components/StandingsView";
import { useDraftState } from "../../hooks/useDraftState";
import { useDraftTargets } from "../../hooks/useDraftTargets";
import { useProjectionLoader } from "../../hooks/useProjectionLoader";

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
  const [targets, setTargets] = useState({
    R: 1125,
    HR: 315,
    RBI: 1103,
    SB: 190,
    AVG: 0.263,
    W: 93,
    SV: 88,
    SO: 1275,
    ERA: 3.65,
    WHIP: 1.20,
  });
  
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
    const cpuArchetype = cpuProfile.archetype;
    const strategy = cpuProfile.savesStrategy || cpuSavesStrategies[cpuTeamIndex] || "balanced";

    // 1. Check constraints on CPU roster (ensure valid distribution of hitters/pitchers)
    const cpuRoster = draftedPlayersDetails.filter((d) => d.teamIndex === cpuTeamIndex);
    const numBatters = cpuRoster.filter((d) => !d.player.isPitcher).length;
    const numPitchers = cpuRoster.filter((d) => d.player.isPitcher).length;

    const activeBattersLimit = 14;
    const activePitchersLimit = 9;
    const benchLimit = numRounds - (activeBattersLimit + activePitchersLimit);

    let allowedType: "all" | "batter" | "pitcher" = "all";
    if (numBatters >= activeBattersLimit + benchLimit) {
      allowedType = "pitcher";
    } else if (numPitchers >= activePitchersLimit + benchLimit) {
      allowedType = "batter";
    }

    // 2. Filter available players
    let candidates = availablePlayers;
    if (allowedType === "batter") {
      candidates = candidates.filter((p) => !p.isPitcher);
    } else if (allowedType === "pitcher") {
      candidates = candidates.filter((p) => p.isPitcher);
    }

    const closerPlan = getCpuCloserPlan(cpuProfile, strategy);
    const rosterPlayers = cpuRoster.map((rosterSpot) => rosterSpot.player);
    const draftedClosers = rosterPlayers.filter(isDraftableCloser);
    const draftedPremiumClosers = rosterPlayers.filter(isPremiumCloser);
    const hasSolvedSavesEarly = draftedPremiumClosers.length >= 2;
    const shouldBlockClosers = draftedClosers.length >= closerPlan.max || hasSolvedSavesEarly;

    if (shouldBlockClosers) {
      candidates = candidates.filter((p) => !isDraftableCloser(p));
    }

    if (candidates.length === 0) {
      candidates = availablePlayers; // fallback
    }

    // 3. Score a realistic market shortlist by CPU score.
    // Full-pool scoring is too expensive with large CSV projection sets, especially in paced mocks.
    const pCurr = currentPick.overallPick;
    const currentRound = currentPick.round;
    const cpuRosterPlayers = rosterPlayers;
    const maxMarketAhead = currentRound <= 5 ? 36 : currentRound <= 15 ? 90 : 180;
    const shortlistSize = currentRound <= 5 ? 60 : currentRound <= 15 ? 120 : 220;
    const marketCandidates = candidates
      .filter((player) => (
        player.adp <= pCurr + maxMarketAhead ||
        player.maxPick <= pCurr + Math.floor(maxMarketAhead * 0.65) ||
        player.value >= 3
      ))
      .sort((a, b) => {
        const aUrgency = pCurr >= a.maxPick ? -120 : 0;
        const bUrgency = pCurr >= b.maxPick ? -120 : 0;
        const aDistance = Math.abs(a.adp - pCurr);
        const bDistance = Math.abs(b.adp - pCurr);
        const aScore = aUrgency + aDistance - a.value * 1.6;
        const bScore = bUrgency + bDistance - b.value * 1.6;
        return aScore - bScore;
      })
      .slice(0, shortlistSize);

    const scoredCandidates = marketCandidates.length > 0 ? marketCandidates : candidates.slice(0, shortlistSize);

    const candidateScores = scoredCandidates.map((player) => {
      const randSeed = Math.random();
      const details = calculateCpuScore(
        player,
        pCurr,
        cpuRosterPlayers,
        numRounds,
        cpuArchetype,
        positionScarcity,
        currentPickIndex,
        picks,
        players,
        strategy,
        randSeed,
        cpuProfile
      );
      return { player, score: details.score, details };
    });

    candidateScores.sort((a, b) => b.score - a.score);

    // Dynamic pool size based on the current draft round
    let poolSize = 15;
    if (currentRound <= 5) {
      poolSize = 3;
    } else if (currentRound <= 15) {
      poolSize = 8;
    }

    // Keep top candidates for weighted selection pool
    const pool = candidateScores.slice(0, Math.min(poolSize, candidateScores.length));
    
    if (pool.length === 0) return;

    // Convert scores to positive weights (shift relative to min score in the pool) and apply cubic exponential scaling
    const minScore = pool[pool.length - 1].score;
    const poolWithWeights = pool.map(c => ({
      ...c,
      weight: Math.pow(Math.max(0.1, c.score - minScore + 1.0), 3.0)
    }));

    const totalWeight = poolWithWeights.reduce((sum, c) => sum + c.weight, 0);

    let randVal = Math.random() * totalWeight;
    let chosenCandidate = pool[0];
    for (const candidate of poolWithWeights) {
      randVal -= candidate.weight;
      if (randVal <= 0) {
        chosenCandidate = candidate;
        break;
      }
    }

    const chosenPlayer = chosenCandidate.player;

    if (chosenPlayer) {
      draftPlayer(chosenPlayer.id, chosenCandidate.score, chosenCandidate.details);
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

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1 className={styles.logoTitle}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#neon-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(99, 102, 241, 0.4))" }}
            >
              <defs>
                <linearGradient id="neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" />
              <path d="M16.2 7.8A4.5 4.5 0 0 0 12 6.5a4.5 4.5 0 0 0-4.2 1.3" />
              <path d="M7.8 16.2A4.5 4.5 0 0 0 12 17.5a4.5 4.5 0 0 0 4.2-1.3" />
              <line x1="12" y1="6.5" x2="12" y2="17.5" />
            </svg>
            DraftRadar
          </h1>
          <span className={styles.logoSubtitle}>Baseball Draft Engine</span>
          <span 
            className={styles.datasetBadge}
            style={{
              display: "inline-block",
              marginLeft: "12px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: isUsingCsv ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
              color: isUsingCsv ? "var(--success)" : "var(--primary)",
              border: `1px solid ${isUsingCsv ? "rgba(16, 185, 129, 0.3)" : "rgba(99, 102, 241, 0.3)"}`,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              verticalAlign: "middle",
              marginTop: "-2px"
            }}
          >
            {isUsingCsv 
              ? `${projectionSystem === "thebat" ? "THE BAT" : projectionSystem.toUpperCase()} LOADED` 
              : "MOCK DATA"}
          </span>
        </div>

        {/* Current status ticker */}
        <div className={styles.statusTicker} data-mode={draftMode}>
          {!isDraftStarted ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className={styles.tickerLabel}>Status</span>
              <span className={styles.tickerVal} style={{ color: "var(--secondary)" }}>
                {isLiveDraftMode ? "Live Setup" : "Draft Setup"}
              </span>
            </div>
          ) : isDraftComplete ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className={styles.tickerLabel}>Status</span>
              <span className={styles.tickerVal} style={{ color: "var(--success)" }}>Draft Complete!</span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className={styles.tickerLabel}>Current Pick</span>
                <span className={styles.tickerVal}>
                  {currentPick ? `R${currentPick.round} - P${currentPick.pickInRound}` : "Not Started"}
                </span>
              </div>
              <div style={{ width: "1px", height: "30px", background: "var(--glass-border)" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className={styles.tickerLabel}>{isLiveDraftMode ? "Record Pick For" : "On The Clock"}</span>
                <span className={styles.tickerSub} style={{ color: isUserTurn ? "var(--primary)" : "var(--secondary)" }}>
                  {isUserTurn ? "YOUR TURN!" : currentPick ? teamNames[currentPick.teamIndex] : ""}
                </span>
              </div>
            </>
          )}
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

      {/* Grid Layout */}
      <main className={styles.dashboardGrid}>
        {/* Left Column: Settings and Draft Queue */}
        <section className={styles.settingsSidebar} data-mobile-active={activeMobileSection === "setup"}>
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
            trustProjections={trustProjections}
            draftUrgency={draftUrgency}
            categoryBalance={categoryBalance}
            rosterFit={rosterFit}
            positionScarcity={positionScarcityWeight}
            riskStyle={riskStyle}
            reachTolerance={reachTolerance}
            savesStrategy={savesStrategy}
            rankScarcityCoeff={rankScarcityCoeff}
            activePreset={activePreset}
            onPresetSelect={handlePresetSelect}
            onSandboxChange={handleSandboxChange}
            targets={targets}
            onTargetsChange={setTargets}
            projectionSystem={projectionSystem}
            onProjectionSystemChange={handleProjectionSystemChange}
          />
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
          <nav className={styles.centerViewTabs} aria-label="Draft workspace views" role="tablist">
            {[
              { id: "draft" as const, label: "Draft" },
              { id: "plan" as const, label: "Plan" },
              { id: "standings" as const, label: "Standings" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={styles.centerViewTab}
                data-active={activeCenterView === tab.id}
                role="tab"
                aria-selected={activeCenterView === tab.id}
                onClick={() => setActiveCenterView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

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
