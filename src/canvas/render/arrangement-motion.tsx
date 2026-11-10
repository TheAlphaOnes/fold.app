/**
 * The motion of arranged templates (templates/arrangements), on the UI
 * thread, broken into small segments that finish at different moments so
 * nothing moves as one rigid block:
 *
 * MotionGroup + Upright   Ring: the circle turns; each photo turns back by
 *                         the same angle so it orbits but stays level.
 * FanCard + useFanOrder   Fan: the hand closes into a stack and springs
 *                         back open, each card a beat behind the one before;
 *                         while it's closed the top card goes to the back,
 *                         so every photo takes a turn in front.
 * useDeck + DeckCard      Deck: the top print lifts, slides out (alternating
 *                         sides) and tucks under; the rest step up a place,
 *                         each easing into its new depth.
 *
 * A tap on the live card (`nudge`) plays each one's touch response: the
 * ring spins with a burst, the fan closes and springs open, the deck
 * flips the next print right away.
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

/** The group's current angle (steady turn + tap spins), for Upright to undo. */
const GroupAngle = createContext<{ angle: SharedValue<number>; spin: SharedValue<number> } | null>(null);

/** How far a tap spins the ring, and how long it takes to slow back to its steady turn. */
const RING_SPIN_DEGREES = 140;
const RING_SPIN_MS = 1100;

interface MotionGroupProps {
  degreesPerSecond: number;
  active: boolean;
  /** Bumped by a tap: the ring spins with a burst, then settles back. */
  nudge?: number;
  children: React.ReactNode;
}

export function MotionGroup({ degreesPerSecond, active, nudge = 0, children }: MotionGroupProps) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);
  // Extra turn from taps, on top of the steady one; it only ever adds up.
  const spin = useSharedValue(0);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (nudge === lastNudge.current) return;
    lastNudge.current = nudge;
    if (!active || reduced) return;
    spin.set(withTiming(spin.get() + Math.sign(degreesPerSecond || 1) * RING_SPIN_DEGREES, { duration: RING_SPIN_MS, easing: Easing.out(Easing.cubic) }));
  }, [nudge, active, reduced, degreesPerSecond, spin]);

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

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get() + spin.get()}deg` }] }));
  return (
    <GroupAngle.Provider value={{ angle, spin }}>
      <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </GroupAngle.Provider>
  );
}

/** Inside a MotionGroup: turns its content back by the group's angle, so it stays level while orbiting. */
export function Upright({ children }: { children: React.ReactNode }) {
  const group = useContext(GroupAngle);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-((group?.angle.get() ?? 0) + (group?.spin.get() ?? 0))}deg` }] }));
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
  /** Bumped by a tap: the hand closes and springs open right away. */
  nudge?: number;
  children: React.ReactNode;
}

export function FanCard({ index, at, stack, rotation, active, nudge = 0, children }: FanCardProps) {
  const reduced = useReducedMotion();
  // 1 = fanned open (the still layout), 0 = gathered into one stack.
  const open = useSharedValue(1);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(open);
      open.set(withTiming(1, { duration: SETTLE_MS }));
      return;
    }
    const close = withTiming(0, { duration: FAN_CLOSE_MS, easing: Easing.inOut(Easing.cubic) });
    const reopen = withDelay(FAN_CLOSED_HOLD_MS, withTiming(1, { duration: FAN_OPEN_MS, easing: Easing.out(Easing.back(1.6)) }));
    const cycle = withSequence(withDelay(FAN_OPEN_HOLD_MS, close), reopen);
    // A tap closes the hand now (each card a beat behind), then the cycle carries on.
    const tapped = nudge !== lastNudge.current;
    lastNudge.current = nudge;
    open.set(withDelay(index * FAN_STAGGER_MS, tapped ? withSequence(close, reopen, withRepeat(cycle, -1)) : withRepeat(cycle, -1)));
    return () => cancelAnimation(open);
  }, [active, reduced, index, open, nudge]);

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

/**
 * Which card of the fan is on top. Each time the hand closes into a stack,
 * the top card is sent to the back (the order shifts by one while the cards
 * are gathered, so the swap is hidden), so every photo takes a turn in
 * front. A tap closes the hand at once and shifts the order then too.
 * Timed to match FanCard's cycle.
 */
export function useFanOrder(count: number, active: boolean, nudge = 0) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const running = active && !reduced && count > 1;
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (!running) return;
    const tapped = nudge !== lastNudge.current;
    lastNudge.current = nudge;
    const period = FAN_OPEN_HOLD_MS + FAN_CLOSE_MS + FAN_CLOSED_HOLD_MS + FAN_OPEN_MS;
    // The middle of the closed hold: every card has gathered, none has left.
    const closedAt = FAN_CLOSE_MS + FAN_CLOSED_HOLD_MS / 2 + (count - 1) * FAN_STAGGER_MS * 0.5;
    const first = tapped ? closedAt : FAN_OPEN_HOLD_MS + closedAt;
    // Then once per cycle, whether or not the cycle began with a tap.
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      setStep((n) => n + 1);
      interval = setInterval(() => setStep((n) => n + 1), period);
    }, first);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [running, count, nudge]);

  return step;
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
export function useDeck(count: number, active: boolean, nudge = 0) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [swinging, setSwinging] = useState(-1);
  // Which way the print in flight leaves: alternates every flip.
  const [side, setSide] = useState<1 | -1>(1);
  // The loop reads and advances this; state mirrors it for rendering.
  const stepRef = useRef(0);
  const swing = useSharedValue(0);
  const running = active && !reduced && count > 1;
  const lastNudge = useRef(nudge);

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
    // A tap flips the next print now; otherwise wait out the hold.
    const tapped = nudge !== lastNudge.current;
    lastNudge.current = nudge;
    later(tapped ? 0 : DECK_HOLD_MS, flip);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, count, swing, nudge]);

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
