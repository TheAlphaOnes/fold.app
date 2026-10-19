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
import type { MomentId } from '@/constants/progression';
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
  streak: StreakSummary;
  ink: InkSummary;
  /** Null until read from storage. */
  seenInk: SeenInk | null;
  capturedToday: Set<MomentId>;
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

/** Asks for notification permission (once, by the system) and schedules if allowed. */
async function enableReminders(capturedToday: ReadonlySet<MomentId>): Promise<void> {
  if (await requestReminderPermission()) await syncMomentReminders(capturedToday);
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  activeDays: new Set(),
  streak: { current: 0, longest: 0 },
  ink: NO_INK,
  seenInk: null,
  capturedToday: new Set(),
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
      const capturedToday = days.get(todayKey)?.moments ?? new Set<MomentId>();
      set((state) => ({
        activeDays,
        streak: computeStreak(activeDays),
        ink: computeInk(days, todayKey),
        capturedToday,
        loaded: true,
        seenInk: state.seenInk ?? parseSeen(seen),
      }));
      void syncMomentReminders(capturedToday);
    } catch (error) {
      // Progress is a nicety on top of the journal; a failed read keeps the
      // last known values rather than breaking the screen that asked.
      console.error('Failed to refresh progression', error);
    }
  },

  recordCapture: async () => {
    const before = get().loaded ? get().ink : null;
    await get().refresh();
    const { ink, capturedToday } = get();
    if (before && before.monthKey === ink.monthKey && ink.month > before.month) {
      set({ gain: { id: Date.now(), points: ink.month - before.month } });
    }
    void enableReminders(capturedToday);
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
