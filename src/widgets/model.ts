/**
 * Widget model — what each home and lock screen widget shows, derived from
 * the journal. Pure, so it's tested: the sync layer gathers memories and
 * copies photos, these functions decide what appears and when it changes,
 * and the widgets' isolated runtimes only draw the props they are handed.
 *
 *   On This Day    a memory from this date in another year, else one you've
 *                  forgotten; a few picks a day, each until the next
 *   Today          has anything been kept today? a nudge with the hours
 *                  left, or today's memory with the streak
 *   Contact Sheet  this week as a film strip (medium), this month as a
 *                  photo calendar (large)
 *
 * Props are flat and JSON-safe (dates travel as epoch milliseconds): they
 * cross into a separate runtime as serialized data.
 */

import { dayLine } from '@/home/today';
import { addDays, toDayKey } from '@/utils/format-date';
import type { Composition, MediaElement } from '@/types/journal';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const LETTERS = ['s', 'm', 't', 'w', 't', 'f', 's'];

// ─── Shared ──────────────────────────────────────────────────────────────

/** A still photo that can stand alone (videos, GIF stickers and stamps can't render in a widget). */
export function isWidgetPhoto(media: MediaElement): boolean {
  return media.type === 'image' && !media.isGif && !media.isStamp;
}

/** The memory's first still photo, if it has one. */
export function photoOf(memory: Composition): MediaElement | undefined {
  return memory.mediaElements.find(isWidgetPhoto);
}

/** The memory's words, on one line and kept short enough for a widget. */
export function wordsOf(memory: Composition, max = 120): string {
  const words = memory.textContent.trim().replace(/\s+/g, ' ');
  return words.length > max ? `${words.slice(0, max).trimEnd()}…` : words;
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

/** Can a widget show this memory at all: a photo, or words to set in type. */
export function isShowable(memory: Composition): boolean {
  return photoOf(memory) !== undefined || wordsOf(memory) !== '';
}

// ─── On This Day ─────────────────────────────────────────────────────────

/** A memory a widget can show, already reduced to what it draws. */
export interface WidgetMemory {
  id: number;
  createdAt: number;
  /** file:// URI of the photo's widget copy; '' for a words-only memory. */
  uri: string;
  /** The memory's words ('' when it has none). */
  words: string;
  /** Where it was kept ('' when unknown). */
  place: string;
}

/** Props for one entry of the On This Day widget. */
export interface OnThisDayProps {
  /** Nothing to show yet: the journal is empty (or holds nothing showable). */
  empty: boolean;
  id: number;
  uri: string;
  words: string;
  place: string;
  /** "1 year ago" — on this very date — or "3 months ago" for a forgotten one. */
  when: string;
  /** "12 nov 2025" */
  date: string;
  /** True when the memory is from this calendar date. */
  anniversary: boolean;
}

export const EMPTY_ON_THIS_DAY: OnThisDayProps = { empty: true, id: 0, uri: '', words: '', place: '', when: '', date: '', anniversary: false };

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

/** True when `memory` falls on the same month and date as `day`, in an earlier year. */
export function isAnniversaryOf(createdAt: number, day: Date): boolean {
  const t = new Date(createdAt);
  return t.getMonth() === day.getMonth() && t.getDate() === day.getDate() && t.getFullYear() < day.getFullYear();
}

/** How often On This Day turns to its next pick, in hours. */
export const ON_THIS_DAY_STEP_HOURS = 3;
/** How many picks one pushed timeline carries (a day's worth). */
export const ON_THIS_DAY_ENTRIES = 8;

/**
 * On This Day's timeline: one pick every few hours for a day. Each entry
 * prefers memories from its own calendar date in earlier years (so the
 * pool changes at midnight), photos before words, and falls back to
 * forgotten memories — older than a fortnight — when the date has none.
 * The same memory never shows twice in a row.
 */
export function buildOnThisDayTimeline(
  memories: readonly WidgetMemory[],
  now: Date,
  stepHours: number = ON_THIS_DAY_STEP_HOURS,
  count: number = ON_THIS_DAY_ENTRIES,
): { date: Date; props: OnThisDayProps }[] {
  if (memories.length === 0) return [{ date: now, props: EMPTY_ON_THIS_DAY }];
  const byPhotoFirst = (a: WidgetMemory, b: WidgetMemory) => Number(b.uri !== '') - Number(a.uri !== '') || a.createdAt - b.createdAt;
  const used = new Map<string, number>();
  let previous = -1;

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getTime() + index * stepHours * 60 * 60 * 1000);
    const anniversaries = memories.filter((m) => isAnniversaryOf(m.createdAt, date)).sort(byPhotoFirst);
    const forgotten = memories.filter((m) => date.getTime() - m.createdAt > 14 * DAY_MS).sort(byPhotoFirst);
    const pool = anniversaries.length > 0 ? anniversaries : forgotten.length > 0 ? forgotten : [...memories].sort(byPhotoFirst);
    // Walk each pool in turn; each day's anniversaries start afresh.
    const poolKey = anniversaries.length > 0 ? toDayKey(date) : 'fallback';
    let cursor = used.get(poolKey) ?? 0;
    let pick = pool[cursor % pool.length];
    if (pool.length > 1 && pick.id === previous) {
      cursor += 1;
      pick = pool[cursor % pool.length];
    }
    used.set(poolKey, cursor + 1);
    previous = pick.id;
    return {
      date,
      props: {
        empty: false,
        id: pick.id,
        uri: pick.uri,
        words: pick.words,
        place: pick.place,
        when: howLongAgo(pick.createdAt, date),
        date: longDate(pick.createdAt),
        anniversary: isAnniversaryOf(pick.createdAt, date),
      },
    };
  });
}

// ─── Today ───────────────────────────────────────────────────────────────

/** Props for one entry of the Today widget. */
export interface TodayProps {
  /** Something has been kept today. */
  kept: boolean;
  /** Today's newest memory, when kept. */
  id: number;
  uri: string;
  words: string;
  /** How many memories today holds. */
  count: number;
  /** The streak as of this entry (alive through today until midnight). */
  streak: number;
  best: number;
  /** The line for the time of day ("golden hour, almost"). */
  line: string;
  /** Epoch ms of the midnight that ends this entry's day, for the live countdown. */
  endsAt: number;
}

/** The hours the day line changes at (see `dayLine`). */
const DAY_PARTS = [5, 11, 16, 20];

/**
 * Today's timeline, from now through the end of tomorrow: an entry each
 * time the day line changes, and at each midnight, where the page turns —
 * nothing is kept yet, and a streak that wasn't extended today is gone.
 */
export function buildTodayTimeline(
  now: Date,
  today: { id: number; uri: string; words: string; count: number } | null,
  streak: { current: number; best: number },
): { date: Date; props: TodayProps }[] {
  const entries: { date: Date; props: TodayProps }[] = [];
  const push = (date: Date, kept: boolean, current: number) => {
    entries.push({
      date,
      props: {
        kept,
        id: kept && today ? today.id : 0,
        uri: kept && today ? today.uri : '',
        words: kept && today ? today.words : '',
        count: kept && today ? today.count : 0,
        streak: current,
        best: Math.max(streak.best, current),
        line: dayLine(date),
        endsAt: endOfDay(date).getTime(),
      },
    });
  };

  const changesOn = (day: Date, after: Date) =>
    DAY_PARTS.map((h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h)).filter((d) => d > after);

  const kept = today !== null;
  push(now, kept, streak.current);
  for (const d of changesOn(now, now)) push(d, kept, streak.current);

  // Tomorrow: a fresh page. A streak kept today survives through it; one
  // that wasn't is broken at midnight.
  const tomorrow = endOfDay(now);
  const carried = kept ? streak.current : 0;
  push(tomorrow, false, carried);
  for (const d of changesOn(tomorrow, tomorrow)) push(d, false, carried);
  // The day after: an unkept tomorrow breaks the streak too.
  push(endOfDay(tomorrow), false, 0);
  return entries;
}

// ─── Contact Sheet ───────────────────────────────────────────────────────

/** What a day holds, for the contact sheet. */
export interface DayCover {
  /** file:// URI of the day's photo copy ('' when the day has only words). */
  uri: string;
  /** How many memories the day holds. */
  count: number;
}

/** One frame of the contact sheet. */
export interface SheetDay {
  /** "YYYY-MM-DD", for the Time Machine link. */
  key: string;
  /** Day of the month. */
  day: number;
  /** "m", "t" … */
  letter: string;
  uri: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
  /** Belongs to the month on show (the calendar pads with neighbours). */
  inMonth: boolean;
}

/** Props for one entry of the Contact Sheet widget. */
export interface SheetProps {
  /** "november" */
  month: string;
  year: number;
  /** Monday to Sunday of the week holding the entry's date. */
  week: SheetDay[];
  /** The month, in whole Monday-to-Sunday weeks (5 or 6 rows of 7). */
  calendar: SheetDay[];
  /** Days kept this week / this month, up to today. */
  keptWeek: number;
  keptMonth: number;
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Monday of the week `date` falls in. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(d, -((d.getDay() + 6) % 7));
}

function sheetDay(date: Date, today: Date, covers: Readonly<Record<string, DayCover>>, month: number): SheetDay {
  const key = toDayKey(date);
  const todayKey = toDayKey(today);
  const cover = covers[key];
  return {
    key,
    day: date.getDate(),
    letter: LETTERS[date.getDay()],
    uri: cover?.uri ?? '',
    count: cover?.count ?? 0,
    isToday: key === todayKey,
    isFuture: key > todayKey,
    inMonth: date.getMonth() === month,
  };
}

/** The contact sheet as of `today`: its week strip and its month calendar. */
export function buildSheet(today: Date, covers: Readonly<Record<string, DayCover>>): SheetProps {
  const month = today.getMonth();
  const monday = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => sheetDay(addDays(monday, i), today, covers, month));

  const first = new Date(today.getFullYear(), month, 1);
  const last = new Date(today.getFullYear(), month + 1, 0);
  const start = mondayOf(first);
  const rows = Math.ceil((Math.round((last.getTime() - start.getTime()) / DAY_MS) + 1) / 7);
  const calendar = Array.from({ length: rows * 7 }, (_, i) => sheetDay(addDays(start, i), today, covers, month));

  const kept = (days: SheetDay[]) => days.filter((d) => d.count > 0 && !d.isFuture).length;
  return {
    month: MONTH_NAMES[month],
    year: today.getFullYear(),
    week,
    calendar,
    keptWeek: kept(week),
    keptMonth: kept(calendar.filter((d) => d.inMonth)),
  };
}

/** The sheet's timeline: now, and each of the next two midnights, where "today" moves on. */
export function buildSheetTimeline(now: Date, covers: Readonly<Record<string, DayCover>>): { date: Date; props: SheetProps }[] {
  const tomorrow = endOfDay(now);
  const after = endOfDay(tomorrow);
  return [now, tomorrow, after].map((date) => ({ date, props: buildSheet(date, covers) }));
}

/** The day keys a sheet built on `today` (or the next two days) can show, for fetching covers. */
export function sheetMonths(today: Date): string[] {
  const keys = new Set<string>();
  for (const d of [mondayOf(today), today, addDays(mondayOf(today), 13), addDays(today, 2)]) {
    keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...keys];
}
