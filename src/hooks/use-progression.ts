/**
 * Progression store — this month's ink, the Continuum streak, and which of
 * today's moments are captured (so their reminders are skipped).
 *
 * Everything is derived from the journal itself, so it cannot drift:
 * deleting a memory takes its ink back, restoring it returns it. The only
 * thing stored is the ink last shown on the profile, so the number can
 * count up from there.
 */

import { create } from 'zustand';
import { getMemorySignals } from '@/db/journal-repository';
import { getSetting, setSetting } from '@/db/settings-repository';
import { requestReminderPermission, syncMomentReminders } from '@/services/reminders.service';
import { setPersonProperties, track, type PersonProperties } from '@/services/analytics';
import { NO_INK, computeInk, groupByDay, type InkSummary } from '@/utils/ink';
import { computeStreak, type StreakSummary } from '@/utils/streak';
import { toDayKey } from '@/utils/format-date';

/** Stored as `YYYY-MM:value` — the month and the ink last shown for it. */
const SEEN_INK_KEY = 'inkSeen';

/** Ink the profile last showed, and for which month. */
export interface SeenInk {
  monthKey: string;
  value: number;
}

/** Ink just earned by a save, shown briefly beside the profile tab. */
export interface InkGain {
  id: number;
  points: number;
}

interface ProgressionState {
  /** Local day keys (YYYY-MM-DD) that hold at least one memory. */
  activeDays: Set<string>;
  /** Live memories in the journal. */
  memoryCount: number;
  streak: StreakSummary;
  ink: InkSummary;
  /** Null until read from storage. */
  seenInk: SeenInk | null;
  loaded: boolean;
  gain: InkGain | null;

  /** Re-reads everything from the journal and reschedules reminders. Never throws. */
  refresh: () => Promise<void>;
  /** Call after a memory is saved: refreshes and notes any ink it earned. */
  recordCapture: () => Promise<void>;
  clearGain: (id: number) => void;
  /** The profile has shown the current ink; the next count-up starts here. */
  markInkSeen: () => void;
}

function parseSeen(value: string | null): SeenInk {
  const [monthKey = '', amount = '0'] = (value ?? '').split(':');
  return { monthKey, value: Number(amount) || 0 };
}

let lastSentPerson = '';

/** Keeps the anonymous person's progress current in analytics; sends only on change. */
function syncPersonProgress(state: Pick<ProgressionState, 'memoryCount' | 'activeDays' | 'streak' | 'ink'>): void {
  const properties: PersonProperties = {
    memories_total: state.memoryCount,
    active_days_total: state.activeDays.size,
    current_streak: state.streak.current,
    longest_streak: state.streak.longest,
    ink_this_month: state.ink.month,
    ink_record: state.ink.record,
  };
  const key = JSON.stringify(properties);
  if (key === lastSentPerson) return;
  lastSentPerson = key;
  setPersonProperties(properties);
}

/** Asks for notification permission (once, by the system) and schedules if allowed. */
async function enableReminders(): Promise<void> {
  if (await requestReminderPermission()) await syncMomentReminders();
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  activeDays: new Set(),
  memoryCount: 0,
  streak: { current: 0, longest: 0 },
  ink: NO_INK,
  seenInk: null,
  loaded: false,
  gain: null,

  refresh: async () => {
    const todayKey = toDayKey(new Date());
    try {
      const [signals, seen] = await Promise.all([
        getMemorySignals(),
        get().seenInk === null ? getSetting(SEEN_INK_KEY) : Promise.resolve(null),
      ]);
      const days = groupByDay(signals);
      const activeDays = new Set(days.keys());
      set((state) => ({
        activeDays,
        memoryCount: signals.length,
        streak: computeStreak(activeDays),
        ink: computeInk(days, todayKey),
        loaded: true,
        seenInk: state.seenInk ?? parseSeen(seen),
      }));
      void syncMomentReminders();
      syncPersonProgress(get());
    } catch (error) {
      // Progress is a nicety on top of the journal; a failed read keeps the
      // last known values rather than breaking the screen that asked.
      console.error('Failed to refresh progression', error);
    }
  },

  recordCapture: async () => {
    const before = get().loaded ? { ink: get().ink, streak: get().streak } : null;
    await get().refresh();
    const { ink, streak } = get();
    if (before && before.ink.monthKey === ink.monthKey && ink.month > before.ink.month) {
      const points = ink.month - before.ink.month;
      set({ gain: { id: Date.now(), points } });
      track('ink_earned', {
        points,
        month_total: ink.month,
        record: ink.record,
        is_record_month: ink.month >= ink.record,
        streak: streak.current,
      });
    }
    if (before && streak.current > before.streak.current) {
      track('streak_extended', { streak: streak.current, is_best: streak.current >= streak.longest });
    }
    void enableReminders();
  },

  clearGain: (id: number) => {
    if (get().gain?.id === id) set({ gain: null });
  },

  markInkSeen: () => {
    const { monthKey, month } = get().ink;
    const seen = get().seenInk;
    if (seen?.monthKey === monthKey && seen.value === month) return;
    set({ seenInk: { monthKey, value: month } });
    setSetting(SEEN_INK_KEY, `${monthKey}:${month}`).catch((error) =>
      console.error('Failed to store the ink last seen', error),
    );
  },
}));
