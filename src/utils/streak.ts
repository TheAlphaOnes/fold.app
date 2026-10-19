import { addDays, toDayKey } from '@/utils/format-date';

export interface StreakSummary {
  /** Consecutive days ending today, or yesterday while today is still open. */
  current: number;
  longest: number;
}

/**
 * Streak lengths from the set of local day keys (YYYY-MM-DD) that hold a memory.
 * A streak stays alive through today until midnight, so a run that ended
 * yesterday still counts as current.
 */
export function computeStreak(activeDays: ReadonlySet<string>, today: Date = new Date()): StreakSummary {
  if (activeDays.size === 0) return { current: 0, longest: 0 };

  let longest = 0;
  for (const key of activeDays) {
    // Only count from the first day of each run, so every run is walked once.
    if (activeDays.has(toDayKey(addDays(parseDayKey(key), -1)))) continue;
    let length = 1;
    let cursor = addDays(parseDayKey(key), 1);
    while (activeDays.has(toDayKey(cursor))) {
      length += 1;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, length);
  }

  let cursor = activeDays.has(toDayKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (activeDays.has(toDayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}

/** Parses a local YYYY-MM-DD key as local midnight (not UTC, as `new Date(key)` would). */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
