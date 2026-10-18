/**
 * Resurface — picks one memory from the user's past to show today.
 *
 * Priority, first match wins:
 *   1. this calendar day in an earlier year   ("2 YEARS AGO TODAY")
 *   2. exactly one month ago                  ("ONE MONTH AGO")
 *   3. exactly one week ago                   ("ONE WEEK AGO")
 *   4. any memory older than a week           ("FROM MARCH 2026")
 * Within a tier, memories with a photo or video win — the card is meant to
 * bring colour back. The choice is seeded by today's date, so it stays put
 * for the whole day and changes tomorrow.
 */

import {
  getCompositionsBefore,
  getCompositionsOnDate,
  getCompositionsOnMonthDayBefore,
} from '@/db/journal-repository';
import type { Composition } from '@/types/journal';
import { isGifMedia } from '@/utils/media-kind';
import { toDayKey } from '@/utils/format-date';

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_POOL = 120;
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export interface ResurfacedMemory {
  memory: Composition;
  label: string;
}

export function hasVisualMedia(memory: Composition): boolean {
  return memory.mediaElements.some((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
}

/** Stable per-day index into a list, so the pick does not change on every render. */
function seededPick<T>(items: T[], today: Date): T | null {
  if (items.length === 0) return null;
  const key = toDayKey(today);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return items[hash % items.length];
}

/** Photos first; fall back to anything in the tier. */
function pickFrom(tier: Composition[], today: Date): Composition | null {
  const visual = tier.filter(hasVisualMedia);
  return seededPick(visual.length > 0 ? visual : tier, today);
}

function yearsAgoLabel(memory: Composition, today: Date): string {
  const years = today.getFullYear() - new Date(memory.createdAt).getFullYear();
  return years === 1 ? '1 YEAR AGO TODAY' : `${years} YEARS AGO TODAY`;
}

function shiftMonths(date: Date, months: number): Date {
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  // Skip when the day does not exist in that month (e.g. 31st → 1st of next).
  return shifted.getDate() === date.getDate() ? shifted : new Date(NaN);
}

export async function findResurfacedMemory(today: Date = new Date()): Promise<ResurfacedMemory | null> {
  const monthDay = toDayKey(today).slice(5);

  const sameDay = pickFrom(await getCompositionsOnMonthDayBefore(monthDay, today.getFullYear()), today);
  if (sameDay) return { memory: sameDay, label: yearsAgoLabel(sameDay, today) };

  const monthAgo = shiftMonths(today, -1);
  if (!Number.isNaN(monthAgo.getTime())) {
    const pick = pickFrom(await getCompositionsOnDate(toDayKey(monthAgo)), today);
    if (pick) return { memory: pick, label: 'ONE MONTH AGO' };
  }

  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const weekPick = pickFrom(await getCompositionsOnDate(toDayKey(weekAgo)), today);
  if (weekPick) return { memory: weekPick, label: 'ONE WEEK AGO' };

  const older = pickFrom(await getCompositionsBefore(today.getTime() - 7 * DAY_MS, FALLBACK_POOL), today);
  if (older) {
    const date = new Date(older.createdAt);
    return { memory: older, label: `FROM ${MONTHS[date.getMonth()]} ${date.getFullYear()}` };
  }

  return null;
}
