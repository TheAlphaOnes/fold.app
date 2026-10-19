/**
 * Moments — the day split into morning, afternoon and evening. The Fold
 * Score counts each one captured, and each gets one quiet reminder.
 */

export type MomentId = 'morning' | 'afternoon' | 'evening';

export interface Moment {
  id: MomentId;
  /** Local hours the moment covers, [start, end). Together they cover the whole day. */
  startHour: number;
  endHour: number;
  /** The reminder lands at a random minute in this window, different each day. */
  nudgeFromHour: number;
  nudgeToHour: number;
  nudge: string;
}

export const MOMENTS: readonly Moment[] = [
  {
    id: 'morning',
    startHour: 0,
    endHour: 12,
    nudgeFromHour: 8,
    nudgeToHour: 11,
    nudge: 'one frame from your morning?',
  },
  {
    id: 'afternoon',
    startHour: 12,
    endHour: 17,
    nudgeFromHour: 13,
    nudgeToHour: 16,
    nudge: 'what does right now look like?',
  },
  {
    id: 'evening',
    startHour: 17,
    endHour: 24,
    nudgeFromHour: 18,
    nudgeToHour: 21,
    nudge: 'a small piece of tonight, if you like.',
  },
];

export function momentAt(date: Date): Moment {
  const hour = date.getHours();
  return MOMENTS.find((m) => hour >= m.startHour && hour < m.endHour) ?? MOMENTS[MOMENTS.length - 1];
}
