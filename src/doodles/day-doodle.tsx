/**
 * DayDoodle — one doodle from the year's library, in the app's brush.
 *
 * Built for many on screen at once (a month, a year). The canvas's
 * DoodleView animates every strand of every stroke on its own, which is
 * right for one doodle and far too much for thirty: here each boil frame is
 * drawn once as plain paths in its own layer, and only the layers'
 * opacities animate, three animated values per doodle whatever its strokes.
 * It arrives with a little pop, staggered by `delay`: a springy scale that
 * overshoots and settles while the fade finishes sooner, so each doodle
 * lands rather than just appears.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  Keyframe,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BOIL_FRAMES, BOIL_FRAME_MS, brushStrands, strokePath, wobble } from '@/canvas/doodle';
import { hueOf, strokeHex } from '@/doodles/palette';
import type { LibraryDoodle } from '@/doodles/types';

/** Share of the box the drawing spans, leaving room for the pen and its wobble. */
const DRAWING_SPAN = 0.8;
/** Pen width as a share of the drawing's span, the same weight at every size. */
const PEN = 0.026;
/** The pop: in from small, past full size, back — the fade done by the overshoot. */
export const POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.3 }, { rotate: '-8deg' }] },
  45: { opacity: 1, transform: [{ scale: 1.14 }, { rotate: '3deg' }], easing: Easing.out(Easing.quad) },
  75: { transform: [{ scale: 0.96 }, { rotate: '-1deg' }], easing: Easing.inOut(Easing.quad) },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }], easing: Easing.out(Easing.quad) },
}).duration(460);

/** Wobble size, in drawing units. */
const AMP = 0.006;

interface DayDoodleProps {
  doodle: LibraryDoodle;
  /** The square it's drawn in, in points. */
  size: number;
  /** Boil (off: still, also under Reduce Motion). */
  moving?: boolean;
  /** Pops in after this many ms; omitted, it simply appears (a parent animates it). */
  delay?: number;
}

export function DayDoodle({ doodle, size, moving = true, delay }: DayDoodleProps) {
  const reduced = useReducedMotion();
  const animate = moving && !reduced;
  const frames = animate ? BOIL_FRAMES : 1;

  const paths = useMemo(() => {
    const unit = size * DRAWING_SPAN;
    const pen = PEN * unit;
    const centre = { x: size / 2, y: size / 2 };
    const hue = hueOf(doodle.strokes);
    return Array.from({ length: frames }, (_, f) =>
      doodle.strokes.flatMap((s, i) =>
        brushStrands(s.points, PEN, i).map((strand) => ({
          d: strokePath(wobble(strand.points, f, AMP, i), unit, centre),
          ink: strokeHex(s.ink, hue),
          width: pen * strand.width,
          opacity: strand.opacity,
        })),
      ),
    );
  }, [doodle, size, frames]);

  const clock = useSharedValue(0);
  useEffect(() => {
    if (!animate) return undefined;
    clock.set(withRepeat(withTiming(BOIL_FRAMES, { duration: BOIL_FRAMES * BOIL_FRAME_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(clock);
  }, [animate, clock]);

  return (
    <Animated.View entering={reduced || delay === undefined ? undefined : POP.delay(delay)} style={{ width: size, height: size }}>
      {paths.map((frame, f) => (
        <BoilLayer key={f} frame={f} count={frames} clock={animate ? clock : null}>
          <Svg width={size} height={size}>
            {frame.map((p, k) => (
              <Path
                key={k}
                d={p.d}
                stroke={p.ink}
                strokeWidth={p.width}
                strokeOpacity={p.opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </BoilLayer>
      ))}
    </Animated.View>
  );
}

/** One boil frame's layer, shown while the clock is on its frame. */
function BoilLayer({ frame, count, clock, children }: { frame: number; count: number; clock: SharedValue<number> | null; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: clock ? (Math.floor(clock.get()) % count === frame ? 1 : 0) : frame === 0 ? 1 : 0,
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}
