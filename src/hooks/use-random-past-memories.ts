import { useCallback, useEffect, useState } from 'react';
import { useJournalStore } from '@/hooks/use-journal';
import { findRandomPastMemories } from '@/services/resurface.service';
import type { Composition } from '@/types/journal';

interface State {
  memories: Composition[];
  loaded: boolean;
}

/** A fresh random sample of past memories; redrawn when the journal changes. */
export function useRandomPastMemories(count?: number) {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [state, setState] = useState<State>({ memories: [], loaded: false });
  // Bumping the draw re-runs the sample: a fresh random set on demand.
  const [draw, setDraw] = useState(0);
  const reshuffle = useCallback(() => setDraw((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    findRandomPastMemories(count)
      .then((memories) => {
        if (!cancelled) setState({ memories, loaded: true });
      })
      .catch((error) => {
        console.error('Failed to sample past memories', error);
        if (!cancelled) setState((previous) => ({ ...previous, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [hydrationVersion, count, draw]);

  return { ...state, draw, reshuffle };
}
