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
} as const;

export type Ink = keyof typeof INKS;
