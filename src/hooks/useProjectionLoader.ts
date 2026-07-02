import { useEffect, useMemo, useState } from "react";
import {
  loadProjectionDatasets,
  ProjectionDatasets,
  ProjectionSystem,
  selectProjectionPlayers,
} from "../data/projections";
interface UseProjectionLoaderResult {
  players: ReturnType<typeof selectProjectionPlayers>["players"];
  loadedPlayers: ReturnType<typeof selectProjectionPlayers>["players"];
  projectionSystem: ProjectionSystem;
  setProjectionSystem: (system: ProjectionSystem) => void;
  isUsingCsv: boolean;
}

export function useProjectionLoader(): UseProjectionLoaderResult {
  const [projectionSystem, setProjectionSystem] = useState<ProjectionSystem>("oopsy");
  const [allCsvDatasets, setAllCsvDatasets] = useState<ProjectionDatasets | null>(null);

  useEffect(() => {
    async function loadAllData() {
      try {
        const datasets = await loadProjectionDatasets();
        if (datasets) {
          setAllCsvDatasets(datasets);
        }
      } catch (err) {
        console.error("Failed to load custom projection datasets, using mock data:", err);
      }
    }

    loadAllData();
  }, []);

  const selection = useMemo(() => {
    return selectProjectionPlayers(projectionSystem, allCsvDatasets);
  }, [projectionSystem, allCsvDatasets]);

  return {
    players: selection.players,
    loadedPlayers: selection.players,
    projectionSystem,
    setProjectionSystem,
    isUsingCsv: selection.isUsingCsv,
  };
}
