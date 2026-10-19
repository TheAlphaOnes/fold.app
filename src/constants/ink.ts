/**
 * Ink — the monthly number on the Continuum card. Every genuine day inks
 * the month a little; it starts again empty on the 1st, and the best month
 * ever stands as the record.
 *
 * Points are earned per day, never per memory, so saving ten empty cards
 * is worth no more than saving one real one. Each factor is earned at most
 * once a day, except moments: morning, afternoon and evening each count.
 */

export type InkFactorId = 'day' | 'moments' | 'words' | 'photo';

export interface InkFactor {
  id: InkFactorId;
  label: string;
  /** Points for earning the factor once. */
  points: number;
  /** How many times a day it can be earned. */
  perDay: number;
}

export const INK_FACTORS: readonly InkFactor[] = [
  { id: 'day', label: 'SHOW UP', points: 10, perDay: 1 },
  { id: 'moments', label: 'MOMENTS', points: 5, perDay: 3 },
  { id: 'words', label: 'WORDS', points: 5, perDay: 1 },
  { id: 'photo', label: 'PHOTO', points: 5, perDay: 1 },
];

/** A memory counts as written once it holds at least this many characters. */
export const WORDS_MIN_CHARS = 40;
