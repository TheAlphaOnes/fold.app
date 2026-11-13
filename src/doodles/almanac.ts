/**
 * The almanac — the year's doodles as you've earned them. Each date's
 * doodle is shown once a memory was kept that day; other days are dots.
 * Pure, so it's tested; the card and the year screen only draw it.
 */

import { slotOf } from '@/doodles/library';
import { toDayKey } from '@/utils/format-date';

export interface AlmanacDay {
  /** "YYYY-MM-DD" */
  key: string;
  day: number;
  /** The date's slot in the doodle library. */
  slot: number;
  /** A memory was kept this day: its doodle is earned. */
  kept: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface AlmanacMonth {
  year: number;
  /** 0-based. */
  month: number;
  days: AlmanacDay[];
  kept: number;
}

/** One month of the almanac, from per-day memory counts ("YYYY-MM-DD" → count). */
export function almanacMonth(year: number, month: number, counts: Readonly<Record<string, number>>, today: Date): AlmanacMonth {
  const todayKey = toDayKey(today);
  const length = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const key = toDayKey(date);
    return {
      key,
      day: i + 1,
      slot: slotOf(date),
      kept: (counts[key] ?? 0) > 0,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
  return { year, month, days, kept: days.filter((d) => d.kept).length };
}

/** The whole year, month by month. */
export function almanacYear(year: number, counts: Readonly<Record<string, number>>, today: Date): AlmanacMonth[] {
  return Array.from({ length: 12 }, (_, m) => almanacMonth(year, m, counts, today));
}

export const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
