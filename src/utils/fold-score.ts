/**
 * Fold Score maths — pure functions over the journal's memory signals.
 * See constants/fold-score.ts for what earns points.
 */

import { SCORE_FACTORS, WORDS_MIN_CHARS, type ScoreFactorId } from '@/constants/fold-score';
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
export type DayEarned = Record<ScoreFactorId, number>;

export interface FoldScore {
  total: number;
  /** Points earned today. */
  today: number;
  todayEarned: DayEarned;
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

export function earnedOn(day: DayActivity | undefined): DayEarned {
  const earned: DayEarned = {
    day: day ? 1 : 0,
    moments: day ? day.moments.size : 0,
    words: day?.wrote ? 1 : 0,
    photo: day?.photographed ? 1 : 0,
  };
  for (const factor of SCORE_FACTORS) earned[factor.id] = Math.min(earned[factor.id], factor.perDay);
  return earned;
}

function pointsFor(earned: DayEarned): number {
  return SCORE_FACTORS.reduce((sum, factor) => sum + earned[factor.id] * factor.points, 0);
}

export function computeFoldScore(days: Map<string, DayActivity>, todayKey: string): FoldScore {
  let total = 0;
  for (const day of days.values()) total += pointsFor(earnedOn(day));
  const todayEarned = earnedOn(days.get(todayKey));
  return { total, today: pointsFor(todayEarned), todayEarned };
}
