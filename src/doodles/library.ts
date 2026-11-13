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
import { FEBRUARY } from '@/doodles/months/02-february';
import { MARCH } from '@/doodles/months/03-march';
import { APRIL } from '@/doodles/months/04-april';
import { MAY } from '@/doodles/months/05-may';
import { JUNE } from '@/doodles/months/06-june';
import { JULY } from '@/doodles/months/07-july';
import { AUGUST } from '@/doodles/months/08-august';
import { SEPTEMBER } from '@/doodles/months/09-september';
import { OCTOBER } from '@/doodles/months/10-october';
import { NOVEMBER } from '@/doodles/months/11-november';
import { DECEMBER } from '@/doodles/months/12-december';
import type { LibraryDoodle } from '@/doodles/types';

/** Days per month on the leap-year calendar the library follows. */
export const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Index of each month's first doodle. */
export const MONTH_STARTS: readonly number[] = MONTH_DAYS.map((_, m) => MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0));

/** The library, in calendar order. */
export const DOODLES: readonly LibraryDoodle[] = [...JANUARY, ...FEBRUARY, ...MARCH, ...APRIL, ...MAY, ...JUNE, ...JULY, ...AUGUST, ...SEPTEMBER, ...OCTOBER, ...NOVEMBER, ...DECEMBER];

/** A date's slot in the library (0 … 365), the same in every year. */
export function slotOf(date: Date): number {
  return MONTH_STARTS[date.getMonth()] + date.getDate() - 1;
}

/** The doodle for a date. */
export function doodleForDate(date: Date): LibraryDoodle {
  return DOODLES[slotOf(date)];
}

/** "No. 001" — a doodle's serial. */
export function serialOf(slot: number): string {
  return `No. ${String(slot + 1).padStart(3, '0')}`;
}
