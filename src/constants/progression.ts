/**
 * Moments — the day split into morning, afternoon and evening. Ink counts
 * each one captured.
 */

export type MomentId = 'morning' | 'afternoon' | 'evening';

export interface Moment {
  id: MomentId;
  /** Local hours the moment covers, [start, end). Together they cover the whole day. */
  startHour: number;
  endHour: number;
}

export const MOMENTS: readonly Moment[] = [
  {
    id: 'morning',
    startHour: 0,
    endHour: 12,
  },
  {
    id: 'afternoon',
    startHour: 12,
    endHour: 18,
  },
  {
    id: 'evening',
    startHour: 18,
    endHour: 24,
  },
];

export function momentAt(date: Date): Moment {
  const hour = date.getHours();
  return MOMENTS.find((m) => hour >= m.startHour && hour < m.endHour) ?? MOMENTS[MOMENTS.length - 1];
}
