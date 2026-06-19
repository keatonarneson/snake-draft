"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./page.module.css";
import { getMockPlayers, Player } from "../utils/sampleData";
import {
  generateDraftSequence,
  calculatePositionScarcity,
  getRecommendations,
  DraftPick,
  calculateCpuScore,
  calculateAdpValue,
  calculateTargetMetrics,
  getCpuArchetype,
} from "../utils/draftEngine";
import SettingsPanel from "../components/SettingsPanel";
import DraftBoard from "../components/DraftBoard";
import PlayerList from "../components/PlayerList";
import RosterTracker from "../components/RosterTracker";
import DashboardSummary from "../components/DashboardSummary";

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

export default function Home() {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const [numTeams, setNumTeams] = useState(12);
  const [userPosition, setUserPosition] = useState(5); // 1-indexed draft slot
  const [numRounds, setNumRounds] = useState(30);
  const [simSpeed, setSimSpeed] = useState<"manual" | "paced" | "instant">("paced");
  
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
    R: 1166,
    HR: 326,
    RBI: 1120,
    SB: 171,
    AVG: 0.262,
    W: 112,
    SV: 90,
    SO: 1725,
    ERA: 3.75,
    WHIP: 1.18,
  });
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadedPlayers, setLoadedPlayers] = useState<Player[]>([]);
  const [projectionSystem, setProjectionSystem] = useState<"oopsy" | "thebat" | "steamer" | "mock">("oopsy");
  const [allCsvDatasets, setAllCsvDatasets] = useState<{
    oopsy: Player[];
    thebat: Player[];
    steamer: Player[];
  } | null>(null);
  const [isUsingCsv, setIsUsingCsv] = useState(false);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [isDraftStarted, setIsDraftStarted] = useState(false);
  const [cpuSavesStrategies, setCpuSavesStrategies] = useState<string[]>([]);
  const [roundTargets, setRoundTargets] = useState<Record<number, { position: string | null; playerIds: string[] }>>({});
  
  // Track which team's roster is currently selected in the sidebar
  const [rosterViewTeamIndex, setRosterViewTeamIndex] = useState(4); // default to user index (userPosition - 1)

  // Set of drafted player IDs for quick lookup
  const draftedPlayerIds = useMemo(() => {
    return new Set(picks.slice(0, currentPickIndex).map((p) => p.playerDraftedId).filter(Boolean) as string[]);
  }, [picks, currentPickIndex]);

  const toggleTargetPlayer = useCallback((playerId: string) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };
      
      // 1. Check if the player is already targeted in any round. If so, remove them.
      let found = false;
      Object.keys(copy).forEach((roundStr) => {
        const round = parseInt(roundStr);
        if (copy[round]?.playerIds.includes(playerId)) {
          copy[round] = {
            ...copy[round],
            playerIds: copy[round].playerIds.filter((id) => id !== playerId)
          };
          found = true;
        }
      });
      
      if (found) {
        return copy;
      }
      
      // 2. If not found, compute their optimal round and add them
      const player = players.find((p) => p.id === playerId);
      if (!player) return prev;
      
      const pCurr = currentPickIndex + 1;
      const userPicks = picks.filter((p) => p.teamIndex === userPosition - 1);
      const metrics = calculateTargetMetrics(player, pCurr, userPicks, draftedPlayerIds);
      const optRound = metrics.optimalRound;
      
      if (optRound !== -1) {
        copy[optRound] = {
          position: copy[optRound]?.position ?? null,
          playerIds: [...(copy[optRound]?.playerIds ?? []), playerId]
        };
      }
      
      return copy;
    });
  }, [players, currentPickIndex, picks, userPosition, draftedPlayerIds]);

  const setRoundPositionTarget = useCallback((round: number, position: string | null) => {
    setRoundTargets((prev) => ({
      ...prev,
      [round]: {
        position,
        playerIds: prev[round]?.playerIds ?? []
      }
    }));
  }, []);

  const moveTargetPlayer = useCallback((playerId: string, fromRound: number, toRound: number) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };
      
      // Remove from fromRound
      if (copy[fromRound]) {
        copy[fromRound] = {
          ...copy[fromRound],
          playerIds: copy[fromRound].playerIds.filter((id) => id !== playerId)
        };
      }
      
      // Add to toRound
      copy[toRound] = {
        position: copy[toRound]?.position ?? null,
        playerIds: [...(copy[toRound]?.playerIds ?? []), playerId]
      };
      
      return copy;
    });
  }, []);

  const addTargetPlayerToRound = useCallback((playerId: string, round: number) => {
    setRoundTargets((prev) => {
      const copy = { ...prev };
      
      // Remove player from any other round if they exist there
      Object.keys(copy).forEach((roundStr) => {
        const r = parseInt(roundStr);
        if (copy[r]?.playerIds.includes(playerId)) {
          copy[r] = {
            ...copy[r],
            playerIds: copy[r].playerIds.filter((id) => id !== playerId)
          };
        }
      });
      
      // Add to this specific round
      copy[round] = {
        position: copy[round]?.position ?? null,
        playerIds: [...(copy[round]?.playerIds ?? []).filter(id => id !== playerId), playerId]
      };
      
      return copy;
    });
  }, []);

  // ----------------------------------------------------
  // Initialize or Reset Draft
  // ----------------------------------------------------
  const initDraft = useCallback((teamsCount: number, roundsCount: number, userPos: number) => {
    const pool = loadedPlayers.length > 0 ? loadedPlayers : getMockPlayers();
    setPlayers(pool);
    setPicks(generateDraftSequence(teamsCount, roundsCount));
    setCurrentPickIndex(0);
    setIsDraftStarted(false);
    setRosterViewTeamIndex(userPos - 1);
    setRoundTargets({});

    // Randomly assign CPU saves strategies (aggressive, balanced, wait)
    const strategies = Array.from({ length: teamsCount }, (_, i) => {
      if (i === userPos - 1) return "balanced"; // user strategy
      const rand = Math.random();
      return rand < 0.25 ? "aggressive" : rand < 0.55 ? "wait" : "balanced";
    });
    setCpuSavesStrategies(strategies);
  }, [loadedPlayers]);

  // Load all CSV datasets once on mount to enable consensus calculations and fast switching
  useEffect(() => {
    async function loadAllData() {
      try {
        const fetchAndParse = async (hittersUrl: string, pitchersUrl: string) => {
          const resHitters = await fetch(hittersUrl);
          const resPitchers = await fetch(pitchersUrl);
          if (!resHitters.ok || !resPitchers.ok) throw new Error("File not found");
          const hittersText = await resHitters.text();
          const pitchersText = await resPitchers.text();
          const { parsePlayersFromCSVs } = await import("../utils/csvParser");
          return parsePlayersFromCSVs(hittersText, pitchersText);
        };

        const [oopsy, steamer, thebat] = await Promise.all([
          fetchAndParse("/oopsy_hitters.csv", "/oopsy_pitchers.csv").catch(() => []),
          fetchAndParse("/steamer_hitters.csv", "/steamer_pitchers.csv").catch(() => []),
          fetchAndParse("/thebat_pitchers.csv", "/thebat_hitters.csv").catch(() => []), // swapped!
        ]);

        if (oopsy.length > 0 || steamer.length > 0 || thebat.length > 0) {
          const cache = { oopsy, steamer, thebat };
          setAllCsvDatasets(cache);
          setIsUsingCsv(true);
          console.log(`Loaded custom projection databases: Oopsy (${oopsy.length}), Steamer (${steamer.length}), THE BAT (${thebat.length})`);
        } else {
          setIsUsingCsv(false);
        }
      } catch (err) {
        console.error("Failed to load custom projection datasets, using mock data:", err);
        setIsUsingCsv(false);
      }
    }
    loadAllData();
  }, []);

  // Synchronize player pool with selected projection system and compute consensus values
  useEffect(() => {
    if (projectionSystem === "mock" || !allCsvDatasets) {
      const mock = getMockPlayers();
      setLoadedPlayers(mock);
      setIsUsingCsv(false);
      setPlayers(mock);
      setPicks(generateDraftSequence(numTeams, numRounds));
      setCurrentPickIndex(0);
      setIsDraftStarted(false);
      setRosterViewTeamIndex(userPosition - 1);
      setRoundTargets({});
      return;
    }

    let primary: Player[] = [];
    if (projectionSystem === "oopsy") {
      primary = allCsvDatasets.oopsy;
    } else if (projectionSystem === "thebat") {
      primary = allCsvDatasets.thebat;
    } else if (projectionSystem === "steamer") {
      primary = allCsvDatasets.steamer;
    }

    if (primary.length === 0) {
      const mock = getMockPlayers();
      setLoadedPlayers(mock);
      setIsUsingCsv(false);
      setPlayers(mock);
      setPicks(generateDraftSequence(numTeams, numRounds));
      setCurrentPickIndex(0);
      setIsDraftStarted(false);
      setRosterViewTeamIndex(userPosition - 1);
      setRoundTargets({});
      return;
    }

    // Compute consensus values across all loaded CSV systems
    const computeConsensus = async () => {
      const { computeConsensusValues } = await import("../utils/csvParser");
      const parsedWithConsensus = computeConsensusValues(
        primary,
        allCsvDatasets.oopsy.length > 0 ? allCsvDatasets.oopsy : primary,
        allCsvDatasets.thebat.length > 0 ? allCsvDatasets.thebat : primary,
        allCsvDatasets.steamer.length > 0 ? allCsvDatasets.steamer : primary
      );

      setLoadedPlayers(parsedWithConsensus);
      setIsUsingCsv(true);
      setPlayers(parsedWithConsensus);
      setPicks(generateDraftSequence(numTeams, numRounds));
      setCurrentPickIndex(0);
      setIsDraftStarted(false);
      setRosterViewTeamIndex(userPosition - 1);
      setRoundTargets({});
    };

    computeConsensus();
  }, [projectionSystem, allCsvDatasets, numTeams, numRounds, userPosition]);

  // Run when league dimensions reset (we rely on loadedPlayers state being ready)
  useEffect(() => {
    if (loadedPlayers.length > 0) {
      initDraft(numTeams, numRounds, userPosition);
    }
  }, [numTeams, numRounds, userPosition, initDraft, loadedPlayers]);

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
  const currentPick = picks[currentPickIndex];
  const isDraftComplete = currentPickIndex >= picks.length;
  const isUserTurn = !isDraftComplete && currentPick.teamIndex === userPosition - 1;

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
    const pCurr = isDraftComplete ? picks.length : currentPick.overallPick;
    const pNext = userNextPickOverall;

    return calculatePositionScarcity(players, availablePlayers, pCurr, pNext, positions, rankScarcityCoeff, numTeams);
  }, [players, availablePlayers, currentPickIndex, userNextPickOverall, isDraftComplete, picks.length, currentPick, rankScarcityCoeff, numTeams]);

  // Get user's drafted players
  const userDraftedPlayers = useMemo(() => {
    return draftedPlayersDetails
      .filter((d) => d.teamIndex === userPosition - 1)
      .map((d) => d.player);
  }, [draftedPlayersDetails, userPosition]);

  // Calculate smart pick recommendations for the user
  const recommendations = useMemo(() => {
    const pCurr = isDraftComplete ? picks.length : currentPick.overallPick;
    const pNext = userNextPickOverall;
    const round = isDraftComplete ? numRounds : currentPick.round;

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
    currentPickIndex,
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
  const draftPlayer = useCallback((playerId: string, cpuScore?: number, cpuScoreDetails?: any) => {
    if (currentPickIndex >= picks.length) return;

    let finalCpuScore = cpuScore;
    let finalCpuScoreDetails = cpuScoreDetails;

    if (finalCpuScore === undefined) {
      // Calculate score for the user pick (or if not provided)
      const playerObj = players.find(p => p.id === playerId);
      if (playerObj) {
        const teamIndex = currentPick.teamIndex;
        const cpuRoster = draftedPlayersDetails
          .filter((d) => d.teamIndex === teamIndex)
          .map((r) => r.player);
        const cpuArchetype = getCpuArchetype(teamIndex, userPosition - 1);
        const strategy = cpuSavesStrategies[teamIndex] || "balanced";
        const details = calculateCpuScore(
          playerObj,
          currentPick.overallPick,
          cpuRoster,
          numRounds,
          cpuArchetype,
          positionScarcity,
          currentPickIndex,
          picks,
          players,
          strategy,
          0.0 // no random noise for static user pick logs
        );
        finalCpuScore = details.score;
        finalCpuScoreDetails = details;
      }
    }

    setPicks((prevPicks) => {
      const copy = [...prevPicks];
      copy[currentPickIndex] = {
        ...copy[currentPickIndex],
        playerDraftedId: playerId,
        cpuScore: finalCpuScore,
        cpuScoreDetails: finalCpuScoreDetails,
      };
      return copy;
    });

    setCurrentPickIndex((prev) => prev + 1);
  }, [currentPickIndex, picks.length, players, currentPick, draftedPlayersDetails, userPosition, numRounds, positionScarcity, picks, cpuSavesStrategies]);

  // ----------------------------------------------------
  // CPU Drafting Logic
  // ----------------------------------------------------
  const executeCpuPick = useCallback(() => {
    if (currentPickIndex >= picks.length) return;
    
    const cpuTeamIndex = currentPick.teamIndex;
    if (cpuTeamIndex === userPosition - 1) return; // Wait for user

    const cpuArchetype = getCpuArchetype(cpuTeamIndex, userPosition - 1);
    const strategy = cpuSavesStrategies[cpuTeamIndex] || "balanced";

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

    if (candidates.length === 0) {
      candidates = availablePlayers; // fallback
    }

    // 3. Score candidates by CPU score using the new weighted decision model
    const pCurr = currentPick.overallPick;
    const cpuRosterPlayers = cpuRoster.map(r => r.player);

    const candidateScores = candidates.map((player) => {
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
        randSeed
      );
      return { player, score: details.score, details };
    });

    candidateScores.sort((a, b) => b.score - a.score);

    // Dynamic pool size based on the current draft round
    const currentRound = currentPick.round;
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
  }, [currentPickIndex, picks.length, currentPick, userPosition, draftedPlayersDetails, numRounds, availablePlayers, draftPlayer, positionScarcity, players, cpuSavesStrategies]);

  // Effect to drive CPU picks
  useEffect(() => {
    if (!isDraftStarted || isDraftComplete) return;

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
  }, [currentPickIndex, userPosition, simSpeed, isDraftComplete, currentPick, executeCpuPick, isDraftStarted]);

  // ----------------------------------------------------
  // Configuration Changes
  // ----------------------------------------------------
  const handleConfigChange = (newConfig: {
    numTeams?: number;
    userPosition?: number;
    numRounds?: number;
    simSpeed?: "manual" | "paced" | "instant";
  }) => {
    if (newConfig.numTeams !== undefined) setNumTeams(newConfig.numTeams);
    if (newConfig.userPosition !== undefined) {
      setUserPosition(newConfig.userPosition);
      setRosterViewTeamIndex(newConfig.userPosition - 1);
    }
    if (newConfig.numRounds !== undefined) setNumRounds(newConfig.numRounds);
    if (newConfig.simSpeed !== undefined) setSimSpeed(newConfig.simSpeed);
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
        <div className={styles.statusTicker}>
          {!isDraftStarted ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className={styles.tickerLabel}>Status</span>
              <span className={styles.tickerVal} style={{ color: "var(--secondary)" }}>Draft Setup</span>
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
                  R{currentPick.round} - P{currentPick.pickInRound}
                </span>
              </div>
              <div style={{ width: "1px", height: "30px", background: "var(--glass-border)" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className={styles.tickerLabel}>On The Clock</span>
                <span className={styles.tickerSub} style={{ color: isUserTurn ? "var(--primary)" : "var(--secondary)" }}>
                  {isUserTurn ? "YOUR TURN!" : teamNames[currentPick.teamIndex]}
                </span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Grid Layout */}
      <main className={styles.dashboardGrid}>
        {/* Left Column: Settings and Draft Queue */}
        <section className={styles.settingsSidebar}>
          <SettingsPanel
            numTeams={numTeams}
            userPosition={userPosition}
            numRounds={numRounds}
            simSpeed={simSpeed}
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
            onProjectionSystemChange={setProjectionSystem}
          />
          <DraftBoard
            picks={picks}
            currentPickIndex={currentPickIndex}
            teamNames={teamNames}
            userTeamIndex={userPosition - 1}
            players={players}
            cpuSavesStrategies={cpuSavesStrategies}
          />
        </section>

        {/* Center Column: Recommendations and Main Player Pool */}
        <section className={styles.mainSection}>
          <DashboardSummary
            recommendations={recommendations}
            scarcityMap={positionScarcity}
            onDraftPlayer={draftPlayer}
            isOnClock={isDraftStarted && isUserTurn}
            roundTargets={roundTargets}
            onSetRoundPositionTarget={setRoundPositionTarget}
            onMoveTargetPlayer={moveTargetPlayer}
            onToggleTargetPlayer={toggleTargetPlayer}
            onAddTargetPlayerToRound={addTargetPlayerToRound}
            userPicks={userPicks}
            draftedPlayerIds={draftedPlayerIds}
            currentPickIndex={currentPickIndex}
            allPlayers={players}
          />
          <PlayerList
            availablePlayers={availablePlayers}
            draftedPlayers={draftedPlayersDetails}
            recommendations={recommendations}
            onDraftPlayer={draftPlayer}
            isOnClock={isDraftStarted && isUserTurn}
            currentTeamName={isDraftComplete || !isDraftStarted ? "" : teamNames[currentPick.teamIndex]}
            currentPickIndex={currentPickIndex}
            currentTeamIndex={isDraftComplete || !isDraftStarted ? undefined : currentPick.teamIndex}
            numRounds={numRounds}
            isDraftStarted={isDraftStarted}
            isDraftComplete={isDraftComplete}
            roundTargets={roundTargets}
            onToggleTargetPlayer={toggleTargetPlayer}
            picks={picks}
            userTeamIndex={userPosition - 1}
            cpuSavesStrategies={cpuSavesStrategies}
          />
        </section>

        {/* Right Column: Roster Tracker */}
        <section className={styles.rosterSidebar}>
          <RosterTracker
            teamIndex={rosterViewTeamIndex}
            teamNames={teamNames}
            userTeamIndex={userPosition - 1}
            draftedPlayers={draftedPlayersDetails}
            onSelectTeam={setRosterViewTeamIndex}
            numRounds={numRounds}
            targets={targets}
          />
        </section>
      </main>
    </div>
  );
}
