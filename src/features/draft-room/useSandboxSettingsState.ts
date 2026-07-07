import { useCallback, useMemo, useState } from "react";
import type {
  RiskStyle,
  SandboxChanges,
  SandboxSettingsValue,
  SavesStrategy,
} from "../../components/settings-panel";

interface SandboxPreset {
  trustProjections: number;
  draftUrgency: number;
  categoryBalance: number;
  rosterFit: number;
  positionScarcity: number;
  riskStyle: RiskStyle;
  reachTolerance: number;
  savesStrategy: SavesStrategy;
  rankScarcityCoeff: number;
}

/** Persisted/serializable shape of the sandbox weights. */
export interface SandboxSnapshot extends SandboxPreset {
  activePreset: string;
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
    rankScarcityCoeff: 0.1,
  },
};

/**
 * Owns the algorithm-sandbox weights, the preset matcher, and the context value
 * consumed by the settings sliders. Extracted from DraftRoom to keep that
 * component focused on draft orchestration.
 */
export function useSandboxSettingsState() {
  const [trustProjections, setTrustProjections] = useState(1.0);
  const [draftUrgency, setDraftUrgency] = useState(1.0);
  const [categoryBalance, setCategoryBalance] = useState(1.0);
  const [rosterFit, setRosterFit] = useState(1.0);
  const [positionScarcityWeight, setPositionScarcityWeight] = useState(1.0);
  const [riskStyle, setRiskStyle] = useState<RiskStyle>("balanced");
  const [reachTolerance, setReachTolerance] = useState(1.0);
  const [savesStrategy, setSavesStrategy] = useState<SavesStrategy>("balanced");
  const [rankScarcityCoeff, setRankScarcityCoeff] = useState(0.15);
  const [activePreset, setActivePreset] = useState<string>("balanced");

  const checkAndSetActivePreset = useCallback((next: SandboxPreset) => {
    let matchedPreset = "custom";
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (
        preset.trustProjections === next.trustProjections &&
        preset.draftUrgency === next.draftUrgency &&
        preset.categoryBalance === next.categoryBalance &&
        preset.rosterFit === next.rosterFit &&
        preset.positionScarcity === next.positionScarcity &&
        preset.riskStyle === next.riskStyle &&
        preset.reachTolerance === next.reachTolerance &&
        preset.savesStrategy === next.savesStrategy &&
        preset.rankScarcityCoeff === next.rankScarcityCoeff
      ) {
        matchedPreset = key;
        break;
      }
    }
    setActivePreset(matchedPreset);
  }, []);

  const handleSandboxChange = useCallback(
    (changes: SandboxChanges) => {
      const next: SandboxPreset = {
        trustProjections: changes.trustProjections ?? trustProjections,
        draftUrgency: changes.draftUrgency ?? draftUrgency,
        categoryBalance: changes.categoryBalance ?? categoryBalance,
        rosterFit: changes.rosterFit ?? rosterFit,
        positionScarcity: changes.positionScarcity ?? positionScarcityWeight,
        riskStyle: changes.riskStyle ?? riskStyle,
        reachTolerance: changes.reachTolerance ?? reachTolerance,
        savesStrategy: changes.savesStrategy ?? savesStrategy,
        rankScarcityCoeff: changes.rankScarcityCoeff ?? rankScarcityCoeff,
      };

      if (changes.trustProjections !== undefined) setTrustProjections(changes.trustProjections);
      if (changes.draftUrgency !== undefined) setDraftUrgency(changes.draftUrgency);
      if (changes.categoryBalance !== undefined) setCategoryBalance(changes.categoryBalance);
      if (changes.rosterFit !== undefined) setRosterFit(changes.rosterFit);
      if (changes.positionScarcity !== undefined) setPositionScarcityWeight(changes.positionScarcity);
      if (changes.riskStyle !== undefined) setRiskStyle(changes.riskStyle);
      if (changes.reachTolerance !== undefined) setReachTolerance(changes.reachTolerance);
      if (changes.savesStrategy !== undefined) setSavesStrategy(changes.savesStrategy);
      if (changes.rankScarcityCoeff !== undefined) setRankScarcityCoeff(changes.rankScarcityCoeff);

      checkAndSetActivePreset(next);
    },
    [
      trustProjections,
      draftUrgency,
      categoryBalance,
      rosterFit,
      positionScarcityWeight,
      riskStyle,
      reachTolerance,
      savesStrategy,
      rankScarcityCoeff,
      checkAndSetActivePreset,
    ]
  );

  const applyPreset = useCallback((preset: SandboxPreset) => {
    setTrustProjections(preset.trustProjections);
    setDraftUrgency(preset.draftUrgency);
    setCategoryBalance(preset.categoryBalance);
    setRosterFit(preset.rosterFit);
    setPositionScarcityWeight(preset.positionScarcity);
    setRiskStyle(preset.riskStyle);
    setReachTolerance(preset.reachTolerance);
    setSavesStrategy(preset.savesStrategy);
    setRankScarcityCoeff(preset.rankScarcityCoeff);
  }, []);

  const handlePresetSelect = useCallback(
    (presetName: string) => {
      const preset = PRESETS[presetName];
      if (preset) {
        applyPreset(preset);
        setActivePreset(presetName);
      }
    },
    [applyPreset]
  );

  const restoreSandbox = useCallback(
    (snapshot: SandboxSnapshot) => {
      applyPreset(snapshot);
      setActivePreset(snapshot.activePreset);
    },
    [applyPreset]
  );

  const contextValue: SandboxSettingsValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  const snapshot: SandboxSnapshot = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return {
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
    contextValue,
    snapshot,
    restoreSandbox,
  };
}
