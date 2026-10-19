/**
 * Progression store — today's count against the daily goal, the Continuum
 * streak, and the queue of reward moments waiting to play.
 *
 * Everything here is derived from the journal itself, so it cannot drift:
 * deleting a memory lowers the count, restoring one brings it back. The only
 * thing stored is which day's goal has already been celebrated, so a stamp
 * plays once per day and per goal, not every time the count touches it.
 */

import { create } from 'zustand';
import { countCompositionsOnDate, getDatesWithMemories } from '@/db/journal-repository';
import { getSetting, setSetting } from '@/db/settings-repository';
import { useSettingsStore } from '@/hooks/use-settings';
import type { Reward } from '@/constants/progression';
import { computeStreak, type StreakSummary } from '@/utils/streak';
import { toDayKey } from '@/utils/format-date';

const CELEBRATED_KEY = 'goalCelebratedOn';

interface ProgressionState {
  /** Local day keys (YYYY-MM-DD) that hold at least one memory. */
  activeDays: Set<string>;
  streak: StreakSummary;
  todayKey: string;
  todayCount: number;
  loaded: boolean;
  rewards: Reward[];

  /** Re-reads today's count and the streak from the journal. Never throws. */
  refresh: () => Promise<void>;
  /** Call after a memory is saved: refreshes, then queues any reward it earned. */
  recordCapture: () => Promise<void>;
  dismissReward: (id: string) => void;
}

function celebrationStamp(dayKey: string, goal: number): string {
  return `${dayKey}:${goal}`;
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  activeDays: new Set(),
  streak: { current: 0, longest: 0 },
  todayKey: toDayKey(new Date()),
  todayCount: 0,
  loaded: false,
  rewards: [],

  refresh: async () => {
    const todayKey = toDayKey(new Date());
    try {
      const [dates, todayCount] = await Promise.all([
        getDatesWithMemories(),
        countCompositionsOnDate(todayKey),
      ]);
      const activeDays = new Set(dates);
      set({ activeDays, streak: computeStreak(activeDays), todayKey, todayCount, loaded: true });
    } catch (error) {
      // Progress is a nicety on top of the journal; a failed read keeps the
      // last known values rather than breaking the screen that asked.
      console.error('Failed to refresh progression', error);
    }
  },

  recordCapture: async () => {
    await get().refresh();
    const { settings } = useSettingsStore.getState();
    if (settings.quietMode) return;

    const { todayKey, todayCount, streak } = get();
    const goal = settings.dailyGoal;
    if (todayCount < goal) return;

    const stamp = celebrationStamp(todayKey, goal);
    try {
      if ((await getSetting(CELEBRATED_KEY)) === stamp) return;
      await setSetting(CELEBRATED_KEY, stamp);
    } catch (error) {
      console.error('Failed to record daily goal celebration', error);
      return;
    }

    const reward: Reward = { id: stamp, kind: 'daily-goal', goal, streak: streak.current };
    set((state) => ({ rewards: [...state.rewards, reward] }));
  },

  dismissReward: (id: string) => {
    set((state) => ({ rewards: state.rewards.filter((reward) => reward.id !== id) }));
  },
}));

/** Today's progress against the daily goal, for the orange key. */
export function useDailyGoal() {
  const count = useProgressionStore((state) => state.todayCount);
  const loaded = useProgressionStore((state) => state.loaded);
  const goal = useSettingsStore((state) => state.settings.dailyGoal);
  const quietMode = useSettingsStore((state) => state.settings.quietMode);

  const visible = loaded && !quietMode;
  const label = visible ? `${Math.min(count, goal)} of ${goal} today${count >= goal ? ', goal met' : ''}` : undefined;
  return { count, goal, visible, label };
}
