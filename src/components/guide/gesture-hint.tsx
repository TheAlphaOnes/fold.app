/**
 * GestureHint — a ghost fingertip that demonstrates a gesture on its target.
 *
 * One looping clock (ms) drives every element; each element reads its own
 * segment of that clock with its own start, length and curve. The press, the
 * ripple and the travel therefore resolve at different rates, which is what
 * makes the demo read as a real finger rather than a uniform pulse.
 *
 * Fills its parent box and centers the fingertip in it. Purely decorative:
 * pointerEvents none, hidden from screen readers (the prompt carries the copy).
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { curve, segment } from '@/constants/motion';
import type { GuideGesture } from '@/constants/guide';

const TIP = 30;
const PRESSED = 0.82;
const SWIPE_DISTANCE = 112;
const DRAG_DX = 64;
const DRAG_DY = 44;
const PINCH_SPREAD = 26;

/** Loop length per gesture, including the idle pause before it repeats. */
const LOOP_MS: Record<Exclude<GuideGesture, 'none'>, number> = {
  tap: 1900,
  'double-tap': 2200,
  hold: 2700,
  'long-press': 2700,
  'swipe-up': 2500,
  drag: 2900,
  pinch: 2600,
};

interface Timeline {
  /** Tip opacity. */
  opacity: (t: number) => number;
  /** Tip scale (press depth). */
  scale: (t: number) => number;
  /** Ripple ring scale and opacity. */
  ring: (t: number) => { scale: number; opacity: number };
  /** Tip travel from its anchor. */
  travel: (t: number) => { x: number; y: number };
}

function press(t: number, down: number, up: number): number {
  'worklet';
  // Press is a hard 90ms ease-out; the release overshoots back on a spring curve.
  const depth = segment(t, down, 90, curve.out) - segment(t, up, 170, curve.bounce);
  return 1 - depth * (1 - PRESSED);
}

function presence(t: number, outAt: number): number {
  'worklet';
  return segment(t, 0, 160, curve.out) - segment(t, outAt, 180, curve.in);
}

function ripple(t: number, start: number, duration: number) {
  'worklet';
  const p = segment(t, start, duration, curve.out);
  const visible = t >= start ? 1 : 0;
  return { scale: 1 + p * 1.2, opacity: visible * 0.55 * (1 - p) };
}

const NO_TRAVEL = { x: 0, y: 0 };
const NO_RING = { scale: 1, opacity: 0 };

const TIMELINES: Record<Exclude<GuideGesture, 'none' | 'pinch'>, Timeline> = {
  tap: {
    opacity: (t) => { 'worklet'; return presence(t, 980); },
    scale: (t) => { 'worklet'; return press(t, 280, 370); },
    ring: (t) => { 'worklet'; return ripple(t, 320, 460); },
    travel: () => { 'worklet'; return NO_TRAVEL; },
  },
  'double-tap': {
    opacity: (t) => { 'worklet'; return presence(t, 1180); },
    scale: (t) => {
      'worklet';
      return Math.min(press(t, 280, 360), press(t, 540, 620));
    },
    ring: (t) => {
      'worklet';
      return t < 540 ? ripple(t, 310, 420) : ripple(t, 570, 460);
    },
    travel: () => { 'worklet'; return NO_TRAVEL; },
  },
  hold: {
    opacity: (t) => { 'worklet'; return presence(t, 1880); },
    scale: (t) => { 'worklet'; return press(t, 280, 1560); },
    ring: (t) => {
      'worklet';
      // The ring grows slowly for the length of the hold, like a charge filling.
      const charge = segment(t, 370, 1100, curve.inOut);
      const release = segment(t, 1560, 220, curve.in);
      return { scale: 1 + charge * 0.9, opacity: (t >= 370 ? 0.5 : 0) * (1 - release) };
    },
    travel: () => { 'worklet'; return NO_TRAVEL; },
  },
  'long-press': {
    opacity: (t) => { 'worklet'; return presence(t, 1880); },
    scale: (t) => { 'worklet'; return press(t, 280, 1560); },
    ring: (t) => {
      'worklet';
      const charge = segment(t, 370, 900, curve.inOut);
      const release = segment(t, 1560, 220, curve.in);
      return { scale: 1 + charge * 0.9, opacity: (t >= 370 ? 0.5 : 0) * (1 - release) };
    },
    travel: () => { 'worklet'; return NO_TRAVEL; },
  },
  'swipe-up': {
    opacity: (t) => { 'worklet'; return presence(t, 1160); },
    scale: (t) => { 'worklet'; return press(t, 260, 1080); },
    ring: () => { 'worklet'; return NO_RING; },
    travel: (t) => {
      'worklet';
      return { x: 0, y: -SWIPE_DISTANCE * segment(t, 400, 640, curve.inOut) };
    },
  },
  drag: {
    opacity: (t) => { 'worklet'; return presence(t, 1660); },
    scale: (t) => { 'worklet'; return press(t, 260, 1500); },
    // A short ring while resting signals the "lift" before the move.
    ring: (t) => { 'worklet'; return ripple(t, 380, 360); },
    travel: (t) => {
      'worklet';
      const p = segment(t, 700, 760, curve.inOut);
      return { x: DRAG_DX * p, y: DRAG_DY * p };
    },
  },
};

function useLoopClock(gesture: GuideGesture, enabled: boolean) {
  const clock = useSharedValue(0);
  useEffect(() => {
    if (gesture === 'none' || !enabled) {
      cancelAnimation(clock);
      clock.value = 0;
      return;
    }
    const length = LOOP_MS[gesture];
    clock.value = 0;
    // Linear is correct here: the clock represents elapsed time, not motion.
    clock.value = withRepeat(withTiming(length, { duration: length, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [gesture, enabled, clock]);
  return clock;
}

interface GestureHintProps {
  gesture: GuideGesture;
  /** Hides the hint (e.g. once the user has started the gesture). */
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GestureHint({ gesture, visible = true, style }: GestureHintProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = visible && !reduceMotion;
  const clock = useLoopClock(gesture, animate);

  const visibility = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    visibility.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 140 });
  }, [visible, visibility]);

  const isPinch = gesture === 'pinch';
  const timeline = gesture !== 'none' && !isPinch ? TIMELINES[gesture] : null;

  const tipStyle = useAnimatedStyle(() => {
    if (reduceMotion || !timeline) {
      return { opacity: visibility.value * 0.9, transform: [{ scale: PRESSED }] };
    }
    const t = clock.value;
    const travel = timeline.travel(t);
    return {
      opacity: timeline.opacity(t) * visibility.value,
      transform: [{ translateX: travel.x }, { translateY: travel.y }, { scale: timeline.scale(t) }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    if (reduceMotion || !timeline) return { opacity: 0 };
    const ring = timeline.ring(clock.value);
    return { opacity: ring.opacity * visibility.value, transform: [{ scale: ring.scale }] };
  });

  // Swipe leaves a fading trail between the anchor and the tip. The bar is a
  // fixed height scaled from its bottom edge — transform only, never height.
  const trailStyle = useAnimatedStyle(() => {
    if (reduceMotion || gesture !== 'swipe-up') return { opacity: 0 };
    const t = clock.value;
    const reach = segment(t, 400, 640, curve.inOut);
    const fade = 1 - segment(t, 1080, 260, curve.in);
    return {
      opacity: 0.35 * fade * (t >= 400 ? 1 : 0) * visibility.value,
      transform: [{ scaleY: Math.max(0.01, reach) }],
    };
  });

  if (gesture === 'none') return null;

  const tipColors = {
    backgroundColor: theme.text + '1F',
    borderColor: theme.text + '8C',
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.center, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {isPinch ? (
        <>
          <PinchTip direction={1} clock={clock} visibility={visibility} still={!!reduceMotion} colors={tipColors} />
          <PinchTip direction={-1} clock={clock} visibility={visibility} still={!!reduceMotion} colors={tipColors} />
        </>
      ) : (
        <>
          <Animated.View style={[styles.trail, { backgroundColor: theme.text }, trailStyle]} />
          <Animated.View style={[styles.tip, styles.overlay, { borderColor: theme.accentWarm }, styles.ring, ringStyle]} />
          <Animated.View style={[styles.tip, styles.overlay, tipColors, tipStyle]} />
        </>
      )}
    </View>
  );
}

interface PinchTipProps {
  direction: 1 | -1;
  clock: SharedValue<number>;
  visibility: SharedValue<number>;
  still: boolean;
  colors: { backgroundColor: string; borderColor: string };
}

/** One of the two fingertips in the pinch demo; they mirror along the diagonal. */
function PinchTip({ direction, clock, visibility, still, colors }: PinchTipProps) {
  const style = useAnimatedStyle(() => {
    if (still) {
      return {
        opacity: visibility.value * 0.9,
        transform: [{ translateX: direction * PINCH_SPREAD }, { translateY: -direction * PINCH_SPREAD }],
      };
    }
    const t = clock.value;
    const spread = 12 + PINCH_SPREAD * segment(t, 420, 700, curve.inOut);
    return {
      opacity: presence(t, 1360) * visibility.value,
      transform: [
        { translateX: direction * spread },
        { translateY: -direction * spread },
        { scale: press(t, 260, 1200) },
      ],
    };
  });
  return <Animated.View style={[styles.tip, styles.overlay, colors, style]} />;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    width: TIP,
    height: TIP,
    borderRadius: TIP / 2,
    borderWidth: 1.5,
  },
  overlay: {
    position: 'absolute',
  },
  ring: {
    backgroundColor: 'transparent',
  },
  trail: {
    position: 'absolute',
    width: 2,
    height: SWIPE_DISTANCE,
    borderRadius: 1,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
});
