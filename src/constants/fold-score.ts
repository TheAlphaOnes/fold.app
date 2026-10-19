/**
 * Fold Score — one number that grows with genuine use of the journal.
 *
 * Points are earned per day, never per memory, so saving ten empty cards
 * is worth no more than saving one real one. Each factor is earned at most
 * once a day, except moments: morning, afternoon and evening each count.
 */

export type ScoreFactorId = 'day' | 'moments' | 'words' | 'photo';

export interface ScoreFactor {
  id: ScoreFactorId;
  label: string;
  /** Points for earning the factor once. */
  points: number;
  /** How many times a day it can be earned. */
  perDay: number;
}

export const SCORE_FACTORS: readonly ScoreFactor[] = [
  { id: 'day', label: 'SHOW UP', points: 10, perDay: 1 },
  { id: 'moments', label: 'MOMENTS', points: 5, perDay: 3 },
  { id: 'words', label: 'WORDS', points: 5, perDay: 1 },
  { id: 'photo', label: 'PHOTO', points: 5, perDay: 1 },
];

/** A memory counts as written once it holds at least this many characters. */
export const WORDS_MIN_CHARS = 40;

export const SCORE_MAX_PER_DAY = SCORE_FACTORS.reduce((sum, f) => sum + f.points * f.perDay, 0);
