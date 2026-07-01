

export type CpuArchetype = "balanced" | "market" | "projection" | "need" | "upside";

export interface CpuProfile {
  id: string;
  label: string;
  archetype: CpuArchetype;
  savesStrategy: "wait" | "balanced" | "aggressive";
  marketTrust: number;
  projectionTrust: number;
  rosterNeed: number;
  categoryNeed: number;
  scarcity: number;
  runReaction: number;
  upside: number;
  reachTolerance: number;
  pitcherPreference: number;
  hitterPreference: number;
  closerAggression: number;
  randomness: number;
}

export const CPU_PROFILE_TEMPLATES: CpuProfile[] = [
  {
    id: "balanced",
    label: "Balanced",
    archetype: "balanced",
    savesStrategy: "balanced",
    marketTrust: 1.0,
    projectionTrust: 1.0,
    rosterNeed: 1.0,
    categoryNeed: 1.0,
    scarcity: 1.0,
    runReaction: 1.0,
    upside: 1.0,
    reachTolerance: 1.0,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 1.0,
    randomness: 1.0,
  },
  {
    id: "market_anchor",
    label: "Market Anchor",
    archetype: "market",
    savesStrategy: "balanced",
    marketTrust: 1.35,
    projectionTrust: 0.65,
    rosterNeed: 0.85,
    categoryNeed: 0.8,
    scarcity: 0.95,
    runReaction: 0.75,
    upside: 0.65,
    reachTolerance: 0.65,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.95,
    randomness: 0.55,
  },
  {
    id: "projection_value",
    label: "Projection Value",
    archetype: "projection",
    savesStrategy: "wait",
    marketTrust: 0.75,
    projectionTrust: 1.35,
    rosterNeed: 0.9,
    categoryNeed: 0.95,
    scarcity: 0.8,
    runReaction: 0.65,
    upside: 0.9,
    reachTolerance: 1.15,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.55,
    randomness: 0.8,
  },
  {
    id: "roster_builder",
    label: "Roster Builder",
    archetype: "need",
    savesStrategy: "balanced",
    marketTrust: 0.95,
    projectionTrust: 0.95,
    rosterNeed: 1.35,
    categoryNeed: 1.3,
    scarcity: 1.1,
    runReaction: 1.0,
    upside: 0.75,
    reachTolerance: 0.95,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 1.0,
    randomness: 0.85,
  },
  {
    id: "upside_chaser",
    label: "Upside Chaser",
    archetype: "upside",
    savesStrategy: "wait",
    marketTrust: 0.85,
    projectionTrust: 0.95,
    rosterNeed: 0.75,
    categoryNeed: 0.8,
    scarcity: 0.9,
    runReaction: 0.9,
    upside: 1.65,
    reachTolerance: 1.45,
    pitcherPreference: 1.0,
    hitterPreference: 1.0,
    closerAggression: 0.65,
    randomness: 1.3,
  },
  {
    id: "pitching_foundation",
    label: "Pitching Foundation",
    archetype: "balanced",
    savesStrategy: "balanced",
    marketTrust: 1.0,
    projectionTrust: 1.05,
    rosterNeed: 1.0,
    categoryNeed: 1.1,
    scarcity: 1.05,
    runReaction: 1.1,
    upside: 0.9,
    reachTolerance: 0.95,
    pitcherPreference: 1.18,
    hitterPreference: 0.96,
    closerAggression: 1.05,
    randomness: 0.9,
  },
  {
    id: "bat_first",
    label: "Bat First",
    archetype: "balanced",
    savesStrategy: "wait",
    marketTrust: 0.95,
    projectionTrust: 1.05,
    rosterNeed: 1.0,
    categoryNeed: 1.05,
    scarcity: 0.95,
    runReaction: 0.85,
    upside: 1.0,
    reachTolerance: 1.05,
    pitcherPreference: 0.88,
    hitterPreference: 1.16,
    closerAggression: 0.55,
    randomness: 1.0,
  },
  {
    id: "closer_chaser",
    label: "Closer Chaser",
    archetype: "need",
    savesStrategy: "aggressive",
    marketTrust: 1.0,
    projectionTrust: 0.95,
    rosterNeed: 1.05,
    categoryNeed: 1.2,
    scarcity: 1.15,
    runReaction: 1.35,
    upside: 0.75,
    reachTolerance: 1.1,
    pitcherPreference: 1.04,
    hitterPreference: 0.98,
    closerAggression: 1.7,
    randomness: 0.9,
  },
];

export function getCpuArchetype(teamIndex: number, userTeamIndex: number): CpuArchetype {
  if (teamIndex === userTeamIndex) return "balanced";
  const relativeIndex = teamIndex > userTeamIndex ? teamIndex - 1 : teamIndex;
  const archetypes: CpuArchetype[] = [
    "balanced",
    "market",
    "projection",
    "need",
    "balanced",
    "market",
    "need",
    "upside",
    "balanced",
    "market",
    "projection",
    "balanced",
  ];
  return archetypes[relativeIndex % archetypes.length];
}

export function getCpuProfile(teamIndex: number, userTeamIndex: number): CpuProfile {
  if (teamIndex === userTeamIndex) {
    return CPU_PROFILE_TEMPLATES[0];
  }
  const relativeIndex = teamIndex > userTeamIndex ? teamIndex - 1 : teamIndex;
  return CPU_PROFILE_TEMPLATES[relativeIndex % CPU_PROFILE_TEMPLATES.length];
}

export function getCpuProfileTemplates(): CpuProfile[] {
  return CPU_PROFILE_TEMPLATES;
}

export function getCpuCloserPlan(profile?: CpuProfile, fallbackStrategy: string = "balanced") {
  const strategy = profile?.savesStrategy || fallbackStrategy;

  if (strategy === "aggressive") {
    return { target: 2, max: 3 };
  }

  if (strategy === "wait") {
    return { target: 1, max: 2 };
  }

  return { target: 2, max: 2 };
}

