/**
 * Progression store — the Fold Score, the Continuum streak, and which of
 * today's moments are captured (so their reminders are skipped).
 *
 * Everything is derived from the journal itself, so it cannot drift:
 * deleting a memory lowers the score, restoring it raises it again. The only
 * thing stored is the score last shown on the profile, so the number can
 * count up from there.
 */

import { create } from 'zustand';
import { getMemorySignals } from '@/db/journal-repository';
import { getSetting, setSetting } from '@/db/settings-repository';
import { requestReminderPermission, syncMomentReminders } from '@/services/reminders.service';
import type { MomentId } from '@/constants/progression';
import { computeFoldScore, groupByDay, type FoldScore } from '@/utils/fold-score';
import { computeStreak, type StreakSummary } from '@/utils/streak';
import { toDayKey } from '@/utils/format-date';

const SEEN_SCORE_KEY = 'foldScoreSeen';

const NO_SCORE: FoldScore = {
  total: 0,
  today: 0,
  todayEarned: { day: 0, moments: 0, words: 0, photo: 0 },
};

/** Points just earned by a save, shown briefly beside the profile tab. */
export interface ScoreGain {
  id: number;
  points: number;
}

interface ProgressionState {
  /** Local day keys (YYYY-MM-DD) that hold at least one memory. */
  activeDays: Set<string>;
  streak: StreakSummary;
  score: FoldScore;
  /** The score the profile last showed; null until read. */
  seenScore: number | null;
  capturedToday: Set<MomentId>;
  loaded: boolean;
  gain: ScoreGain | null;

  /** Re-reads everything from the journal and reschedules reminders. Never throws. */
  refresh: () => Promise<void>;
  /** Call after a memory is saved: refreshes and notes any points it earned. */
  recordCapture: () => Promise<void>;
  clearGain: (id: number) => void;
  /** The profile has shown the current score; the next count-up starts here. */
  markScoreSeen: () => void;
}

/** Asks for notification permission (once, by the system) and schedules if allowed. */
async function enableReminders(capturedToday: ReadonlySet<MomentId>): Promise<void> {
  if (await requestReminderPermission()) await syncMomentReminders(capturedToday);
}

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  activeDays: new Set(),
  streak: { current: 0, longest: 0 },
  score: NO_SCORE,
  seenScore: null,
  capturedToday: new Set(),
  loaded: false,
  gain: null,

  refresh: async () => {
    const todayKey = toDayKey(new Date());
    try {
      const [signals, seen] = await Promise.all([
        getMemorySignals(),
        get().seenScore === null ? getSetting(SEEN_SCORE_KEY) : Promise.resolve(null),
      ]);
      const days = groupByDay(signals);
      const activeDays = new Set(days.keys());
      const capturedToday = days.get(todayKey)?.moments ?? new Set<MomentId>();
      set((state) => ({
        activeDays,
        streak: computeStreak(activeDays),
        score: computeFoldScore(days, todayKey),
        capturedToday,
        loaded: true,
        seenScore: state.seenScore ?? (seen !== null ? Number(seen) || 0 : 0),
      }));
      void syncMomentReminders(capturedToday);
    } catch (error) {
      // Progress is a nicety on top of the journal; a failed read keeps the
      // last known values rather than breaking the screen that asked.
      console.error('Failed to refresh progression', error);
    }
  },

  recordCapture: async () => {
    const before = get().loaded ? get().score.total : null;
    await get().refresh();
    const { score, capturedToday } = get();
    if (before !== null && score.total > before) {
      set({ gain: { id: Date.now(), points: score.total - before } });
    }
    void enableReminders(capturedToday);
  },

  clearGain: (id: number) => {
    if (get().gain?.id === id) set({ gain: null });
  },

  markScoreSeen: () => {
    const { total } = get().score;
    if (get().seenScore === total) return;
    set({ seenScore: total });
    setSetting(SEEN_SCORE_KEY, String(total)).catch((error) =>
      console.error('Failed to store the seen Fold Score', error),
    );
  },
}));
