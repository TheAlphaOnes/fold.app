/**
 * Today's Stamp — the snapshot that drives the home screen widget.
 *
 * Pure by design: it folds the same active-day set the Continuum uses into
 * the small, serializable props the widget's isolated runtime can render.
 * The widget cannot drift from the profile's numbers because both read the
 * same `activeDays` and the same `computeStreak`.
 *
 * The dopamine cycle lives in `snapshotAfterMidnight`: every night the
 * stamp resets itself, so each morning the widget is an open, unclaimed
 * seal — until a memory is folded and it fills again.
 */

import { addDays, toDayKey } from '@/utils/format-date';
import { computeStreak } from '@/utils/streak';

/** One cell of the seven-day strip: a day that was folded, or not. */
export interface StampDayCell {
  claimed: boolean;
  /** Only the strip's last cell is today. */
  isToday: boolean;
  /** Weekday initial: "M", "T", "W"... */
  label: string;
}

/** Everything the widget renders; JSON-serializable so it can cross into the widget runtime. */
export interface StampSnapshot {
  /** The last seven local days, oldest first. */
  days: StampDayCell[];
  /** Consecutive days ending today (or yesterday while today is still open). */
  streak: number;
  todayClaimed: boolean;
  /** The stamp's serial — the memory just folded, or the one waiting. */
  serial: string;
  /** State line — the day's emotional read. */
  title: string;
  /** The nudge under it. */
  sub: string;
}

/** How many trailing days the strip shows. */
const STRIP_LENGTH = 7;

/** "S", "M", "T", "W", "T", "F", "S" — indexed by `Date.getDay()`. */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Local midnight after `now`: the moment today's stamp resets. */
export function nextMidnight(now: Date): Date {
  const tomorrow = addDays(now, 1);
  return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
}

/**
 * The serial of the day's stamp: today's memory when the day is claimed,
 * the next one waiting when it is not. Either way it only ever grows.
 */
function stampSerial(memoryCount: number, todayClaimed: boolean): string {
  const ordinal = todayClaimed ? memoryCount : memoryCount + 1;
  return `No. ${String(ordinal).padStart(3, '0')}`;
}

/** The day's state copy, in the app's own voice. */
function stateCopy(streak: number, todayClaimed: boolean): Pick<StampSnapshot, 'title' | 'sub'> {
  const day = String(streak).padStart(2, '0');
  if (todayClaimed) return { title: `day ${day} stamped`, sub: 'the streak holds' };
  if (streak > 0) return { title: `day ${day} at stake`, sub: 'fold one to keep it going' };
  return { title: 'today is open', sub: 'fold one memory to begin' };
}

/** The last `STRIP_LENGTH` local days ending at `now`, oldest first. */
function stripFor(activeDays: ReadonlySet<string>, now: Date): StampDayCell[] {
  const cells: StampDayCell[] = [];
  for (let back = STRIP_LENGTH - 1; back >= 0; back -= 1) {
    const day = addDays(now, -back);
    cells.push({
      claimed: activeDays.has(toDayKey(day)),
      isToday: back === 0,
      label: WEEKDAY_INITIALS[day.getDay()],
    });
  }
  return cells;
}

/** Folds the journal's active days into the props the widget renders. */
export function buildStampSnapshot(input: {
  activeDays: ReadonlySet<string>;
  memoryCount: number;
  now?: Date;
}): StampSnapshot {
  const now = input.now ?? new Date();
  const streak = computeStreak(input.activeDays, now).current;
  const todayClaimed = input.activeDays.has(toDayKey(now));
  return {
    days: stripFor(input.activeDays, now),
    streak,
    todayClaimed,
    serial: stampSerial(input.memoryCount, todayClaimed),
    ...stateCopy(streak, todayClaimed),
  };
}

/**
 * The snapshot to schedule for tonight's midnight, assuming no further
 * saves: today's stamp resets, the strip rolls forward one day, and the
 * streak carries only if today was claimed. This is the cycle's heartbeat —
 * the widget empties itself on schedule even if the app never opens.
 */
export function snapshotAfterMidnight(
  snapshot: StampSnapshot,
  now: Date = new Date(),
): StampSnapshot {
  const carriedStreak = snapshot.todayClaimed ? snapshot.streak : 0;
  const rolled: StampDayCell[] = [
    ...snapshot.days.slice(1).map((cell) => ({ ...cell, isToday: false })),
    { claimed: false, isToday: true, label: WEEKDAY_INITIALS[addDays(now, 1).getDay()] },
  ];
  return {
    days: rolled,
    streak: carriedStreak,
    todayClaimed: false,
    serial: snapshot.serial,
    ...stateCopy(carriedStreak, false),
  };
}
