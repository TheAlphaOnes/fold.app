/**
 * useStamps — the stamp collection's state: loaded once, kept in step as
 * stamps are made or removed. Screens read from it; the camera adds to it.
 */

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';

import { createStamp, deleteStamp, getAllStamps } from '@/db/stamps-repository';
import { trackError } from '@/services/analytics';
import type { NewStamp, Stamp } from '@/types/stamp';

interface StampsState {
  stamps: Stamp[];
  loaded: boolean;
  /** The stamp just made: the collection lands it with a flourish, once. */
  justAdded: number | null;
  clearJustAdded: () => void;
  load: () => Promise<void>;
  add: (stamp: NewStamp) => Promise<Stamp>;
  remove: (id: number) => Promise<void>;
}

export const useStamps = create<StampsState>((set, get) => ({
  stamps: [],
  loaded: false,
  justAdded: null,
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
    set({ stamps: [saved, ...get().stamps], justAdded: saved.id });
    return saved;
  },

  remove: async (id) => {
    const stamp = get().stamps.find((s) => s.id === id);
    await deleteStamp(id);
    set({ stamps: get().stamps.filter((s) => s.id !== id) });
    if (stamp) await FileSystem.deleteAsync(stamp.imageUri, { idempotent: true });
  },
}));
