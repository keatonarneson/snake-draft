import { useEffect, useState } from "react";
import {
  loadProjectionDatasets,
  ProjectionDatasets,
  ProjectionSystem,
  selectProjectionPlayers,
} from "../data/projections";
import { Player } from "../types/draft";

interface UseProjectionLoaderOptions {
  numTeams: number;
  numRounds: number;
  userPosition: number;
  resetDraftSequence: (teamsCount: number, roundsCount: number) => void;
  setRosterViewTeamIndex: (teamIndex: number) => void;
}

interface UseProjectionLoaderResult {
  players: Player[];
  loadedPlayers: Player[];
  projectionSystem: ProjectionSystem;
  setProjectionSystem: (system: ProjectionSystem) => void;
  isUsingCsv: boolean;
}

export function useProjectionLoader({
  numTeams,
  numRounds,
  userPosition,
  resetDraftSequence,
  setRosterViewTeamIndex,
}: UseProjectionLoaderOptions): UseProjectionLoaderResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadedPlayers, setLoadedPlayers] = useState<Player[]>([]);
  const [projectionSystem, setProjectionSystem] = useState<ProjectionSystem>("oopsy");
  const [allCsvDatasets, setAllCsvDatasets] = useState<ProjectionDatasets | null>(null);
  const [isUsingCsv, setIsUsingCsv] = useState(false);

  useEffect(() => {
    async function loadAllData() {
      try {
        const datasets = await loadProjectionDatasets();
        if (datasets) {
          setAllCsvDatasets(datasets);
          setIsUsingCsv(true);
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

  useEffect(() => {
    const selection = selectProjectionPlayers(projectionSystem, allCsvDatasets);
    setLoadedPlayers(selection.players);
    setIsUsingCsv(selection.isUsingCsv);
    setPlayers(selection.players);
    resetDraftSequence(numTeams, numRounds);
    setRosterViewTeamIndex(userPosition - 1);
  }, [
    projectionSystem,
    allCsvDatasets,
    numTeams,
    numRounds,
    userPosition,
    resetDraftSequence,
    setRosterViewTeamIndex,
  ]);

  return {
    players,
    loadedPlayers,
    projectionSystem,
    setProjectionSystem,
    isUsingCsv,
  };
}
