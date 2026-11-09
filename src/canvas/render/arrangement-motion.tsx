/**
 * The motion of arranged templates (templates/arrangements), on the UI
 * thread, broken into small segments that finish at different moments so
 * nothing moves as one rigid block:
 *
 * MotionGroup + Upright   Ring: the circle turns; each photo turns back by
 *                         the same angle so it orbits but stays level.
 * FanCard                 Fan: the hand closes into a stack and springs
 *                         back open, each card a beat behind the one before.
 * useDeck + DeckCard      Deck: the top print lifts, slides out (alternating
 *                         sides) and tucks under; the rest step up a place,
 *                         each easing into its new depth.
 *
 * Runs only while `active` (the live card in front) and never with Reduce
 * Motion on; when it stops, everything eases home to the still layout.
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

import { deckTop } from '@/templates/arrangements';

const SETTLE_MS = 400;

// ─── Ring ───────────────────────────────────────────────────────────────

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

// ─── Fan ────────────────────────────────────────────────────────────────

const FAN_OPEN_HOLD_MS = 2600;
const FAN_CLOSE_MS = 620;
const FAN_CLOSED_HOLD_MS = 380;
const FAN_OPEN_MS = 820;
/** How far behind the card before it each card moves: the ripple. */
const FAN_STAGGER_MS = 55;

interface FanCardProps {
  index: number;
  /** Where this card's centre is (px) and the stack's centre it gathers to (px). */
  at: { x: number; y: number };
  stack: { x: number; y: number };
  /** The card's own turn in the fan (degrees); it straightens as the hand closes. */
  rotation: number;
  active: boolean;
  children: React.ReactNode;
}

export function FanCard({ index, at, stack, rotation, active, children }: FanCardProps) {
  const reduced = useReducedMotion();
  // 1 = fanned open (the still layout), 0 = gathered into one stack.
  const open = useSharedValue(1);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(open);
      open.set(withTiming(1, { duration: SETTLE_MS }));
      return;
    }
    const cycle = withSequence(
      withDelay(FAN_OPEN_HOLD_MS, withTiming(0, { duration: FAN_CLOSE_MS, easing: Easing.inOut(Easing.cubic) })),
      withDelay(FAN_CLOSED_HOLD_MS, withTiming(1, { duration: FAN_OPEN_MS, easing: Easing.out(Easing.back(1.6)) })),
    );
    open.set(withDelay(index * FAN_STAGGER_MS, withRepeat(cycle, -1)));
    return () => cancelAnimation(open);
  }, [active, reduced, index, open]);

  // The layer is already turned by `rotation`, so the way to the stack is
  // expressed in its own turned frame.
  const theta = (rotation * Math.PI) / 180;
  const dx = stack.x - at.x;
  const dy = stack.y - at.y;
  const tx = dx * Math.cos(theta) + dy * Math.sin(theta);
  const ty = -dx * Math.sin(theta) + dy * Math.cos(theta);

  const style = useAnimatedStyle(() => {
    const closed = 1 - open.get();
    return { transform: [{ translateX: tx * closed }, { translateY: ty * closed }, { rotate: `${-rotation * 0.85 * closed}deg` }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Deck ───────────────────────────────────────────────────────────────

const DECK_HOLD_MS = 2400;
const DECK_OUT_MS = 580;
const DECK_BACK_MS = 560;
const DECK_SETTLE_MS = 460;

/**
 * Flips through a pile of `count` prints while active: hold, lift and
 * slide the top print out, send it to the back (step + 1), slide it in
 * under the rest. `swinging` is the card in flight, `swing` its 0…1
 * progress and `side` which way it leaves (alternates every flip).
 */
export function useDeck(count: number, active: boolean) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [swinging, setSwinging] = useState(-1);
  // Which way the print in flight leaves: alternates every flip.
  const [side, setSide] = useState<1 | -1>(1);
  // The loop reads and advances this; state mirrors it for rendering.
  const stepRef = useRef(0);
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
      setSide(stepRef.current % 2 === 0 ? 1 : -1);
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

  return { step, swinging, swing, side };
}

interface DeckCardProps {
  /** 0 = top of the pile. */
  depth: number;
  /** This card is the one flying out and back. */
  flying: boolean;
  swing: SharedValue<number>;
  side: 1 | -1;
  /** Canvas width, so moves are the same share of the card at any size. */
  unit: number;
  children: React.ReactNode;
}

export function DeckCard({ depth, flying, swing, side, unit, children }: DeckCardProps) {
  // Each card eases to its place in the pile when its depth changes:
  // deeper prints sit a touch lower and smaller.
  const place = useSharedValue(Math.min(depth, 4));
  useEffect(() => {
    place.set(withTiming(Math.min(depth, 4), { duration: DECK_SETTLE_MS, easing: Easing.out(Easing.cubic) }));
  }, [depth, place]);

  const style = useAnimatedStyle(() => {
    const d = place.get();
    const p = flying ? swing.get() : 0;
    // Lift first (a slight grow), then out to the side and turned.
    const lift = Math.min(1, p * 2.2);
    return {
      transform: [
        { translateX: p * side * unit * 0.66 },
        { translateY: d * unit * 0.018 - lift * unit * 0.03 },
        { rotate: `${p * side * 16}deg` },
        { scale: (1 - d * 0.03) * (1 + lift * 0.04) },
      ],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
