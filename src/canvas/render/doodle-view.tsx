/**
 * DoodleView — a pen doodle, drawn as a brush (a main line with two
 * fainter bristle strands, slightly rough) rather than a perfect tube. Still (exports, thumbnails, Reduce Motion) it
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

import { exportDrawInSchedule } from '@/canvas/animated-export';
import {
  BOIL_FRAMES,
  BOIL_FRAME_MS,
  DRAW_IN_LIMIT,
  brushStrands,
  doodleExtent,
  drawInSchedule,
  inOutQuad,
  strokeLength,
  strokePhase,
  strokePath,
  wobble,
} from '@/canvas/doodle';
import type { DoodleLayer } from '@/canvas/types';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DoodleViewProps {
  layer: DoodleLayer;
  width: number;
  /** Draw in, then boil (the live card, the memory screen, the composer). */
  moving: boolean;
  /** Wall-clock ms into the export timeline: draws one exact animation state (the animated share export). */
  exportT?: number;
}

export function DoodleView({ layer, width, moving, exportT }: DoodleViewProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const animate = moving && !reduced;
  const exporting = exportT !== undefined;

  const unit = width * layer.scale;
  const pen = Math.max(1, layer.width * unit);
  const extent = doodleExtent(layer.strokes);
  // Room for the pen and the wobble on every side.
  const pad = pen + unit * 0.02;
  const box = { width: extent.x * 2 * unit + pad * 2, height: extent.y * 2 * unit + pad * 2 };
  // Big enough to read clearly as a hand-drawn boil, whatever the pen.
  const amp = Math.max(0.0035, layer.width * 0.5);

  const strokes = useMemo(() => {
    const offset = { x: box.width / 2, y: box.height / 2 };
    // The export draws at the same moments the live card does, so its
    // draw-in is the live schedule (sped up only if it would drag).
    const timings = exporting ? exportDrawInSchedule(layer.strokes.map((s) => strokeLength(s.points))) : drawInSchedule(layer.strokes.map((s) => strokeLength(s.points)));
    return layer.strokes.map((s, i) => ({
      // Each strand of the brush, in each boil frame.
      strands: brushStrands(s.points, layer.width, i).map((strand) => ({
        width: strand.width,
        opacity: strand.opacity,
        frames: Array.from({ length: animate || exporting ? BOIL_FRAMES : 1 }, (_, f) => strokePath(wobble(strand.points, f, amp, i), unit, offset)),
      })),
      length: strokeLength(s.points) * unit,
      timing: timings[i],
    }));
  }, [layer.strokes, layer.width, unit, amp, animate, exporting, box.width, box.height]);

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
  const drawIn = (animate || exporting) && strokes.length <= DRAW_IN_LIMIT;
  return (
    <Svg width={box.width} height={box.height} pointerEvents="none">
      {strokes.map((s, i) => (
          <DoodleStroke
            key={i}
            strands={s.strands}
            length={s.length}
            color={ink}
            pen={pen}
            clock={animate ? clock : null}
            phase={strokePhase(i)}
            drawIn={drawIn ? s.timing : null}
            exportT={exportT}
          />
      ))}
    </Svg>
  );
}

interface DoodleStrokeProps {
  strands: { width: number; opacity: number; frames: string[] }[];
  length: number;
  color: string;
  pen: number;
  /** The boil clock (null: still). */
  clock: SharedValue<number> | null;
  /** This stroke's offset on the clock, so strokes swap at different moments. */
  phase: number;
  drawIn: { delay: number; duration: number } | null;
  /** Set while the animated export films this doodle: render exactly this moment. */
  exportT?: number;
}

function DoodleStroke({ strands, length, color, pen, clock, phase, drawIn, exportT }: DoodleStrokeProps) {
  // 0 = not drawn yet, 1 = fully drawn.
  const reveal = useSharedValue(drawIn ? 0 : 1);
  const drawing = drawIn !== null;
  const delay = drawIn?.delay ?? 0;
  const duration = drawIn?.duration ?? 0;
  // Replays whenever the doodle starts moving again.
  useEffect(() => {
    if (!drawing || exportT !== undefined) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.quad) })));
    return () => cancelAnimation(reveal);
  }, [drawing, delay, duration, reveal, exportT]);

  // The dash is a little longer than the line, so the wobbled frames are covered too.
  const dash = length * 1.08 + pen;

  // Export mode: the same maths the animated card plays, evaluated at one
  // chosen moment — this boil frame, this much of the draw-in — as plain
  // paths, so a capture of this view is exactly that moment.
  if (exportT !== undefined) {
    const frame = Math.floor(exportT / BOIL_FRAME_MS + phase) % strands[0].frames.length;
    const progress = drawing ? Math.min(1, Math.max(0, duration > 0 ? (exportT - delay) / duration : 1)) : 1;
    return strands.map((strand, k) => (
      <Path
        key={k}
        d={strand.frames[frame]}
        stroke={color}
        strokeWidth={pen * strand.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={strand.opacity}
        strokeDasharray={[dash, dash]}
        strokeDashoffset={dash * (1 - inOutQuad(progress))}
      />
    ));
  }

  return strands.flatMap((strand, k) =>
    strand.frames.map((d, f) => (
      <BoilFrame
        key={`${k}-${f}`}
        d={d}
        frame={f}
        count={strand.frames.length}
        color={color}
        pen={pen * strand.width}
        strength={strand.opacity}
        clock={clock}
        phase={phase}
        reveal={reveal}
        dash={dash}
      />
    )),
  );
}

interface BoilFrameProps {
  d: string;
  frame: number;
  count: number;
  color: string;
  pen: number;
  /** Opacity when shown (bristle strands are fainter). */
  strength: number;
  clock: SharedValue<number> | null;
  phase: number;
  reveal: SharedValue<number>;
  dash: number;
}

function BoilFrame({ d, frame, count, color, pen, strength, clock, phase, reveal, dash }: BoilFrameProps) {
  const props = useAnimatedProps(() => {
    const shown = clock ? Math.floor(clock.get() + phase) % count === frame : frame === 0;
    return { opacity: shown ? strength : 0, strokeDashoffset: dash * (1 - reveal.get()) };
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
