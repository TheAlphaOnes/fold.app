/**
 * DoodleView — a pen doodle. Still (exports, thumbnails, Reduce Motion) it
 * is the strokes as drawn. Moving, it plays in two parts:
 *
 *   draw-in   each stroke traces itself in the order it was drawn, a beat
 *             after the one before, at a speed that follows its length;
 *   boil      then every stroke keeps swapping between a few hand-wobbled
 *             versions of itself, each on its own offset clock, so the
 *             drawing shimmers like a hand-animated line, in a loop.
 *
 * Every frame of every stroke is drawn once; the UI thread only flips
 * opacities and dash offsets, so the loop costs no React renders.
 */

import React, { useEffect, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BOIL_FRAMES, doodleExtent, drawInSchedule, strokeLength, strokePath, wobble } from '@/canvas/doodle';
import type { DoodleLayer } from '@/canvas/types';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** How long each boil frame shows: ~7 swaps a second, the classic hand-drawn rate. */
const BOIL_FRAME_MS = 140;
/** Past this many strokes, draw-in would drag; the doodle just appears and boils. */
const DRAW_IN_LIMIT = 40;

interface DoodleViewProps {
  layer: DoodleLayer;
  width: number;
  /** Draw in, then boil (the live card, the memory screen, the composer). */
  moving: boolean;
}

export function DoodleView({ layer, width, moving }: DoodleViewProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const animate = moving && !reduced;

  const unit = width * layer.scale;
  const pen = Math.max(1, layer.width * unit);
  const extent = doodleExtent(layer.strokes);
  // Room for the pen and the wobble on every side.
  const pad = pen + unit * 0.02;
  const box = { width: extent.x * 2 * unit + pad * 2, height: extent.y * 2 * unit + pad * 2 };
  const amp = Math.max(0.0015, layer.width * 0.18);

  const strokes = useMemo(() => {
    const offset = { x: box.width / 2, y: box.height / 2 };
    const timings = drawInSchedule(layer.strokes.map((s) => strokeLength(s.points)));
    return layer.strokes.map((s, i) => ({
      frames: Array.from({ length: animate ? BOIL_FRAMES : 1 }, (_, f) => strokePath(wobble(s.points, f, amp, i), unit, offset)),
      length: strokeLength(s.points) * unit,
      timing: timings[i],
    }));
  }, [layer.strokes, unit, amp, animate, box.width, box.height]);

  // One clock for the boil; each stroke reads it at its own offset.
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      cancelAnimation(clock);
      clock.set(0);
      return;
    }
    clock.set(0);
    clock.set(withRepeat(withTiming(BOIL_FRAMES, { duration: BOIL_FRAMES * BOIL_FRAME_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(clock);
  }, [animate, clock]);

  const ink = layer.color ?? theme.text;
  const drawIn = animate && strokes.length <= DRAW_IN_LIMIT;
  return (
    <Svg width={box.width} height={box.height} pointerEvents="none">
      {strokes.map((s, i) => (
          <DoodleStroke
            key={i}
            frames={s.frames}
            length={s.length}
            color={ink}
            pen={pen}
            clock={animate ? clock : null}
            phase={(i * 0.37) % BOIL_FRAMES}
            drawIn={drawIn ? s.timing : null}
          />
      ))}
    </Svg>
  );
}

interface DoodleStrokeProps {
  frames: string[];
  length: number;
  color: string;
  pen: number;
  /** The boil clock (null: still). */
  clock: SharedValue<number> | null;
  /** This stroke's offset on the clock, so strokes swap at different moments. */
  phase: number;
  drawIn: { delay: number; duration: number } | null;
}

function DoodleStroke({ frames, length, color, pen, clock, phase, drawIn }: DoodleStrokeProps) {
  // 0 = not drawn yet, 1 = fully drawn.
  const reveal = useSharedValue(drawIn ? 0 : 1);
  const drawing = drawIn !== null;
  const delay = drawIn?.delay ?? 0;
  const duration = drawIn?.duration ?? 0;
  // Replays whenever the doodle starts moving again.
  useEffect(() => {
    if (!drawing) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.quad) })));
    return () => cancelAnimation(reveal);
  }, [drawing, delay, duration, reveal]);

  // The dash is a little longer than the line, so the wobbled frames are covered too.
  const dash = length * 1.08 + pen;
  return frames.map((d, f) => <BoilFrame key={f} d={d} frame={f} count={frames.length} color={color} pen={pen} clock={clock} phase={phase} reveal={reveal} dash={dash} />);
}

interface BoilFrameProps {
  d: string;
  frame: number;
  count: number;
  color: string;
  pen: number;
  clock: SharedValue<number> | null;
  phase: number;
  reveal: SharedValue<number>;
  dash: number;
}

function BoilFrame({ d, frame, count, color, pen, clock, phase, reveal, dash }: BoilFrameProps) {
  const props = useAnimatedProps(() => {
    const shown = clock ? Math.floor(clock.get() + phase) % count === frame : frame === 0;
    return { opacity: shown ? 1 : 0, strokeDashoffset: dash * (1 - reveal.get()) };
  });
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={pen}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[dash, dash]}
      animatedProps={props}
    />
  );
}
