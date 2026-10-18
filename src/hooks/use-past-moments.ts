import { useEffect, useState } from 'react';
import { useJournalStore } from '@/hooks/use-journal';
import { findPastMoments, type ResurfacedMemory } from '@/services/resurface.service';

interface State {
  moments: ResurfacedMemory[];
  loaded: boolean;
}

/** Today's strip of past moments; re-evaluated whenever the journal changes. */
export function usePastMoments() {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [state, setState] = useState<State>({ moments: [], loaded: false });

  useEffect(() => {
    let cancelled = false;
    findPastMoments()
      .then((moments) => {
        if (!cancelled) setState({ moments, loaded: true });
      })
      .catch((error) => {
        console.error('Failed to gather past moments', error);
        if (!cancelled) setState((previous) => ({ ...previous, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [hydrationVersion]);

  return state;
}
