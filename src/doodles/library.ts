/**
 * The doodle library — one doodle for every date of the year, 366 in all.
 *
 * A date's doodle never changes: 13 November is the same doodle every
 * year, and keeping a memory that day is what earns it. The year is laid
 * out on a leap-year calendar, so 29 February has a doodle of its own and
 * 1 March is No. 061 in every year.
 *
 * Each month is a set with its own theme, and the 1st of every month is a
 * piece of folded paper, starting with Fold's crane on No. 001.
 */

import { JANUARY } from '@/doodles/months/01-january';
import type { LibraryDoodle } from '@/doodles/types';

/** Days per month on the leap-year calendar the library follows. */
export const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Index of each month's first doodle. */
export const MONTH_STARTS: readonly number[] = MONTH_DAYS.map((_, m) => MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0));

/** The library, in calendar order. */
export const DOODLES: readonly LibraryDoodle[] = [...JANUARY];

/** A date's slot in the library (0 … 365), the same in every year. */
export function slotOf(date: Date): number {
  return MONTH_STARTS[date.getMonth()] + date.getDate() - 1;
}

/** The doodle for a date, once that month has been drawn. */
export function doodleForDate(date: Date): LibraryDoodle | undefined {
  return DOODLES[slotOf(date)];
}

/** "No. 001" — a doodle's serial. */
export function serialOf(slot: number): string {
  return `No. ${String(slot + 1).padStart(3, '0')}`;
}
