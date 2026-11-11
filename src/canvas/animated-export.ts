/**
 * The animated share export — a memory with life in it (a doodle that draws
 * itself in and boils, a GIF sticker that plays) shared as a looping GIF
 * instead of a still photo.
 *
 * Pure timeline maths: what counts as animated, how long the loop is, and
 * which frame each animated piece shows at a given moment. The capture
 * loop steps a small offscreen canvas through these states one by one and
 * films it; the filming itself lives with the renderers, and the byte
 * work (decode/encode) in gif-codec.
 */

import { BOIL_FRAME_MS, DRAW_IN_LIMIT, drawInSchedule, strokeLength } from '@/canvas/doodle';
import type { CanvasDoc, DoodleLayer, Layer } from '@/canvas/types';
import type { MediaElement } from '@/types/journal';
import { isGifMedia } from '@/utils/media-kind';

/**
 * Size of the exported GIF: a 9:16 card at story scale. Sharper than the
 * feed, far smaller than the 4K still — a GIF's file grows with its
 * pixels, and share targets choke on many-megabyte loops.
 */
export const GIF_EXPORT_SIZE = { width: 540, height: 960 } as const;

/** One captured frame per boil beat, so a doodle plays at exactly its live rate. */
export const GIF_STEP_MS = BOIL_FRAME_MS;

/** A doodle's draw-in longer than this is proportionally sped up to fit the loop. */
const INTRO_CAP_MS = 1600;

/** Boil shown after the draw-in before the loop restarts. */
const BOIL_TAIL_MS = 1200;

/** GIF-only memories have no draw-in; the loop is a few sticker cycles instead. */
const STICKER_TAIL_MS = 1800;

/** One playable frame of a GIF sticker: a still image, and how long the real GIF shows it. */
export interface GifFrameSource {
  uri: string;
  delayMs: number;
}

/** A GIF sticker's whole animation, pre-decoded so the export can pick any moment of it. */
export interface GifFrameSet {
  frames: GifFrameSource[];
  durationMs: number;
}

/** Where the capture loop is: wall-clock ms into the loop, plus every decoded sticker. */
export interface ExportFrameState {
  tMs: number;
  gifs: Map<string, GifFrameSet>;
}

/** Everything the capture loop needs to know about the timeline it films. */
export interface AnimatedPlan {
  stepMs: number;
  frameCount: number;
  loopMs: number;
}

/**
 * True when a memory has something alive in it: a doodle (it draws in and
 * boils) or a GIF sticker (it plays). Those memories share as a looping
 * GIF; everything else keeps the still photo path.
 */
export function hasAnimatedContent(doc: CanvasDoc, media: MediaElement[]): boolean {
  const gifs = new Set(media.filter((m) => isGifMedia(m)).map((m) => m.id));
  return doc.layers.some((layer: Layer) => layer.kind === 'doodle' || (layer.kind === 'media' && gifs.has(layer.mediaId)));
}

/**
 * A doodle's draw-in timings for the export: the live schedule, sped up
 * proportionally if it would run past the cap, so a big drawing doesn't
 * turn the loop into a slideshow. The live card plays the uncapped
 * timings; the export and this module agree through this function.
 */
export function exportDrawInSchedule(lengths: number[]): { delay: number; duration: number }[] {
  const timings = drawInSchedule(lengths);
  const end = timings.reduce((t, s) => Math.max(t, s.delay + s.duration), 0);
  const scale = end > INTRO_CAP_MS ? INTRO_CAP_MS / end : 1;
  return timings.map((s) => ({ delay: s.delay * scale, duration: s.duration * scale }));
}

/**
 * The export timeline for a memory's doodles: the draw-in (capped), then a
 * stretch of boil, then the loop restarts and the drawing draws itself
 * again. Doodles too big to draw in just boil, like on the live card.
 */
export function animatedPlan(doodles: DoodleLayer[]): AnimatedPlan {
  const intros = doodles
    .filter((d) => d.strokes.length <= DRAW_IN_LIMIT)
    .map((d) => exportDrawInSchedule(d.strokes.map((s) => strokeLength(s.points))))
    .map((timings) => timings.reduce((t, s) => Math.max(t, s.delay + s.duration), 0));
  const introEnd = intros.length ? Math.max(...intros) : 0;
  const loopMs = introEnd + (doodles.length ? BOIL_TAIL_MS : STICKER_TAIL_MS);
  return { stepMs: GIF_STEP_MS, frameCount: Math.max(2, Math.ceil(loopMs / GIF_STEP_MS)), loopMs };
}

/**
 * Which frame of a GIF sticker is showing `tMs` into the loop: the sticker
 * plays its own timeline and wraps at its own duration, however the
 * export's clock is paced. Frames shown too fast to see (a real GIF quirk)
 * hold for a beat, the way every player shows them.
 */
export function gifFrameAt(tMs: number, set: GifFrameSet): number {
  if (set.durationMs <= 0 || set.frames.length <= 1) return 0;
  let t = tMs % set.durationMs;
  for (let i = 0; i < set.frames.length; i++) {
    const delay = set.frames[i].delayMs;
    if (t < delay) return i;
    t -= delay;
  }
  return set.frames.length - 1;
}
