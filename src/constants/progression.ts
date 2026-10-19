/**
 * Moments — the day split into morning, afternoon and evening. Ink counts
 * each one captured, and each gets one reminder a day.
 */

export type MomentId = 'morning' | 'afternoon' | 'evening';

/**
 * One wording of a reminder. Each moment has several, plain and playful
 * mixed, rotated day to day.
 */
export interface Nudge {
  title: string;
  body: string;
}

export interface Moment {
  id: MomentId;
  /** Local hours the moment covers, [start, end). Together they cover the whole day. */
  startHour: number;
  endHour: number;
  /** The reminder lands at a random minute in this window, different each day. */
  nudgeFromHour: number;
  nudgeToHour: number;
  /** Wording only ever sent inside this moment, so it always fits the time. */
  nudges: readonly Nudge[];
}

export const MOMENTS: readonly Moment[] = [
  {
    id: 'morning',
    startHour: 0,
    endHour: 12,
    nudgeFromHour: 8,
    nudgeToHour: 11,
    nudges: [
      { title: 'Good morning', body: 'Snap the first frame of your day.' },
      { title: 'Morning check-in', body: "What's in front of you right now? Take one photo." },
      { title: 'Start today’s page', body: 'One photo of this morning. Tap to open the camera.' },
      { title: 'Rise and shine (or don’t)', body: 'Even a messy bed deserves a photo.' },
      { title: 'Coffee first?', body: 'Fine. Then snap the coffee.' },
      { title: 'Your morning called', body: 'It wants a picture. Don’t leave it on read.' },
      { title: 'Plot twist', body: 'Today’s story starts with one photo. Yours.' },
    ],
  },
  {
    id: 'afternoon',
    startHour: 12,
    endHour: 18,
    nudgeFromHour: 13,
    nudgeToHour: 17,
    nudges: [
      { title: 'Afternoon check-in', body: "What are you up to? Snap it." },
      { title: 'Midday frame', body: 'Show what your afternoon looks like in one photo.' },
      { title: 'Quick one', body: "Tap and capture what you're doing right now." },
      { title: 'Caught you', body: 'Doing something? Doing nothing? Snap it either way.' },
      { title: 'Lunch looked good', body: 'Did it though? Prove it.' },
      { title: 'Afternoon slump detected', body: 'Cure: one photo. Doctor’s orders.' },
      { title: 'Hey, you', body: 'Yes, you. What’s happening right now?' },
    ],
  },
  {
    id: 'evening',
    startHour: 18,
    endHour: 24,
    nudgeFromHour: 18,
    nudgeToHour: 21,
    nudges: [
      { title: 'Evening check-in', body: 'How did today go? Snap one frame.' },
      { title: 'Before the day ends', body: 'Catch this evening in one photo.' },
      { title: 'Today’s last page', body: 'One photo of your evening. Tap to open the camera.' },
      { title: 'Main character energy', body: 'End today’s episode with one frame.' },
      { title: 'Day’s almost wrapped', body: 'Don’t let it leave without a photo.' },
      { title: 'Spill the tea', body: 'How was today? Your journal is listening.' },
      { title: 'Lights low?', body: 'Catch tonight before it slips away.' },
    ],
  },
];

export function momentAt(date: Date): Moment {
  const hour = date.getHours();
  return MOMENTS.find((m) => hour >= m.startHour && hour < m.endHour) ?? MOMENTS[MOMENTS.length - 1];
}
