import { create } from 'zustand';
import { 
  getAllCompositions, 
  getOnThisDayCompositions,
  createComposition, 
  updateMediaPositions,
  toggleCompositionStoryId,
  deleteComposition,
  deleteAllCompositions,
  type CreateCompositionInput
} from '@/db/journal-repository';
import type { Composition, MediaElement } from '@/types/journal';

interface JournalState {
  compositions: Composition[];
  allCompositions: Composition[];
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
  loadAllCompositions: () => Promise<void>;
  loadMoreCompositions: () => Promise<void>;
  addComposition: (input: CreateCompositionInput) => Promise<void>;
  updatePositions: (id: number, newMediaElements: MediaElement[]) => Promise<void>;
  toggleStoryId: (id: number, storyId: number) => Promise<void>;
  removeComposition: (id: number) => Promise<void>;
  removeAllCompositions: () => Promise<void>;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  compositions: [],
  allCompositions: [],
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

  loadAllCompositions: async () => {
    try {
      set({ loading: true, error: null });
      const items = await getAllCompositions(50, 0);
      set({ allCompositions: items, loading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err : new Error(String(err)), 
        loading: false 
      });
    }
  },

  loadMoreCompositions: async () => {
    try {
      const state = get();
      if (state.loading) return; // Prevent double-fetch
      set({ loading: true });
      const currentCount = state.allCompositions.length;
      const newItems = await getAllCompositions(50, currentCount);
      // newItems are in ASC order. Since they are older, they should prepend.
      set({ 
        allCompositions: [...newItems, ...state.allCompositions], 
        loading: false 
      });
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
    await get().loadAllCompositions();
  },

  updatePositions: async (id: number, newMediaElements: MediaElement[]) => {
    // Optimistic UI update
    set((state) => ({
      compositions: state.compositions.map(comp => 
        comp.id === id ? { ...comp, mediaElements: newMediaElements } : comp
      ),
      allCompositions: state.allCompositions.map(comp => 
        comp.id === id ? { ...comp, mediaElements: newMediaElements } : comp
      )
    }));
    await updateMediaPositions({ id, mediaElements: newMediaElements });
  },

  toggleStoryId: async (id: number, storyId: number) => {
    // Optimistic UI update
    let added = false;
    set((state) => ({
      compositions: state.compositions.map(comp => {
        if (comp.id === id) {
          const hasStory = comp.storyIds.includes(storyId);
          added = !hasStory;
          return {
            ...comp,
            storyIds: hasStory 
              ? comp.storyIds.filter(s => s !== storyId)
              : [...comp.storyIds, storyId]
          };
        }
        return comp;
      }),
      allCompositions: state.allCompositions.map(comp => {
        if (comp.id === id) {
          const hasStory = comp.storyIds.includes(storyId);
          return {
            ...comp,
            storyIds: hasStory 
              ? comp.storyIds.filter(s => s !== storyId)
              : [...comp.storyIds, storyId]
          };
        }
        return comp;
      })
    }));
    await toggleCompositionStoryId(id, storyId);
  },

  removeComposition: async (id: number) => {
    // Optimistic UI update
    set((state) => ({
      compositions: state.compositions.filter(comp => comp.id !== id),
      allCompositions: state.allCompositions.filter(comp => comp.id !== id)
    }));
    await deleteComposition(id);
  },

  removeAllCompositions: async () => {
    set({ compositions: [], allCompositions: [] });
    await deleteAllCompositions();
  },
}));
