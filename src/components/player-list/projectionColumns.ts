import { PlayerStats } from "../../types/draft";

export type ProjectionView = "mixed" | "hitting" | "pitching";

export interface ProjectionColumn {
  field: keyof PlayerStats;
  label: string;
}

export const HITTING_PROJECTION_COLUMNS: ProjectionColumn[] = [
  { field: "R", label: "R" },
  { field: "HR", label: "HR" },
  { field: "RBI", label: "RBI" },
  { field: "SB", label: "SB" },
  { field: "AVG", label: "AVG" },
];

export const PITCHING_PROJECTION_COLUMNS: ProjectionColumn[] = [
  { field: "W", label: "W" },
  { field: "SV", label: "SV" },
  { field: "SO", label: "SO" },
  { field: "ERA", label: "ERA" },
  { field: "WHIP", label: "WHIP" },
];

export function getProjectionView(selectedPosition: string): ProjectionView {
  if (["P", "SP", "RP"].includes(selectedPosition)) return "pitching";
  if (selectedPosition === "ALL") return "mixed";
  return "hitting";
}

export function getProjectionColumns(view: ProjectionView): ProjectionColumn[] {
  if (view === "hitting") return HITTING_PROJECTION_COLUMNS;
  if (view === "pitching") return PITCHING_PROJECTION_COLUMNS;
  return [];
}
