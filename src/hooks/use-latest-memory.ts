import { useCallback, useEffect, useState } from 'react';
import { getLatestComposition } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';

interface LatestMemoryState {
  memory: Composition | null;
  /** False until the first query resolves — distinguishes "loading" from "empty journal". */
  loaded: boolean;
  /**
   * Id of the newest memory at the time of the first load (0 for an empty
   * journal). Anything above it was added while the caller was mounted.
   */
  firstId: number | null;
}

const INITIAL: LatestMemoryState = { memory: null, loaded: false, firstId: null };

function settle(previous: LatestMemoryState, memory: Composition | null): LatestMemoryState {
  return {
    memory,
    loaded: true,
    firstId: previous.loaded ? previous.firstId : memory?.id ?? 0,
  };
}

/**
 * The user's most recently added memory, kept live: it re-queries whenever the
 * journal store reports a write (hydrationVersion bumps on create, update and
 * delete). `reload()` covers writes that do not bump it, such as story links.
 */
export function useLatestMemory() {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [state, setState] = useState<LatestMemoryState>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    getLatestComposition()
      .then((memory) => {
        if (!cancelled) setState((previous) => settle(previous, memory));
      })
      .catch((error) => {
        console.error('Failed to load latest memory', error);
        if (!cancelled) setState((previous) => ({ ...previous, loaded: true, firstId: previous.firstId ?? 0 }));
      });
    return () => {
      cancelled = true;
    };
  }, [hydrationVersion]);

  /** Re-reads the newest memory and resolves with it (null if empty or on failure). */
  const reload = useCallback(async (): Promise<Composition | null> => {
    try {
      const memory = await getLatestComposition();
      setState((previous) => settle(previous, memory));
      return memory;
    } catch (error) {
      console.error('Failed to reload latest memory', error);
      return null;
    }
  }, []);

  return { ...state, reload };
}
