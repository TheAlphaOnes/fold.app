import { useCallback, useEffect, useState } from 'react';
import { useJournalStore } from '@/hooks/use-journal';
import { findRandomPastMemories } from '@/services/resurface.service';
import type { Composition } from '@/types/journal';

interface State {
  memories: Composition[];
  loaded: boolean;
  /** Increments each time a new sample lands; key the wall on it. */
  sampleId: number;
}

/**
 * A fresh random sample of past memories; redrawn when the journal changes
 * or on reshuffle(). The previous sample stays on screen until the next one
 * is ready, so a reshuffle never flashes or remounts twice.
 */
export function useRandomPastMemories(count?: number) {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [state, setState] = useState<State>({ memories: [], loaded: false, sampleId: 0 });
  const [draw, setDraw] = useState(0);
  const reshuffle = useCallback(() => setDraw((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    findRandomPastMemories(count)
      .then((memories) => {
        if (!cancelled) setState((previous) => ({ memories, loaded: true, sampleId: previous.sampleId + 1 }));
      })
      .catch((error) => {
        console.error('Failed to sample past memories', error);
        if (!cancelled) setState((previous) => ({ ...previous, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [hydrationVersion, count, draw]);

  return { ...state, reshuffle };
}
