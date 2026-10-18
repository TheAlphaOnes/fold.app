import { useEffect, useState } from 'react';
import { useJournalStore } from '@/hooks/use-journal';
import { findResurfacedMemory, type ResurfacedMemory } from '@/services/resurface.service';

interface State {
  resurfaced: ResurfacedMemory | null;
  loaded: boolean;
}

/** Today's memory from the past; re-evaluated whenever the journal changes. */
export function useResurfacedMemory() {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [state, setState] = useState<State>({ resurfaced: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    findResurfacedMemory()
      .then((resurfaced) => {
        if (!cancelled) setState({ resurfaced, loaded: true });
      })
      .catch((error) => {
        console.error('Failed to resurface a memory', error);
        if (!cancelled) setState((previous) => ({ ...previous, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [hydrationVersion]);

  return state;
}
