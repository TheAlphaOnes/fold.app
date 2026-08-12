import { useCallback, useEffect, useState } from 'react';
import { 
  getAllCompositions, 
  createComposition, 
  updateMediaPositions,
  deleteComposition,
  type CreateCompositionInput
} from '@/db/journal-repository';
import type { Composition, MediaElement } from '@/types/journal';

export function useJournal() {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getAllCompositions();
      setCompositions(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    compositions,
    loading,
    error,
    refresh,
    addComposition,
    updatePositions,
    removeComposition,
  };
}
