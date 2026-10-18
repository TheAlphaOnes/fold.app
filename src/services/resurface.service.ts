/**
 * Resurface — picks one memory from the user's past to show today.
 *
 * Priority, first match wins:
 *   1. this calendar day in an earlier year   ("2 YEARS AGO TODAY")
 *   2. exactly one month ago                  ("ONE MONTH AGO")
 *   3. exactly one week ago                   ("ONE WEEK AGO")
 *   4. any memory older than a week           ("FROM MARCH 2026")
 * Photo/video memories win across all tiers (a photo from a week ago beats
 * words from a year ago); text-only memories are used only when the past
 * holds no media at all. The choice is seeded by today's date, so it stays put
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

export async function findResurfacedMemory(today: Date = new Date()): Promise<ResurfacedMemory | null> {
  const tiers = await loadTiers(today);

  // Pass 1: a photo or video from any tier beats words from a closer one —
  // this card exists to bring colour back.
  for (const tier of tiers) {
    const pick = seededPick(tier.memories.filter(hasVisualMedia), today);
    if (pick) return { memory: pick, label: tier.label(pick) };
  }

  // Pass 2: no media anywhere in the past; fall back to any memory.
  for (const tier of tiers) {
    const pick = seededPick(tier.memories, today);
    if (pick) return { memory: pick, label: tier.label(pick) };
  }

  return null;
}
