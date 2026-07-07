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
  isLoadingProjections: boolean;
  projectionLoadFailed: boolean;
}

export function useProjectionLoader(): UseProjectionLoaderResult {
  const [projectionSystem, setProjectionSystem] = useState<ProjectionSystem>("oopsy");
  const [allCsvDatasets, setAllCsvDatasets] = useState<ProjectionDatasets | null>(null);
  const [isLoadingProjections, setIsLoadingProjections] = useState(true);
  const [projectionLoadFailed, setProjectionLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAllData() {
      try {
        const datasets = await loadProjectionDatasets();
        if (cancelled) return;
        if (datasets) {
          setAllCsvDatasets(datasets);
        } else {
          // No dataset resolved — every CSV was missing or failed to parse.
          setProjectionLoadFailed(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load custom projection datasets, using mock data:", err);
        setProjectionLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoadingProjections(false);
      }
    }

    loadAllData();
    return () => {
      cancelled = true;
    };
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
    isLoadingProjections,
    projectionLoadFailed,
  };
}
