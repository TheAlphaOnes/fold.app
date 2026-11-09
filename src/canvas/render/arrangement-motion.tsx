/**
 * The gentle motion of arranged templates (templates/arrangements), on
 * the UI thread:
 *
 * MotionGroup  turns the whole shape around the canvas centre (Ring, Spiral).
 * MotionItem   moves one photo on its own clock (Fan sways, Stack breathes,
 *              Float bobs). Each photo gets a different duration and start,
 *              so they drift in and out of step instead of moving as one.
 *
 * Runs only while `active` (the live card in front) and never when the
 * system's Reduce Motion is on; when it stops, everything eases home.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ArrangementMotion } from '@/templates/arrangements';

const SETTLE_MS = 400;
const sine = Easing.inOut(Easing.sin);

export function MotionGroup({ degreesPerSecond, active, children }: { degreesPerSecond: number; active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced || degreesPerSecond === 0) {
      cancelAnimation(angle);
      angle.set(withTiming(0, { duration: SETTLE_MS }));
      return;
    }
    const turn = Math.sign(degreesPerSecond) * 360;
    angle.set(0);
    angle.set(withRepeat(withTiming(turn, { duration: (360 / Math.abs(degreesPerSecond)) * 1000, easing: Easing.linear }), -1));
    return () => cancelAnimation(angle);
  }, [active, reduced, degreesPerSecond, angle]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
}

type ItemStyle = Extract<ArrangementMotion, { kind: 'item' }>['style'];

interface MotionItemProps {
  motion: ItemStyle;
  /** The photo's place in the shape: sets its own timing. */
  index: number;
  /** Canvas width, so a bob is the same share of the card at any size. */
  unit: number;
  active: boolean;
  children: React.ReactNode;
}

export function MotionItem({ motion, index, unit, active, children }: MotionItemProps) {
  const reduced = useReducedMotion();
  // -1…1 along the motion's path.
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(phase);
      phase.set(withTiming(0, { duration: SETTLE_MS }));
      return;
    }
    // Each photo keeps its own rhythm: a different length and a staggered start.
    const half = (motion === 'bob' ? 1500 : motion === 'sway' ? 1700 : 1400) + (index % 5) * 230;
    const swing = withSequence(withTiming(1, { duration: half, easing: sine }), withTiming(-1, { duration: half * 2, easing: sine }), withTiming(0, { duration: half, easing: sine }));
    phase.set(withDelay((index * 170) % 900, withRepeat(swing, -1)));
    return () => cancelAnimation(phase);
  }, [active, reduced, motion, index, phase]);

  const style = useAnimatedStyle(() => {
    const p = phase.get();
    switch (motion) {
      case 'sway':
        return { transform: [{ rotate: `${p * 2.5}deg` }] };
      case 'breathe':
        return { transform: [{ rotate: `${p * 1.2}deg` }, { scale: 1 + Math.abs(p) * 0.02 }] };
      case 'bob':
        return { transform: [{ translateY: p * unit * 0.014 }, { rotate: `${p * 1.5}deg` }] };
    }
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}
