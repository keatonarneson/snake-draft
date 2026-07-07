import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const LOCAL_WRITE_EVENT = "snake-draft:storage";

/**
 * Persists a serializable snapshot to localStorage and exposes any previously
 * saved snapshot for the caller to optionally restore.
 *
 * Reading goes through useSyncExternalStore so it is SSR-safe: the server
 * snapshot is null and the client subscribes to localStorage, which avoids the
 * hydration mismatch a plain "read in useEffect + setState" would risk.
 * Writing is gated by `enabled` so a freshly loaded page does not overwrite a
 * saved draft before the user decides whether to resume it.
 */
export function usePersistedSnapshot<T>(key: string, snapshot: T, enabled: boolean) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(LOCAL_WRITE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LOCAL_WRITE_EVENT, onStoreChange);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  // Returning a stable string keeps useSyncExternalStore from looping; parsing
  // happens in the memo below so the raw value's identity stays stable.
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const restorable = useMemo<T | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);

  useEffect(() => {
    if (!enabled) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // Storage full/unavailable (e.g. private mode) — non-fatal.
    }
  }, [key, enabled, snapshot]);

  const clearSaved = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new Event(LOCAL_WRITE_EVENT));
    } catch {
      // ignore
    }
  }, [key]);

  return { restorable, clearSaved };
}
