/**
 * The orange key's gestures and the hint that teaches them. The key does
 * three things (tap: write, hold: voice note, swipe up: camera) and nothing
 * on it says so; the line above it cycles through the ones not used yet.
 * Pure, so it's tested.
 */

export type KeyGesture = 'tap' | 'hold' | 'swipe';

export const KEY_GESTURES: readonly KeyGesture[] = ['tap', 'hold', 'swipe'];

/** One short line each, in the date line's lowercase mono voice. */
export const KEY_HINTS: Record<KeyGesture, string> = {
  tap: 'tap · write',
  hold: 'hold · voice note',
  swipe: 'swipe up · camera',
};

/** How long the date shows before the first hint and between hints, and how long a hint stays. */
export const HINT_FIRST_MS = 2400;
export const HINT_GAP_MS = 5200;
export const HINT_SHOW_MS = 3400;

/**
 * Gestures still to learn: only using it on the key counts. (Guide missions
 * don't: a voice note or photo added in the composer says nothing about
 * knowing the key's hold or swipe.)
 */
export function unlearnedGestures(used: Record<KeyGesture, boolean>): KeyGesture[] {
  return KEY_GESTURES.filter((g) => !used[g]);
}

/** The next hint after `last`, going round the ones left (null when all are known). */
export function nextHint(unlearned: KeyGesture[], last: KeyGesture | null): KeyGesture | null {
  if (unlearned.length === 0) return null;
  if (!last) return unlearned[0];
  const i = unlearned.indexOf(last);
  return unlearned[(i + 1) % unlearned.length];
}
