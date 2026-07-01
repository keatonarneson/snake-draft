import { Player } from "../types/draft";
import { computeConsensusValues, parsePlayersFromCSVs } from "../utils/csvParser";
import { getMockPlayers } from "../utils/sampleData";

export type ProjectionSystem = "oopsy" | "thebat" | "steamer" | "mock";

export interface ProjectionDatasets {
  oopsy: Player[];
  thebat: Player[];
  steamer: Player[];
}

export interface ProjectionSelection {
  players: Player[];
  isUsingCsv: boolean;
}

async function fetchAndParseProjectionCsvs(hittersUrl: string, pitchersUrl: string): Promise<Player[]> {
  const resHitters = await fetch(hittersUrl);
  const resPitchers = await fetch(pitchersUrl);

  if (!resHitters.ok || !resPitchers.ok) {
    throw new Error("Projection CSV not found");
  }

  const hittersText = await resHitters.text();
  const pitchersText = await resPitchers.text();

  return parsePlayersFromCSVs(hittersText, pitchersText);
}

export async function loadProjectionDatasets(): Promise<ProjectionDatasets | null> {
  const [oopsy, steamer, thebat] = await Promise.all([
    fetchAndParseProjectionCsvs("/oopsy_hitters.csv", "/oopsy_pitchers.csv").catch(() => []),
    fetchAndParseProjectionCsvs("/steamer_hitters.csv", "/steamer_pitchers.csv").catch(() => []),
    fetchAndParseProjectionCsvs("/thebat_pitchers.csv", "/thebat_hitters.csv").catch(() => []),
  ]);

  if (oopsy.length === 0 && steamer.length === 0 && thebat.length === 0) {
    return null;
  }

  return { oopsy, steamer, thebat };
}

export function selectProjectionPlayers(
  projectionSystem: ProjectionSystem,
  datasets: ProjectionDatasets | null
): ProjectionSelection {
  if (projectionSystem === "mock" || !datasets) {
    return {
      players: getMockPlayers(),
      isUsingCsv: false,
    };
  }

  const primary = datasets[projectionSystem];

  if (primary.length === 0) {
    return {
      players: getMockPlayers(),
      isUsingCsv: false,
    };
  }

  return {
    players: computeConsensusValues(
      primary,
      datasets.oopsy.length > 0 ? datasets.oopsy : primary,
      datasets.thebat.length > 0 ? datasets.thebat : primary,
      datasets.steamer.length > 0 ? datasets.steamer : primary
    ),
    isUsingCsv: true,
  };
}
