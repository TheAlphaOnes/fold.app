import { create } from 'zustand';
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

interface JournalState {
  compositions: Composition[];
  loading: boolean;
  error: Error | null;
  targetDate: Date;
  
  setTargetDate: (date: Date) => void;
  refresh: () => Promise<void>;
  addComposition: (input: CreateCompositionInput) => Promise<void>;
  updatePositions: (id: number, newMediaElements: MediaElement[]) => Promise<void>;
  removeComposition: (id: number) => Promise<void>;
  removeAllCompositions: () => Promise<void>;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  compositions: [],
  loading: true,
  error: null,
  targetDate: new Date(),

  setTargetDate: (date: Date) => {
    set({ targetDate: date });
    get().refresh();
  },

  refresh: async () => {
    try {
      set({ loading: true, error: null });
      const date = get().targetDate;
      const targetMonth = date.getMonth() + 1;
      const targetDay = date.getDate();
      const items = await getOnThisDayCompositions(targetMonth, targetDay);
      set({ compositions: items, loading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err : new Error(String(err)), 
        loading: false 
      });
    }
  },

  addComposition: async (input: CreateCompositionInput) => {
    await createComposition(input);
    await get().refresh();
  },

  updatePositions: async (id: number, newMediaElements: MediaElement[]) => {
    // Optimistic UI update
    set((state) => ({
      compositions: state.compositions.map(comp => 
        comp.id === id ? { ...comp, mediaElements: newMediaElements } : comp
      )
    }));
    await updateMediaPositions({ id, mediaElements: newMediaElements });
  },

  removeComposition: async (id: number) => {
    // Optimistic UI update
    set((state) => ({
      compositions: state.compositions.filter(comp => comp.id !== id)
    }));
    await deleteComposition(id);
  },

  removeAllCompositions: async () => {
    set({ compositions: [] });
    await deleteAllCompositions();
  }
}));
