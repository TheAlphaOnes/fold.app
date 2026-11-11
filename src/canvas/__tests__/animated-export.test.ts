import { describe, expect, it } from 'vitest';

import {
  GIF_STEP_MS,
  animatedPlan,
  exportDrawInSchedule,
  gifFrameAt,
  hasAnimatedContent,
  type GifFrameSet,
} from '@/canvas/animated-export';
import { drawInSchedule, strokeLength } from '@/canvas/doodle';
import type { CanvasDoc, DoodleLayer, Layer } from '@/canvas/types';
import type { MediaElement } from '@/types/journal';

const doodle = (strokeCount: number): DoodleLayer => ({
  kind: 'doodle',
  id: 'd',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  color: null,
  width: 0.01,
  strokes: Array.from({ length: strokeCount }, () => ({ points: [0, 0, 0.5, 0] })),
});

const media = (id: string, isGif = false): MediaElement => ({
  id,
  uri: isGif ? 'file:///var/klipy_123_abc' : 'file:///var/photo.jpg',
  type: 'image',
  x_pos: 0.5,
  y_pos: 0.5,
  isGif,
});

const doc = (layers: Layer[]): CanvasDoc => ({ version: 1, template: 'stickers', background: { kind: 'stripes' }, layers });

describe('hasAnimatedContent', () => {
  it('is true for a doodle layer', () => {
    expect(hasAnimatedContent(doc([doodle(1)]), [media('m1')])).toBe(true);
  });

  it('is true for a GIF sticker on the canvas', () => {
    expect(hasAnimatedContent(doc([{ kind: 'media', id: 'l', mediaId: 'g1', shape: 'rounded', x: 0.5, y: 0.5, scale: 1, rotation: 0 }]), [media('g1', true)])).toBe(true);
  });

  it('ignores GIF media that is not placed on the canvas', () => {
    expect(hasAnimatedContent(doc([]), [media('g1', true)])).toBe(false);
  });

  it('is false for photos, stamps and words', () => {
    const stamp: Layer = { kind: 'stamp', id: 's', mediaId: 'm9', place: 'Jaipur', stampedAt: 0, x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    const sticker: Layer = { kind: 'media', id: 'l', mediaId: 'm1', shape: 'card', x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    expect(hasAnimatedContent(doc([stamp, sticker]), [media('m1'), media('m9')])).toBe(false);
  });
});

describe('animatedPlan', () => {
  it('steps at the boil rate', () => {
    expect(GIF_STEP_MS).toBe(120);
  });

  it('gives GIF-only memories a few sticker cycles, no draw-in', () => {
    const plan = animatedPlan([]);
    expect(plan.loopMs).toBe(1800);
    expect(plan.frameCount).toBe(15);
  });

  it('adds the doodle draw-in before the boil', () => {
    const single = doodle(1);
    const introEnd = exportDrawInSchedule(single.strokes.map((s) => strokeLength(s.points))).reduce((t, s) => Math.max(t, s.delay + s.duration), 0);
    const plan = animatedPlan([single]);
    expect(plan.loopMs).toBe(introEnd + 1200);
    expect(plan.frameCount).toBe(Math.ceil(plan.loopMs / GIF_STEP_MS));
  });

  it('caps a long draw-in and keeps the loop a whole number of steps', () => {
    const plan = animatedPlan([doodle(30)]);
    expect(plan.loopMs).toBeLessThanOrEqual(1600 + 1200);
    expect(plan.frameCount).toBe(Math.ceil(plan.loopMs / GIF_STEP_MS));
  });

  it('skips the draw-in for doodles too big to trace, like the live card', () => {
    const plan = animatedPlan([doodle(41)]);
    expect(plan.loopMs).toBe(1200);
    expect(plan.frameCount).toBe(10);
  });

  it('lets the longest doodle set the intro', () => {
    const short = animatedPlan([doodle(1), doodle(8)]).loopMs;
    const long = animatedPlan([doodle(8)]).loopMs;
    expect(short).toBe(long);
  });
});

describe('exportDrawInSchedule', () => {
  it('leaves short draw-ins exactly as the live card plays them', () => {
    const lengths = [0.1, 0.5];
    expect(exportDrawInSchedule(lengths)).toEqual(drawInSchedule(lengths));
  });

  it('speeds up long draw-ins proportionally to fit the cap', () => {
    const lengths = Array.from({ length: 30 }, () => 1);
    const raw = drawInSchedule(lengths);
    const rawEnd = raw.reduce((t, s) => Math.max(t, s.delay + s.duration), 0);
    const scaled = exportDrawInSchedule(lengths);
    const end = scaled.reduce((t, s) => Math.max(t, s.delay + s.duration), 0);
    expect(end).toBeLessThanOrEqual(1600);
    const ratio = end / rawEnd;
    scaled.forEach((s, i) => {
      expect(s.delay).toBeCloseTo(raw[i].delay * ratio, 6);
      expect(s.duration).toBeCloseTo(raw[i].duration * ratio, 6);
    });
  });
});

describe('gifFrameAt', () => {
  const set = (delays: number[]): GifFrameSet => ({ frames: delays.map((delayMs) => ({ uri: `u${delayMs}`, delayMs })), durationMs: delays.reduce((a, b) => a + b, 0) });

  it('picks the frame whose delay window contains the moment', () => {
    const s = set([100, 200]);
    expect(gifFrameAt(0, s)).toBe(0);
    expect(gifFrameAt(99, s)).toBe(0);
    expect(gifFrameAt(100, s)).toBe(1);
    expect(gifFrameAt(299, s)).toBe(1);
  });

  it('wraps at the sticker’s own duration', () => {
    const s = set([100, 200]);
    expect(gifFrameAt(300, s)).toBe(0);
    expect(gifFrameAt(650, s)).toBe(0);
    expect(gifFrameAt(700, s)).toBe(1);
  });

  it('holds still for a single frame or an unmeasured duration', () => {
    expect(gifFrameAt(5000, set([0]))).toBe(0);
    expect(gifFrameAt(5000, { frames: [{ uri: 'a', delayMs: 100 }, { uri: 'b', delayMs: 100 }], durationMs: 0 })).toBe(0);
  });
});
