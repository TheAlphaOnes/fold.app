/**
 * Widget model: the shared, pure helpers widgets build their props from.
 *
 * Widget components run in an isolated runtime and only draw the props
 * they're handed, so everything a widget decides (which memory, which
 * words, how long ago) belongs here or in the widget's own builder, where
 * it can be tested. Props must be flat and JSON-safe: they cross into the
 * widget runtime serialized, so dates travel as epoch milliseconds.
 */

import type { Composition, MediaElement } from '@/types/journal';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** A still photo a widget can show (videos, GIF stickers and stamps can't render there). */
export function isWidgetPhoto(media: MediaElement): boolean {
  return media.type === 'image' && !media.isGif && !media.isStamp;
}

/** The memory's first still photo, if it has one. */
export function photoOf(memory: Composition): MediaElement | undefined {
  return memory.mediaElements.find(isWidgetPhoto);
}

/** The memory's words on one line, cut short enough for a widget. */
export function wordsOf(memory: Composition, max = 120): string {
  const words = memory.textContent.trim().replace(/\s+/g, ' ');
  return words.length > max ? `${words.slice(0, max).trimEnd()}…` : words;
}

/** Can a widget show this memory at all: a photo, or words to set in type. */
export function isShowable(memory: Composition): boolean {
  return photoOf(memory) !== undefined || wordsOf(memory) !== '';
}

/** "12 nov 2025" */
export function longDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Local midnight that ends the day `date` falls in. */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** How long ago `then` was, as of `now`, in the app's lowercase voice. */
export function howLongAgo(then: number, now: Date): string {
  const t = new Date(then);
  const sameDate = t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
  const years = now.getFullYear() - t.getFullYear();
  if (sameDate && years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
  const days = Math.floor((endOfDay(now).getTime() - endOfDay(t).getTime()) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const y = Math.floor(days / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}
