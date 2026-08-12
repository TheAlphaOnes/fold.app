import { useCallback, useEffect, useState } from 'react';
import { 
  getAllCompositions, 
  getOnThisDayCompositions,
  createComposition, 
  updateMediaPositions,
  deleteComposition,
  deleteAllCompositions,
  type CreateCompositionInput
} from '@/db/journal-repository';
import type { Composition, MediaElement } from '@/types/journal';

export function useJournal(targetDate: Date = new Date()) {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // We memoize the month and date to avoid unnecessary re-fetches
  // if the exact timestamp changes but the day doesn't.
  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const targetDay = targetDate.getDate();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getOnThisDayCompositions(targetMonth, targetDay);
      setCompositions(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [targetMonth, targetDay]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const addComposition = useCallback(async (input: CreateCompositionInput) => {
    await createComposition(input);
    await refresh();
  }, [refresh]);

  const updatePositions = useCallback(async (id: number, newMediaElements: MediaElement[]) => {
    // Optimistic
    setCompositions(prev => prev.map(comp => 
      comp.id === id ? { ...comp, mediaElements: newMediaElements } : comp
    ));
    await updateMediaPositions({ id, mediaElements: newMediaElements });
  }, []);

  const removeComposition = useCallback(async (id: number) => {
    // Optimistic
    setCompositions(prev => prev.filter(comp => comp.id !== id));
    await deleteComposition(id);
  }, []);
  const removeAllCompositions = useCallback(async () => {
    setCompositions([]);
    await deleteAllCompositions();
  }, []);

  return {
    compositions,
    loading,
    error,
    refresh,
    addComposition,
    updatePositions,
    removeComposition,
    removeAllCompositions,
  };
}
