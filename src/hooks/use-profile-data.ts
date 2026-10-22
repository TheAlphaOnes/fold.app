/**
 * Profile data cache — everything the profile's cards read from the
 * database, loaded in the background before the profile is ever opened.
 *
 * Stale-while-revalidate: cards render whatever is cached at once, and the
 * cache refreshes itself whenever the journal changes (hydrationVersion).
 * Opening the profile therefore never waits on a query; new data just
 * replaces the old when it lands.
 */

import { useEffect } from 'react';
import { Image } from 'expo-image';
import { create } from 'zustand';

import { getDatesWithMemories, getDayCountsForYear, getDayCoversForMonth, type DayCover } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { pickTiles } from '@/utils/story-tiles';
import { findRandomPastMemories } from '@/services/resurface.service';
import type { Composition } from '@/types/journal';

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

  /** Reloads everything for the current journal. Concurrent calls share one load. */
  refresh: () => Promise<void>;
  /** Loads one month's calendar photos if they aren't cached yet. */
  ensureCovers: (monthKey: string) => Promise<void>;
  /** Draws a new past-memories sample. */
  reshufflePast: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

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
 * Keeps the cache warm from the root layout: loads once the database is
 * ready, and again every time the journal changes.
 */
export function useProfileDataSync(ready: boolean): void {
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  useEffect(() => {
    if (!ready) return;
    void useProfileDataStore.getState().refresh();
  }, [ready, hydrationVersion]);
}
