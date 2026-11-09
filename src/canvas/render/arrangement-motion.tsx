/**
 * The gentle motion of arranged templates (templates/arrangements), on
 * the UI thread:
 *
 * MotionGroup  turns the whole shape around the canvas centre (Ring);
 *              each photo inside wears Upright, which turns it back by the
 *              same angle so it orbits but stays level, like the story wheel.
 * MotionItem   moves one photo on its own clock (Fan sways, Float bobs).
 *              Each photo gets a different duration and start, so they
 *              drift in and out of step instead of moving as one.
 * useDeck      flips through a pile (Deck): the top print swings out and
 *              tucks under, so every photo comes to the top in turn.
 *
 * Runs only while `active` (the live card in front) and never when the
 * system's Reduce Motion is on; when it stops, everything eases home.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  type SharedValue,
} from 'react-native-reanimated';

import { deckTop, type ArrangementMotion } from '@/templates/arrangements';

const SETTLE_MS = 400;
const sine = Easing.inOut(Easing.sin);

/** The group's current angle, for Upright to undo. */
const GroupAngle = createContext<SharedValue<number> | null>(null);

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
    <GroupAngle.Provider value={angle}>
      <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </GroupAngle.Provider>
  );
}

/** Inside a MotionGroup: turns its content back by the group's angle, so it stays level while orbiting. */
export function Upright({ children }: { children: React.ReactNode }) {
  const angle = useContext(GroupAngle);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-(angle?.get() ?? 0)}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const DECK_HOLD_MS = 2400;
const DECK_OUT_MS = 420;
const DECK_BACK_MS = 560;

/**
 * Flips through a pile of `count` prints while active: hold, swing the top
 * print out, send it to the back (step + 1), swing it in under the rest.
 * `swinging` is the card in flight (its index), `swing` its 0…1 progress.
 */
export function useDeck(count: number, active: boolean) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  // The loop reads and advances this; state mirrors it for rendering.
  const stepRef = useRef(0);
  const [swinging, setSwinging] = useState(-1);
  const swing = useSharedValue(0);
  const running = active && !reduced && count > 1;

  useEffect(() => {
    if (!running) {
      swing.set(withTiming(0, { duration: SETTLE_MS }));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const later = (ms: number, then: () => void) => {
      timer = setTimeout(() => {
        if (!cancelled) then();
      }, ms);
    };
    const flip = () => {
      setSwinging(deckTop(count, stepRef.current));
      swing.set(withTiming(1, { duration: DECK_OUT_MS, easing: Easing.out(Easing.cubic) }));
      later(DECK_OUT_MS, () => {
        stepRef.current += 1;
        setStep(stepRef.current);
        swing.set(withTiming(0, { duration: DECK_BACK_MS, easing: Easing.inOut(Easing.cubic) }));
        later(DECK_BACK_MS + DECK_HOLD_MS, flip);
      });
    };
    later(DECK_HOLD_MS, flip);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, count, swing]);

  return { step, swinging, swing };
}

/** The print in flight: out to the side and turned, then back in under the pile. */
export function DeckSwing({ swing, unit, children }: { swing: SharedValue<number>; unit: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const p = swing.get();
    return { transform: [{ translateX: p * unit * 0.62 }, { translateY: -p * unit * 0.04 }, { rotate: `${p * 14}deg` }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
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
    const half = (motion === 'bob' ? 1500 : 1700) + (index % 5) * 230;
    const swing = withSequence(withTiming(1, { duration: half, easing: sine }), withTiming(-1, { duration: half * 2, easing: sine }), withTiming(0, { duration: half, easing: sine }));
    phase.set(withDelay((index * 170) % 900, withRepeat(swing, -1)));
    return () => cancelAnimation(phase);
  }, [active, reduced, motion, index, phase]);

  const style = useAnimatedStyle(() => {
    const p = phase.get();
    switch (motion) {
      case 'sway':
        return { transform: [{ rotate: `${p * 2.5}deg` }] };
      case 'bob':
        return { transform: [{ translateY: p * unit * 0.014 }, { rotate: `${p * 1.5}deg` }] };
    }
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}
