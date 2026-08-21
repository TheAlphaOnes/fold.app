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
  activeCompositionId: number | null;
  /** True once the splash screen animation has fully completed. Guards audio auto-play. */
  isAppVisible: boolean;
  justAddedId: number | null;

  setTargetDate: (date: Date) => void;
  setActiveCompositionId: (id: number | null) => void;
  setAppVisible: (visible: boolean) => void;
  setJustAddedId: (id: number | null) => void;
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
  activeCompositionId: null,
  isAppVisible: false,
  justAddedId: null,

  setTargetDate: (date: Date) => {
    set({ targetDate: date });
    get().refresh();
  },

  setActiveCompositionId: (id: number | null) => {
    set({ activeCompositionId: id });
  },

  setAppVisible: (visible: boolean) => {
    set({ isAppVisible: visible });
  },

  setJustAddedId: (id: number | null) => {
    set({ justAddedId: id });
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
    const newComp = await createComposition(input);
    set({ justAddedId: newComp.id });
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
