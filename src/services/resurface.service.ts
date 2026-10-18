/**
 * Resurface — gathers moments from the user's past to show today.
 *
 * Moments come from four tiers, shown in this order:
 *   1. this calendar day in an earlier year   ("2 YEARS AGO TODAY")
 *   2. exactly one month ago                  ("ONE MONTH AGO")
 *   3. exactly one week ago                   ("ONE WEEK AGO")
 *   4. any memory older than a week           ("FROM MARCH 2026")
 * Photo/video memories fill the strip first; text-only memories only top it
 * up to a minimum. The older tier is shuffled with today's date as the seed,
 * so the strip holds still all day and changes tomorrow.
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

function yearsAgoLabel(memory: Composition, today: Date): string {
  const years = today.getFullYear() - new Date(memory.createdAt).getFullYear();
  return years === 1 ? '1 YEAR AGO TODAY' : `${years} YEARS AGO TODAY`;
}

function shiftMonths(date: Date, months: number): Date {
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  // Skip when the day does not exist in that month (e.g. 31st → 1st of next).
  return shifted.getDate() === date.getDate() ? shifted : new Date(NaN);
}

interface Tier {
  memories: Composition[];
  label: (memory: Composition) => string;
}

async function loadTiers(today: Date): Promise<Tier[]> {
  const monthDay = toDayKey(today).slice(5);
  const tiers: Tier[] = [
    {
      memories: await getCompositionsOnMonthDayBefore(monthDay, today.getFullYear()),
      label: (memory) => yearsAgoLabel(memory, today),
    },
  ];

  const monthAgo = shiftMonths(today, -1);
  if (!Number.isNaN(monthAgo.getTime())) {
    tiers.push({ memories: await getCompositionsOnDate(toDayKey(monthAgo)), label: () => 'ONE MONTH AGO' });
  }

  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  tiers.push({ memories: await getCompositionsOnDate(toDayKey(weekAgo)), label: () => 'ONE WEEK AGO' });

  tiers.push({
    memories: await getCompositionsBefore(today.getTime() - 7 * DAY_MS, FALLBACK_POOL),
    label: (memory) => {
      const date = new Date(memory.createdAt);
      return `FROM ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    },
  });
  return tiers;
}

/** Deterministic per-day shuffle so the strip holds still all day. */
function seededShuffle<T>(items: T[], today: Date): T[] {
  const key = toDayKey(today);
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Today's strip of past moments, in tier order (years ago today, a month
 * ago, a week ago, then older). Photo/video memories fill the strip first;
 * text-only memories are added only to reach the minimum.
 */
export async function findPastMoments(
  today: Date = new Date(),
  { max = 8, min = 3 }: { max?: number; min?: number } = {},
): Promise<ResurfacedMemory[]> {
  const tiers = await loadTiers(today);
  const seen = new Set<number>();
  const visual: ResurfacedMemory[] = [];
  const words: ResurfacedMemory[] = [];

  tiers.forEach((tier, index) => {
    // The open-ended "older" tier is shuffled per day; dated tiers keep order.
    const pool = index === tiers.length - 1 ? seededShuffle(tier.memories, today) : tier.memories;
    for (const memory of pool) {
      if (seen.has(memory.id)) continue;
      seen.add(memory.id);
      const moment = { memory, label: tier.label(memory) };
      (hasVisualMedia(memory) ? visual : words).push(moment);
    }
  });

  const strip = visual.slice(0, max);
  if (strip.length < min) strip.push(...words.slice(0, min - strip.length));
  return strip;
}
