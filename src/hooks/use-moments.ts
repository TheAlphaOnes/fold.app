/**
 * Moments — the small celebrations (dim + a white ripple or streak ticks,
 * optional caption) that CelebrationHost plays over the whole screen.
 *
 * celebrate() calls that land together merge into one moment: a save
 * ripples, and if the same save also grows the streak, it becomes the
 * streak moment with "DAY 05" instead of starting a second one.
 */

import { create } from 'zustand';

/** Calls within this window share one moment. */
const MERGE_MS = 900;

/** ripple: saves, edits, restores, new stories. streak: the streak grew. */
export type MomentKind = 'ripple' | 'streak';

export interface Moment {
  id: number;
  startedAt: number;
  kind: MomentKind;
  caption: string | null;
}

interface MomentsState {
  moment: Moment | null;
  celebrate: (caption?: string, kind?: MomentKind) => void;
  finish: (id: number) => void;
}

export const useMoments = create<MomentsState>((set, get) => ({
  moment: null,
  celebrate: (caption, kind = 'ripple') => {
    const now = Date.now();
    const current = get().moment;
    if (current && now - current.startedAt < MERGE_MS) {
      // The later, more specific call wins: a caption, a streak.
      set({ moment: { ...current, caption: caption ?? current.caption, kind: kind === 'streak' ? 'streak' : current.kind } });
      return;
    }
    set({ moment: { id: now, startedAt: now, kind, caption: caption ?? null } });
  },
  finish: (id) => {
    if (get().moment?.id === id) set({ moment: null });
  },
}));
