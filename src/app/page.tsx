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
  const [numRounds, setNumRounds] = useState(23);
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
  const [isUsingCsv, setIsUsingCsv] = useState(false);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [isDraftStarted, setIsDraftStarted] = useState(false);
  
  // Track which team's roster is currently selected in the sidebar
  const [rosterViewTeamIndex, setRosterViewTeamIndex] = useState(4); // default to user index (userPosition - 1)

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
  }, [loadedPlayers]);

  // Run on mount to fetch local CSV files if they exist
  useEffect(() => {
    async function loadData() {
      try {
        const resHitters = await fetch("/oopsy_hitters.csv");
        const resPitchers = await fetch("/oopsy_pitchers.csv");
        
        if (resHitters.ok && resPitchers.ok) {
          const hittersText = await resHitters.text();
          const pitchersText = await resPitchers.text();
          
          const { parsePlayersFromCSVs } = await import("../utils/csvParser");
          const parsed = parsePlayersFromCSVs(hittersText, pitchersText);
          
          setLoadedPlayers(parsed);
          setIsUsingCsv(true);
          setPlayers(parsed);
          setPicks(generateDraftSequence(numTeams, numRounds));
          setCurrentPickIndex(0);
          setIsDraftStarted(false);
          setRosterViewTeamIndex(userPosition - 1);
          console.log(`Loaded custom dataset from CSV: ${parsed.length} players`);
          return;
        }
      } catch (err) {
        console.error("Failed to load local CSVs, falling back to mock database:", err);
      }
      
      // Fallback to mock data
      const mock = getMockPlayers();
      setLoadedPlayers(mock);
      setIsUsingCsv(false);
      setPlayers(mock);
      setPicks(generateDraftSequence(numTeams, numRounds));
      setCurrentPickIndex(0);
      setIsDraftStarted(false);
      setRosterViewTeamIndex(userPosition - 1);
    }
    
    loadData();
  }, []); // Run once on mount

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

  // Set of drafted player IDs for quick lookup
  const draftedPlayerIds = useMemo(() => {
    return new Set(picks.slice(0, currentPickIndex).map((p) => p.playerDraftedId).filter(Boolean) as string[]);
  }, [picks, currentPickIndex]);

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

  // Calculate real-time position scarcity
  const positionScarcity = useMemo(() => {
    const positions = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];
    const pCurr = isDraftComplete ? picks.length : currentPick.overallPick;
    const pNext = userNextPickOverall;

    return calculatePositionScarcity(availablePlayers, pCurr, pNext, positions, rankScarcityCoeff);
  }, [availablePlayers, currentPickIndex, userNextPickOverall, isDraftComplete, picks.length, currentPick, rankScarcityCoeff]);

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
  const draftPlayer = useCallback((playerId: string) => {
    if (currentPickIndex >= picks.length) return;

    setPicks((prevPicks) => {
      const copy = [...prevPicks];
      copy[currentPickIndex] = {
        ...copy[currentPickIndex],
        playerDraftedId: playerId,
      };
      return copy;
    });

    setCurrentPickIndex((prev) => prev + 1);
  }, [currentPickIndex, picks.length]);

  // ----------------------------------------------------
  // CPU Drafting Logic
  // ----------------------------------------------------
  const executeCpuPick = useCallback(() => {
    if (currentPickIndex >= picks.length) return;
    
    const cpuTeamIndex = currentPick.teamIndex;
    if (cpuTeamIndex === userPosition - 1) return; // Wait for user

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

    // 3. Sort candidates by CPU score using the new weighted decision model
    const pCurr = currentPick.overallPick;
    const cpuRosterPlayers = cpuRoster.map(r => r.player);

    const candidateScores = candidates.map((player) => {
      // Generate a stable random seed for this candidate
      const randSeed = Math.random();
      const details = calculateCpuScore(player, pCurr, cpuRosterPlayers, numRounds, randSeed);
      return { player, score: details.score };
    });

    candidateScores.sort((a, b) => b.score - a.score);
    const chosenPlayer = candidateScores[0]?.player;

    if (chosenPlayer) {
      draftPlayer(chosenPlayer.id);
    }
  }, [currentPickIndex, picks.length, currentPick, userPosition, draftedPlayersDetails, numRounds, availablePlayers, draftPlayer]);

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
            {isUsingCsv ? "CSV Loaded" : "Mock Data"}
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
          />
          <DraftBoard
            picks={picks}
            currentPickIndex={currentPickIndex}
            teamNames={teamNames}
            userTeamIndex={userPosition - 1}
            players={players}
          />
        </section>

        {/* Center Column: Recommendations and Main Player Pool */}
        <section className={styles.mainSection}>
          <DashboardSummary
            recommendations={recommendations}
            scarcityMap={positionScarcity}
            onDraftPlayer={draftPlayer}
            isOnClock={isDraftStarted && isUserTurn}
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
