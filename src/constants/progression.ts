/**
 * Progression — three moments a day. Capture something in the morning, the
 * afternoon and the evening; each one is stamped, all three make a full day.
 * Kept as data so the board, the stamp and the reminders read one table.
 */

export type MomentId = 'morning' | 'afternoon' | 'evening';

export interface Moment {
  id: MomentId;
  label: string;
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
    label: 'MORNING',
    startHour: 0,
    endHour: 12,
    nudgeFromHour: 8,
    nudgeToHour: 11,
    nudge: 'What does your morning look like? Snap it.',
  },
  {
    id: 'afternoon',
    label: 'AFTERNOON',
    startHour: 12,
    endHour: 17,
    nudgeFromHour: 13,
    nudgeToHour: 16,
    nudge: "Show what you're doing right now.",
  },
  {
    id: 'evening',
    label: 'EVENING',
    startHour: 17,
    endHour: 24,
    nudgeFromHour: 18,
    nudgeToHour: 21,
    nudge: "How's the evening going? One photo.",
  },
];

export type MomentsDone = Record<MomentId, boolean>;

export const NO_MOMENTS: MomentsDone = { morning: false, afternoon: false, evening: false };

export function momentAt(date: Date): Moment {
  const hour = date.getHours();
  return MOMENTS.find((m) => hour >= m.startHour && hour < m.endHour) ?? MOMENTS[MOMENTS.length - 1];
}

export function getMoment(id: MomentId): Moment {
  return MOMENTS.find((m) => m.id === id) ?? MOMENTS[0];
}

export function countDone(done: MomentsDone): number {
  return MOMENTS.filter((m) => done[m.id]).length;
}

/** A stamp queued for the reward overlay, played in order on the home screen. */
export type Reward = {
  id: string;
  kind: 'moment';
  moment: MomentId;
  /** Moments done today, including this one. */
  done: number;
  /** The next moment still open later today, if any. */
  next: MomentId | null;
  /** Continuum length including today. */
  streak: number;
};
