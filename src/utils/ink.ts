/**
 * Ink maths — pure functions over the journal's memory signals.
 * See constants/ink.ts for what earns ink.
 */

import { INK_FACTORS, WORDS_MIN_CHARS, type InkFactorId } from '@/constants/ink';
import { momentAt, type MomentId } from '@/constants/progression';
import type { MemorySignal } from '@/db/journal-repository';
import { toDayKey } from '@/utils/format-date';

/** What happened on one local day. */
export interface DayActivity {
  moments: Set<MomentId>;
  wrote: boolean;
  photographed: boolean;
}

/** How many times each factor was earned on a day, already capped. */
type DayEarned = Record<InkFactorId, number>;

export interface InkSummary {
  /** YYYY-MM of the month being counted. */
  monthKey: string;
  /** Ink earned so far this month. */
  month: number;
  /** The most ink any month has held, this one included. */
  record: number;
}

/** Groups memories by local day (YYYY-MM-DD). */
export function groupByDay(signals: MemorySignal[]): Map<string, DayActivity> {
  const days = new Map<string, DayActivity>();
  for (const signal of signals) {
    const at = new Date(signal.createdAt);
    const key = toDayKey(at);
    let day = days.get(key);
    if (!day) {
      day = { moments: new Set(), wrote: false, photographed: false };
      days.set(key, day);
    }
    day.moments.add(momentAt(at).id);
    if (signal.textLength >= WORDS_MIN_CHARS) day.wrote = true;
    if (signal.hasVisual) day.photographed = true;
  }
  return days;
}

function earnedOn(day: DayActivity | undefined): DayEarned {
  const earned: DayEarned = {
    day: day ? 1 : 0,
    moments: day ? day.moments.size : 0,
    words: day?.wrote ? 1 : 0,
    photo: day?.photographed ? 1 : 0,
  };
  for (const factor of INK_FACTORS) earned[factor.id] = Math.min(earned[factor.id], factor.perDay);
  return earned;
}

function inkFor(earned: DayEarned): number {
  return INK_FACTORS.reduce((sum, factor) => sum + earned[factor.id] * factor.points, 0);
}

/** `todayKey` is YYYY-MM-DD; its month is the one counted. */
export function computeInk(days: Map<string, DayActivity>, todayKey: string): InkSummary {
  const monthKey = todayKey.slice(0, 7);
  const byMonth = new Map<string, number>();
  for (const [dayKey, day] of days) {
    const key = dayKey.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + inkFor(earnedOn(day)));
  }
  return {
    monthKey,
    month: byMonth.get(monthKey) ?? 0,
    record: Math.max(0, ...byMonth.values()),
  };
}

export const NO_INK: InkSummary = {
  monthKey: '',
  month: 0,
  record: 0,
};
