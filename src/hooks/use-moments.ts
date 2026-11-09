/**
 * Moments — the small celebrations (dim + white sparkle, optional caption)
 * that CelebrationHost plays over the whole screen.
 *
 * celebrate() calls that land together merge into one moment: a save
 * sparkles, and if the same save also grows the streak, its "DAY 05"
 * caption joins that sparkle instead of starting a second one.
 */

import { create } from 'zustand';

/** Calls within this window share one moment. */
const MERGE_MS = 900;

export interface Moment {
  id: number;
  startedAt: number;
  caption: string | null;
}

interface MomentsState {
  moment: Moment | null;
  celebrate: (caption?: string) => void;
  finish: (id: number) => void;
}

export const useMoments = create<MomentsState>((set, get) => ({
  moment: null,
  celebrate: (caption) => {
    const now = Date.now();
    const current = get().moment;
    if (current && now - current.startedAt < MERGE_MS) {
      if (caption) set({ moment: { ...current, caption } });
      return;
    }
    set({ moment: { id: now, startedAt: now, caption: caption ?? null } });
  },
  finish: (id) => {
    if (get().moment?.id === id) set({ moment: null });
  },
}));
