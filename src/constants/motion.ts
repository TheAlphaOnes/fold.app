/**
 * Motion tokens — Maya design-system curves and durations.
 *
 *   ease-out     entrances: arrives fast, settles gently
 *   ease-in      exits: builds momentum, leaves quickly (always faster than entry)
 *   ease-in-out  guided moves between two states
 *   spring       user-input reactions; a slight overshoot reads as physical
 *
 * Choreography rule for this app: compound motion is split into segments that
 * finish at different rates (e.g. opacity resolves before position), so
 * transitions feel alive rather than one uniform fade.
 */

import { Easing, Keyframe } from 'react-native-reanimated';

/** Timing-function factories for withTiming / layout animations. */
export const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);
export const EASE_IN = Easing.bezier(0.55, 0.05, 0.68, 0.19);
export const EASE_IN_OUT = Easing.bezier(0.455, 0.03, 0.515, 0.955);
export const SPRING_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);

/** Plain worklet curves for driving segmented timelines by hand. */
export const curve = {
  out: Easing.bezierFn(0.19, 1, 0.22, 1),
  in: Easing.bezierFn(0.55, 0.05, 0.68, 0.19),
  inOut: Easing.bezierFn(0.455, 0.03, 0.515, 0.955),
  bounce: Easing.bezierFn(0.34, 1.56, 0.64, 1),
} as const;

export const DURATION = {
  press: 120,
  small: 200,
  panel: 240,
  modal: 280,
  exit: 140,
  page: 320,
} as const;

/** Gesture spring: interruptible, settles without visible wobble. */
export const SPRING_GESTURE = { damping: 18, stiffness: 240, mass: 0.9 } as const;

/**
 * Progress (0..1) of one segment of a looping or one-shot timeline.
 * `t` and `start` are in ms; the result is eased.
 */
export function segment(t: number, start: number, duration: number, ease: (v: number) => number): number {
  'worklet';
  const raw = (t - start) / duration;
  const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return ease(clamped);
}

/** Fade + rise entrance, for staggered text blocks. Respects system reduced motion. */
export function riseIn(duration: number, delay = 0, distance = 10) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: distance }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .duration(duration)
    .delay(delay);
}

/** Pure opacity entrance. */
export function fadeIn(duration: number, delay = 0) {
  return new Keyframe({
    0: { opacity: 0 },
    100: { opacity: 1, easing: EASE_OUT },
  })
    .duration(duration)
    .delay(delay);
}

/** Quick exit — faster than any entrance, eased in. */
export function fadeOut(duration: number = DURATION.exit) {
  return new Keyframe({
    0: { opacity: 1 },
    100: { opacity: 0, easing: EASE_IN },
  }).duration(duration);
}

/** Exit that drifts up while fading, for replaced labels. */
export function liftOut(duration: number = DURATION.exit, distance = 6) {
  return new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: -distance }], easing: EASE_IN },
  }).duration(duration);
}
