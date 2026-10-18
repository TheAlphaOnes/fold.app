/**
 * Resurface — gathers moments from the user's past to show today.
 *
 * Moments come from four tiers, shown in this order:
 *   1. this calendar day in an earlier year   ("2 YEARS AGO TODAY")
 *   2. exactly one month ago                  ("ONE MONTH AGO")
 *   3. exactly one week ago                   ("ONE WEEK AGO")
 *   4. any memory older than a week           ("15 DAYS AGO", "MAR 2026")
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
import * as FileSystem from 'expo-file-system/legacy';

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_POOL = 120;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface ResurfacedMemory {
  memory: Composition;
  /** Compact ruler mark: "15 DAYS", "3 WK", "2 MO", "1 YR". */
  tick: string;
  /** Spoken form for accessibility: "15 days ago", "1 year ago today". */
  label: string;
  /** Exactly this calendar day in an earlier year. */
  isAnniversary: boolean;
}

export function hasVisualMedia(memory: Composition): boolean {
  return memory.mediaElements.some((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
}

function yearsAgoLabel(memory: Composition, today: Date): string {
  const years = today.getFullYear() - new Date(memory.createdAt).getFullYear();
  return years === 1 ? '1 YEAR AGO TODAY' : `${years} YEARS AGO TODAY`;
}

/** Recent-ish memories read as a count of days; older ones as a month. */
function olderLabel(memory: Composition, today: Date): string {
  const days = Math.round((today.getTime() - memory.createdAt) / DAY_MS);
  if (days <= 60) return `${days} DAYS AGO`;
  const date = new Date(memory.createdAt);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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
    label: (memory) => olderLabel(memory, today),
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
/** Short ruler tick ("15 DAYS", "3 WK", "2 MO", "1 YR") and a spoken label. */
function timeMarks(memory: Composition, today: Date): Pick<ResurfacedMemory, 'tick' | 'label' | 'isAnniversary'> {
  const then = new Date(memory.createdAt);
  const years = today.getFullYear() - then.getFullYear();
  const sameDay = then.getMonth() === today.getMonth() && then.getDate() === today.getDate();
  if (sameDay && years > 0) {
    return {
      tick: `${years} YR`,
      label: years === 1 ? '1 year ago today' : `${years} years ago today`,
      isAnniversary: true,
    };
  }
  const days = Math.max(1, Math.round((today.getTime() - memory.createdAt) / DAY_MS));
  if (days < 14) return { tick: days === 1 ? '1 DAY' : `${days} DAYS`, label: `${days} days ago`, isAnniversary: false };
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return { tick: `${weeks} WK`, label: `${weeks} weeks ago`, isAnniversary: false };
  }
  if (days < 365) {
    const months = Math.round(days / 30.4);
    return { tick: `${months} MO`, label: `${months} months ago`, isAnniversary: false };
  }
  const y = Math.max(1, Math.round(days / 365.25));
  return { tick: `${y} YR`, label: y === 1 ? '1 year ago' : `${y} years ago`, isAnniversary: false };
}

/**
 * Content identity for a memory's lead media. Captures are copied in under
 * fresh names, so the same video recorded twice has two URIs; type plus file
 * size catches those repeats where comparing paths cannot.
 */
async function mediaIdentity(memory: Composition): Promise<string | null> {
  const lead = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  if (!lead) return null;
  try {
    const info = await FileSystem.getInfoAsync(lead.uri);
    if (info.exists && typeof info.size === 'number') return `${lead.type}:${info.size}`;
  } catch {
    // Unreadable file: fall back to its path.
  }
  return `${lead.type}:${lead.uri}`;
}

/**
 * Today's strip of past moments. Candidates are taken in tier priority
 * (years ago today, a month ago, a week ago, then a day-seeded mix of older
 * memories), photos/videos first, with at most one moment per day and no
 * repeated media. The final strip runs from the most recent moment back.
 */
export async function findPastMoments(
  today: Date = new Date(),
  { max = 8, min = 3 }: { max?: number; min?: number } = {},
): Promise<ResurfacedMemory[]> {
  const tiers = await loadTiers(today);
  const days = new Set<string>();
  const media = new Set<string>();
  const texts = new Set<string>();
  const visual: ResurfacedMemory[] = [];
  const words: ResurfacedMemory[] = [];

  for (let index = 0; index < tiers.length && visual.length < max; index++) {
    const tier = tiers[index];
    // The open-ended "older" tier is shuffled per day; dated tiers keep order.
    const pool = index === tiers.length - 1 ? seededShuffle(tier.memories, today) : tier.memories;
    for (const memory of pool) {
      if (visual.length >= max) break;
      const day = toDayKey(new Date(memory.createdAt));
      if (days.has(day)) continue;

      const moment: ResurfacedMemory = { memory, ...timeMarks(memory, today) };
      if (hasVisualMedia(memory)) {
        const identity = await mediaIdentity(memory);
        if (identity && media.has(identity)) continue;
        if (identity) media.add(identity);
        days.add(day);
        visual.push(moment);
      } else {
        const text = memory.textContent.trim().toLowerCase();
        if (!text || texts.has(text)) continue;
        texts.add(text);
        words.push(moment);
      }
    }
  }

  const strip = [...visual];
  for (const moment of words) {
    if (strip.length >= min) break;
    const day = toDayKey(new Date(moment.memory.createdAt));
    if (days.has(day)) continue;
    days.add(day);
    strip.push(moment);
  }
  return strip.sort((a, b) => b.memory.createdAt - a.memory.createdAt);
}
