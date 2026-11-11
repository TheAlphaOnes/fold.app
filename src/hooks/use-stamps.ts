/**
 * useStamps — the stamp collection's state: loaded once, kept in step as
 * stamps are made or removed. Screens read from it; the camera adds to it.
 */

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';

import { createStamp, deleteStamp, getAllStamps } from '@/db/stamps-repository';
import { track, trackError } from '@/services/analytics';
import type { NewStamp, Stamp } from '@/types/stamp';

interface StampsState {
  stamps: Stamp[];
  loaded: boolean;
  /**
   * A stamp saved but still on show in the camera (its reveal); kept out of
   * the collection until it's delivered, so it arrives once.
   */
  pending: number | null;
  /** The stamp just delivered: the collection lands it with a flourish, once. */
  justAdded: number | null;
  /** The camera has handed the pending stamp over (it flew into the fan). */
  deliver: () => void;
  clearJustAdded: () => void;
  load: () => Promise<void>;
  add: (stamp: NewStamp) => Promise<Stamp>;
  remove: (id: number) => Promise<void>;
}

export const useStamps = create<StampsState>((set, get) => ({
  stamps: [],
  loaded: false,
  pending: null,
  justAdded: null,
  deliver: () => set({ justAdded: get().pending, pending: null }),
  clearJustAdded: () => set({ justAdded: null }),

  load: async () => {
    try {
      set({ stamps: await getAllStamps(), loaded: true });
    } catch (error) {
      trackError(error, 'stamps_load');
      set({ loaded: true });
    }
  },

  add: async (stamp) => {
    const saved = await createStamp(stamp);
    set({ stamps: [saved, ...get().stamps], pending: saved.id });
    return saved;
  },

  remove: async (id) => {
    const stamp = get().stamps.find((s) => s.id === id);
    await deleteStamp(id);
    set({ stamps: get().stamps.filter((s) => s.id !== id) });
    track('stamp_removed', { remaining: get().stamps.length });
    if (stamp) await FileSystem.deleteAsync(stamp.imageUri, { idempotent: true });
  },
}));
