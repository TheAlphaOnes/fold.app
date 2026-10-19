/**
 * Progression store — today's three moments, the Continuum streak, and the
 * queue of stamps waiting to play.
 *
 * Everything here is derived from the journal itself, so it cannot drift:
 * deleting a memory can reopen a moment, restoring one fills it again. The
 * only thing stored is which of today's moments have been stamped, so each
 * stamp plays once. Every refresh also rebuilds the reminder schedule, so a
 * captured moment is never nudged.
 */

import { create } from 'zustand';
import { getCreationTimesOnDate, getDatesWithMemories } from '@/db/journal-repository';
import { getSetting, setSetting } from '@/db/settings-repository';
import { useSettingsStore } from '@/hooks/use-settings';
import { syncMomentReminders } from '@/services/reminders.service';
import {
  MOMENTS,
  NO_MOMENTS,
  countDone,
  momentAt,
  type MomentId,
  type MomentsDone,
  type Reward,
} from '@/constants/progression';
import { computeStreak, type StreakSummary } from '@/utils/streak';
import { toDayKey } from '@/utils/format-date';

/** Stored as `YYYY-MM-DD:morning,evening` — the day and the moments already stamped on it. */
const STAMPED_KEY = 'momentsStampedOn';

interface ProgressionState {
  /** Local day keys (YYYY-MM-DD) that hold at least one memory. */
  activeDays: Set<string>;
  streak: StreakSummary;
  todayKey: string;
  moments: MomentsDone;
  loaded: boolean;
  rewards: Reward[];

  /** Re-reads today's moments and the streak from the journal. Never throws. */
  refresh: () => Promise<void>;
  /** Call after a memory is saved: refreshes, then queues a stamp for any newly filled moment. */
  recordCapture: () => Promise<void>;
  dismissReward: (id: string) => void;
}

function momentsFrom(times: number[]): MomentsDone {
  const done: MomentsDone = { ...NO_MOMENTS };
  for (const time of times) done[momentAt(new Date(time)).id] = true;
  return done;
}

function parseStamped(value: string | null, todayKey: string): Set<MomentId> {
  if (!value) return new Set();
  const [day, list] = value.split(':');
  if (day !== todayKey || !list) return new Set();
  return new Set(list.split(',').filter(Boolean) as MomentId[]);
}

/** The first moment after `current` that is still open today. */
function nextOpen(current: MomentId, done: MomentsDone): MomentId | null {
  const index = MOMENTS.findIndex((m) => m.id === current);
  return MOMENTS.slice(index + 1).find((m) => !done[m.id])?.id ?? null;
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  activeDays: new Set(),
  streak: { current: 0, longest: 0 },
  todayKey: toDayKey(new Date()),
  moments: NO_MOMENTS,
  loaded: false,
  rewards: [],

  refresh: async () => {
    const todayKey = toDayKey(new Date());
    try {
      const [dates, times] = await Promise.all([
        getDatesWithMemories(),
        getCreationTimesOnDate(todayKey),
      ]);
      const activeDays = new Set(dates);
      const moments = momentsFrom(times);
      set({ activeDays, streak: computeStreak(activeDays), todayKey, moments, loaded: true });
      void syncMomentReminders(useSettingsStore.getState().settings.momentReminders, moments);
    } catch (error) {
      // Progress is a nicety on top of the journal; a failed read keeps the
      // last known values rather than breaking the screen that asked.
      console.error('Failed to refresh progression', error);
    }
  },

  recordCapture: async () => {
    await get().refresh();
    if (useSettingsStore.getState().settings.quietMode) return;

    const { todayKey, moments, streak } = get();
    let stamped: Set<MomentId>;
    try {
      stamped = parseStamped(await getSetting(STAMPED_KEY), todayKey);
    } catch (error) {
      console.error('Failed to read stamped moments', error);
      return;
    }

    const fresh = MOMENTS.filter((m) => moments[m.id] && !stamped.has(m.id));
    if (fresh.length === 0) return;
    for (const moment of fresh) stamped.add(moment.id);
    try {
      await setSetting(STAMPED_KEY, `${todayKey}:${Array.from(stamped).join(',')}`);
    } catch (error) {
      console.error('Failed to record stamped moments', error);
      return;
    }

    // Only the moment just captured is stamped. Earlier ones that were never
    // stamped (memories from before an update, or made in Quiet mode) are
    // marked silently rather than played back in a row.
    const current = momentAt(new Date());
    if (!fresh.some((m) => m.id === current.id)) return;
    const reward: Reward = {
      id: `${todayKey}:${current.id}`,
      kind: 'moment',
      moment: current.id,
      done: countDone(moments),
      next: nextOpen(current.id, moments),
      streak: streak.current,
    };
    set((state) => ({ rewards: [...state.rewards, reward] }));
  },

  dismissReward: (id: string) => {
    set((state) => ({ rewards: state.rewards.filter((reward) => reward.id !== id) }));
  },
}));

/** Today's moments for the Continuum card; hidden in Quiet mode. */
export function useTodayMoments() {
  const moments = useProgressionStore((state) => state.moments);
  const loaded = useProgressionStore((state) => state.loaded);
  const quietMode = useSettingsStore((state) => state.settings.quietMode);
  return { moments, visible: loaded && !quietMode };
}
