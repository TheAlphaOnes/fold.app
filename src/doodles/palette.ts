/**
 * Doodle inks. A doodle's structure is drawn in `ink` (the theme's text
 * colour, so it flips with dark and light); colour goes only where it
 * counts. Every colour is mid-toned so it reads on Fold's near-black and on
 * white alike.
 */

export const INKS = {
  /** The theme's own ink: outlines and structure. */
  ink: null,
  red: '#E5534B',
  orange: '#F27A1A',
  amber: '#E3A21A',
  green: '#4FA45B',
  teal: '#2BA39B',
  blue: '#4A7BEA',
  sky: '#6CB4EE',
  plum: '#9A6AD6',
  pink: '#E86FA8',
  brown: '#A8743F',
  rose: '#F58FB0',
  peach: '#F4A58A',
  lavender: '#B49CF0',
  mint: '#6FD3B4',
  butter: '#F2CF5B',
} as const;

export type Ink = keyof typeof INKS;

/** Touches that keep their own colour on a one-hue doodle (blush, sparkles' warmth). */
const ACCENTS: readonly Ink[] = ['rose'];

/**
 * A doodle's hue: the colour most of its lines are drawn in. Structure
 * lines take it too, so each doodle reads as one fine-liner colour.
 */
export function hueOf(strokes: readonly { ink: Ink; points: readonly number[] }[]): Ink {
  const weight = new Map<Ink, number>();
  for (const s of strokes) {
    if (s.ink === 'ink' || ACCENTS.includes(s.ink)) continue;
    weight.set(s.ink, (weight.get(s.ink) ?? 0) + s.points.length);
  }
  let best: Ink = 'blue';
  let most = 0;
  for (const [ink, w] of weight) if (w > most) [best, most] = [ink, w];
  return best;
}

/** The hex a stroke draws in on a one-hue doodle. */
export function strokeHex(ink: Ink, hue: Ink): string {
  return (ink === 'ink' ? INKS[hue] : INKS[ink]) ?? '#4A7BEA';
}
