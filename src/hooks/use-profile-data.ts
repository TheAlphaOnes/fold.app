/**
 * Profile data cache — everything the profile's cards read from the
 * database, loaded in the background before the profile is ever opened.
 *
 * Stale-while-revalidate, across launches: the last snapshot is kept in
 * the app_cache table and loaded first thing (one small read), so the
 * profile has data before any real query runs. The real refresh waits until
 * startup has settled, runs in the background, and saves a new snapshot.
 * It runs again whenever the journal changes (hydrationVersion). Opening the
 * profile never waits on a query; new data replaces the old when it lands.
 */

import { useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import { create } from 'zustand';

import { readCache, writeCache } from '@/db/cache-repository';
import { getDatesWithMemories, getDayCountsForYear, getDayCoversForMonth, type DayCover } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { pickTiles } from '@/utils/story-tiles';
import { findRandomPastMemories } from '@/services/resurface.service';
import type { Composition, Story } from '@/types/journal';

/** Bump when the snapshot's shape changes; old rows are then ignored. */
const SNAPSHOT_KEY = 'profile:v1';
/** After launch, wait this long past the first idle moment before refreshing. */
const LAUNCH_REFRESH_DELAY_MS = 1200;

interface ProfileSnapshot {
  dayCounts: Record<string, number>;
  dayCountsYear: number;
  activeDates: string[];
  monthKey: string;
  monthCovers: Record<string, DayCover>;
  pastMemories: Composition[];
  stories: Story[];
}

/** How many past memories the "from your past" wall samples. */
export const PAST_SAMPLE_SIZE = 18;

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface ProfileDataState {
  /** Memories per day (YYYY-MM-DD) for dayCountsYear; null until first load. */
  dayCounts: Record<string, number> | null;
  dayCountsYear: number;
  /** Every day that has a memory; null until first load. */
  activeDates: Set<string> | null;
  /** Calendar photos per month (YYYY-MM), loaded as months are viewed. */
  covers: Record<string, Record<string, DayCover>>;
  /** Random sample for the "from your past" wall; null until first load. */
  pastMemories: Composition[] | null;
  /** Bumps each time a new sample lands; the wall keys on it. */
  pastSampleId: number;

  /** Fills the store from the saved snapshot, if it's still empty. */
  hydrateFromSnapshot: () => Promise<void>;
  /** Reloads everything for the current journal. Concurrent calls share one load. */
  refresh: () => Promise<void>;
  /** Loads one month's calendar photos if they aren't cached yet. */
  ensureCovers: (monthKey: string) => Promise<void>;
  /** Draws a new past-memories sample. */
  reshufflePast: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

/** Saves what the store holds now, for the next launch. */
async function saveSnapshot(monthKey: string): Promise<void> {
  const state = useProfileDataStore.getState();
  if (!state.dayCounts || !state.activeDates || !state.pastMemories) return;
  const snapshot: ProfileSnapshot = {
    dayCounts: state.dayCounts,
    dayCountsYear: state.dayCountsYear,
    activeDates: [...state.activeDates],
    monthKey,
    monthCovers: state.covers[monthKey] ?? {},
    pastMemories: state.pastMemories,
    stories: useStoriesStore.getState().stories,
  };
  try {
    await writeCache(SNAPSHOT_KEY, snapshot);
  } catch (error) {
    console.warn('Failed to save profile snapshot', error);
  }
}

export const useProfileDataStore = create<ProfileDataState>((set, get) => {
  const loadPast = async () => {
    const memories = await findRandomPastMemories(PAST_SAMPLE_SIZE);
    set((state) => ({ pastMemories: memories, pastSampleId: state.pastSampleId + 1 }));
  };

  const loadCovers = async (monthKey: string) => {
    const covers = await getDayCoversForMonth(monthKey);
    set((state) => ({ covers: { ...state.covers, [monthKey]: covers } }));
  };

  return {
    dayCounts: null,
    dayCountsYear: new Date().getFullYear(),
    activeDates: null,
    covers: {},
    pastMemories: null,
    pastSampleId: 0,

    hydrateFromSnapshot: async () => {
      const snapshot = await readCache<ProfileSnapshot>(SNAPSHOT_KEY);
      if (!snapshot || get().dayCounts !== null) return;
      set({
        dayCounts: snapshot.dayCounts,
        dayCountsYear: snapshot.dayCountsYear,
        activeDates: new Set(snapshot.activeDates),
        covers: { [snapshot.monthKey]: snapshot.monthCovers },
        pastMemories: snapshot.pastMemories,
        pastSampleId: get().pastSampleId + 1,
      });
      if (useStoriesStore.getState().stories.length === 0) {
        useStoriesStore.setState({ stories: snapshot.stories, loading: false });
      }
    },

    refresh: () => {
      if (inFlight) return inFlight;
      const now = new Date();
      const year = now.getFullYear();
      inFlight = Promise.allSettled([
        getDayCountsForYear(year).then((dayCounts) => set({ dayCounts, dayCountsYear: year })),
        getDatesWithMemories().then((dates) => set({ activeDates: new Set(dates) })),
        // Other months' photos may be stale now; drop them and reload this one.
        getDayCoversForMonth(monthKeyOf(now)).then((covers) => set({ covers: { [monthKeyOf(now)]: covers } })),
        loadPast(),
        // Stories, then their tile photos decoded into the image cache, so
        // the story board's photos are on screen the moment it opens.
        useStoriesStore
          .getState()
          .refreshStories()
          .then(() => {
            const uris = pickTiles(useStoriesStore.getState().stories).flatMap((tile) => (tile.uri ? [tile.uri] : []));
            return uris.length > 0 ? Image.prefetch(uris, 'memory-disk') : true;
          }),
      ])
        .then((results) => {
          for (const result of results) {
            if (result.status === 'rejected') console.error('Failed to refresh profile data', result.reason);
          }
          return saveSnapshot(monthKeyOf(now));
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },

    ensureCovers: async (monthKey) => {
      if (get().covers[monthKey]) return;
      try {
        await loadCovers(monthKey);
      } catch (error) {
        console.error('Failed to load calendar photos', error);
      }
    },

    reshufflePast: async () => {
      try {
        await loadPast();
      } catch (error) {
        console.error('Failed to sample past memories', error);
      }
    },
  };
});

/**
 * Keeps the cache warm from the root layout. On launch: the saved snapshot
 * first, then a background refresh once startup has settled. After that, a
 * refresh (after interactions) every time the journal changes.
 */
export function useProfileDataSync(ready: boolean): void {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const launched = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const store = useProfileDataStore.getState();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const first = !launched.current;
    launched.current = true;

    if (first) void store.hydrateFromSnapshot();
    // Wait for an idle moment so the refresh never competes with a screen
    // being drawn or animated.
    const idle = requestIdleCallback(() => {
      timer = setTimeout(() => void store.refresh(), first ? LAUNCH_REFRESH_DELAY_MS : 0);
    });
    return () => {
      cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
    };
  }, [ready, hydrationVersion]);
}
