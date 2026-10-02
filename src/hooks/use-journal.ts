import { create } from 'zustand';
import { 
  getAllCompositions, 
  getOnThisDayCompositions,
  getTimelineSpine,
  getCompositionsByIds,
  getCompositionById,
  createComposition, 
  updateMediaPositions,
  toggleCompositionStoryId,
  deleteComposition,
  deleteAllCompositions,
  type CreateCompositionInput
} from '@/db/journal-repository';
import type { Composition, MediaElement } from '@/types/journal';
import type { TimelineFeedMode, TimelineSpineEntry } from '@/utils/timeline';

/** Cards kept fully decoded around the focused memory. */
const HYDRATE_BEHIND = 4;
const HYDRATE_AHEAD = 8;
/** Wider than the hydrate window so a fling does not flash empty slots. */
const EVICT_BEHIND = 10;
const EVICT_AHEAD = 16;

interface JournalState {
  compositions: Composition[];
  allCompositions: Composition[];
  timelineSpine: TimelineSpineEntry[];
  hydratedById: Record<number, Composition>;
  hydrationVersion: number;
  timelineKey: string | null;
  timelineMode: TimelineFeedMode;
  loading: boolean;
  error: Error | null;
  targetDate: Date;
  activeCompositionId: number | null;
  /** True once the splash screen animation has fully completed. Guards audio auto-play. */
  isAppVisible: boolean;
  justAddedId: number | null;
  pinnedIds: number[];

  setTargetDate: (date: Date) => void;
  setActiveCompositionId: (id: number | null) => void;
  setAppVisible: (visible: boolean) => void;
  setJustAddedId: (id: number | null) => void;
  refresh: () => Promise<void>;
  loadAllCompositions: () => Promise<void>;
  loadMoreCompositions: () => Promise<void>;
  loadTimeline: (mode: TimelineFeedMode, anchor?: Date, options?: { force?: boolean }) => Promise<void>;
  hydrateAround: (spineIndex: number) => Promise<void>;
  ensureComposition: (id: number) => Promise<void>;
  pinComposition: (id: number) => void;
  unpinComposition: (id: number) => void;
  addComposition: (input: CreateCompositionInput) => Promise<void>;
  updatePositions: (id: number, newMediaElements: MediaElement[]) => Promise<void>;
  toggleStoryId: (id: number, storyId: number) => Promise<void>;
  removeComposition: (id: number) => Promise<void>;
  removeAllCompositions: () => Promise<void>;
}

function anchorKey(mode: TimelineFeedMode, anchor: Date): string {
  return `${mode}:${anchor.getFullYear()}-${anchor.getMonth()}-${anchor.getDate()}`;
}

function idsAround(spine: TimelineSpineEntry[], index: number, behind: number, ahead: number): number[] {
  if (spine.length === 0) return [];
  const clamped = Math.max(0, Math.min(spine.length - 1, index));
  const from = Math.max(0, clamped - behind);
  const to = Math.min(spine.length, clamped + ahead + 1);
  return spine.slice(from, to).map((entry) => entry.id);
}

function listHydrated(hydratedById: Record<number, Composition>): Composition[] {
  return Object.values(hydratedById);
}

let hydrateGeneration = 0;

export const useJournalStore = create<JournalState>((set, get) => ({
  compositions: [],
  allCompositions: [],
  timelineSpine: [],
  hydratedById: {},
  hydrationVersion: 0,
  timelineKey: null,
  timelineMode: 'yearly',
  loading: true,
  error: null,
  targetDate: new Date(),
  activeCompositionId: null,
  isAppVisible: false,
  justAddedId: null,
  pinnedIds: [],

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
      const hydratedById: Record<number, Composition> = {};
      for (const item of items) hydratedById[item.id] = item;
      set({
        allCompositions: items,
        hydratedById: { ...get().hydratedById, ...hydratedById },
        hydrationVersion: get().hydrationVersion + 1,
        loading: false,
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err : new Error(String(err)), 
        loading: false 
      });
    }
  },

  loadMoreCompositions: async () => {
    const spine = get().timelineSpine;
    if (spine.length === 0) return;
    await get().hydrateAround(spine.length - 1);
  },

  loadTimeline: async (mode, anchor = new Date(), options) => {
    const key = anchorKey(mode, anchor);
    if (!options?.force && get().timelineKey === key) return;

    try {
      set({ loading: true, error: null, timelineMode: mode });
      const spine = await getTimelineSpine(mode, anchor);
      const initialIds = idsAround(spine, 0, HYDRATE_BEHIND, HYDRATE_AHEAD);
      const rows = await getCompositionsByIds(initialIds);
      const hydratedById: Record<number, Composition> = {};
      for (const id of get().pinnedIds) {
        const existing = get().hydratedById[id];
        if (existing) hydratedById[id] = existing;
      }
      for (const row of rows) hydratedById[row.id] = row;

      set({
        timelineSpine: spine,
        timelineKey: key,
        timelineMode: mode,
        hydratedById,
        allCompositions: listHydrated(hydratedById),
        hydrationVersion: get().hydrationVersion + 1,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      });
    }
  },

  hydrateAround: async (spineIndex: number) => {
    const generation = ++hydrateGeneration;
    const spine = get().timelineSpine;
    if (spine.length === 0) return;

    const needed = idsAround(spine, spineIndex, HYDRATE_BEHIND, HYDRATE_AHEAD)
      .filter((id) => !get().hydratedById[id]);

    let fetched: Composition[] = [];
    if (needed.length > 0) {
      try {
        fetched = await getCompositionsByIds(needed);
      } catch (err) {
        console.error('Failed to hydrate timeline window', err);
        return;
      }
    }

    if (generation !== hydrateGeneration) return;

    const keep = new Set(idsAround(spine, spineIndex, EVICT_BEHIND, EVICT_AHEAD));
    for (const id of get().pinnedIds) keep.add(id);
    const activeId = get().activeCompositionId;
    if (activeId !== null) keep.add(activeId);

    const next: Record<number, Composition> = {};
    for (const [key, value] of Object.entries(get().hydratedById)) {
      const id = Number(key);
      if (keep.has(id)) next[id] = value;
    }
    for (const row of fetched) {
      if (keep.has(row.id)) next[row.id] = row;
    }

    set({
      hydratedById: next,
      allCompositions: listHydrated(next),
      hydrationVersion: get().hydrationVersion + 1,
    });
  },

  ensureComposition: async (id: number) => {
    if (get().hydratedById[id]) return;
    try {
      const composition = await getCompositionById(id);
      if (!composition) return;
      const hydratedById = { ...get().hydratedById, [id]: composition };
      set({
        hydratedById,
        allCompositions: listHydrated(hydratedById),
        hydrationVersion: get().hydrationVersion + 1,
      });
    } catch (err) {
      console.error('Failed to load memory', err);
    }
  },

  pinComposition: (id: number) => {
    if (get().pinnedIds.includes(id)) return;
    set({ pinnedIds: [...get().pinnedIds, id] });
  },

  unpinComposition: (id: number) => {
    set({ pinnedIds: get().pinnedIds.filter((pinned) => pinned !== id) });
  },

  addComposition: async (input: CreateCompositionInput) => {
    const newComp = await createComposition(input);
    set({ justAddedId: newComp.id });
    await get().refresh();
    const mode = get().timelineMode;
    await get().loadTimeline(mode, new Date(), { force: true });
  },

  updatePositions: async (id: number, newMediaElements: MediaElement[]) => {
    const patch = (comp: Composition) =>
      comp.id === id ? { ...comp, mediaElements: newMediaElements } : comp;

    const hydratedById = { ...get().hydratedById };
    if (hydratedById[id]) {
      hydratedById[id] = { ...hydratedById[id], mediaElements: newMediaElements };
    }

    set((state) => ({
      compositions: state.compositions.map(patch),
      allCompositions: state.allCompositions.map(patch),
      hydratedById,
    }));
    await updateMediaPositions({ id, mediaElements: newMediaElements });
  },

  toggleStoryId: async (id: number, storyId: number) => {
    const nextStoryIds = (storyIds: number[]) => {
      const hasStory = storyIds.includes(storyId);
      return hasStory ? storyIds.filter((story) => story !== storyId) : [...storyIds, storyId];
    };

    const hydratedById = { ...get().hydratedById };
    if (hydratedById[id]) {
      hydratedById[id] = { ...hydratedById[id], storyIds: nextStoryIds(hydratedById[id].storyIds) };
    }

    set((state) => ({
      compositions: state.compositions.map((comp) =>
        comp.id === id ? { ...comp, storyIds: nextStoryIds(comp.storyIds) } : comp
      ),
      allCompositions: state.allCompositions.map((comp) =>
        comp.id === id ? { ...comp, storyIds: nextStoryIds(comp.storyIds) } : comp
      ),
      hydratedById,
    }));
    await toggleCompositionStoryId(id, storyId);
  },

  removeComposition: async (id: number) => {
    const hydratedById = { ...get().hydratedById };
    delete hydratedById[id];
    set((state) => ({
      compositions: state.compositions.filter((comp) => comp.id !== id),
      allCompositions: state.allCompositions.filter((comp) => comp.id !== id),
      timelineSpine: state.timelineSpine.filter((entry) => entry.id !== id),
      hydratedById,
      pinnedIds: state.pinnedIds.filter((pinned) => pinned !== id),
      hydrationVersion: state.hydrationVersion + 1,
    }));
    await deleteComposition(id);
  },

  removeAllCompositions: async () => {
    set({
      compositions: [],
      allCompositions: [],
      timelineSpine: [],
      hydratedById: {},
      pinnedIds: [],
      timelineKey: null,
      hydrationVersion: get().hydrationVersion + 1,
    });
    await deleteAllCompositions();
  },
}));
