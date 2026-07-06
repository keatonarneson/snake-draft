"use client";

import { createContext, useContext } from "react";

export type RiskStyle = "safe" | "balanced" | "aggressive";
export type SavesStrategy = "wait" | "balanced" | "aggressive";

export interface SandboxChanges {
  trustProjections?: number;
  draftUrgency?: number;
  categoryBalance?: number;
  rosterFit?: number;
  positionScarcity?: number;
  riskStyle?: RiskStyle;
  reachTolerance?: number;
  savesStrategy?: SavesStrategy;
  rankScarcityCoeff?: number;
}

export interface SandboxSettingsValue {
  trustProjections: number;
  draftUrgency: number;
  categoryBalance: number;
  rosterFit: number;
  positionScarcity: number;
  riskStyle: RiskStyle;
  reachTolerance: number;
  savesStrategy: SavesStrategy;
  rankScarcityCoeff: number;
  activePreset: string;
  onPresetSelect: (presetName: string) => void;
  onSandboxChange: (changes: SandboxChanges) => void;
}

const SandboxSettingsContext = createContext<SandboxSettingsValue | null>(null);

export const SandboxSettingsProvider = SandboxSettingsContext.Provider;

/**
 * Access the algorithm-sandbox weights and their setters. Provided by DraftRoom
 * so the sliders don't have to be prop-drilled through SettingsPanel.
 */
export function useSandboxSettings(): SandboxSettingsValue {
  const context = useContext(SandboxSettingsContext);
  if (!context) {
    throw new Error("useSandboxSettings must be used within a SandboxSettingsProvider");
  }
  return context;
}
