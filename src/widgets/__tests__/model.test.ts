import { describe, expect, it, vi } from 'vitest';
import type { Widget } from 'expo-widgets';

import { endOfDay, howLongAgo, isShowable, longDate, wordsOf } from '@/widgets/model';
import { defineSurface } from '@/widgets/surfaces';
import type { Composition } from '@/types/journal';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const memory = (over: Partial<Composition>): Composition =>
  ({ id: 1, createdAt: 0, textContent: '', mediaElements: [], ...over }) as Composition;

describe('howLongAgo', () => {
  const now = new Date(2026, 10, 12, 15);
  it('names anniversaries in years', () => {
    expect(howLongAgo(at(2025, 11, 12), now)).toBe('1 year ago');
    expect(howLongAgo(at(2023, 11, 12), now)).toBe('3 years ago');
  });
  it('names other days by distance', () => {
    expect(howLongAgo(at(2026, 11, 12, 9), now)).toBe('today');
    expect(howLongAgo(at(2026, 11, 11), now)).toBe('yesterday');
    expect(howLongAgo(at(2026, 11, 2), now)).toBe('10 days ago');
    expect(howLongAgo(at(2026, 10, 12), now)).toBe('4 weeks ago');
    expect(howLongAgo(at(2026, 6, 1), now)).toBe('5 months ago');
    expect(howLongAgo(at(2025, 1, 3), now)).toBe('a year ago');
  });
});

describe('memory helpers', () => {
  it('shows a memory with a photo or words, not one with only a GIF', () => {
    const gif = { id: 'g', type: 'image', uri: 'x', isGif: true } as Composition['mediaElements'][number];
    const photo = { id: 'p', type: 'image', uri: 'y' } as Composition['mediaElements'][number];
    expect(isShowable(memory({ mediaElements: [gif] }))).toBe(false);
    expect(isShowable(memory({ mediaElements: [gif, photo] }))).toBe(true);
    expect(isShowable(memory({ textContent: '  a walk  ' }))).toBe(true);
  });
  it('cuts words to one short line', () => {
    expect(wordsOf(memory({ textContent: 'one\n two   three' }))).toBe('one two three');
    expect(wordsOf(memory({ textContent: 'a'.repeat(200) }), 10)).toBe(`${'a'.repeat(10)}…`);
  });
  it('formats dates and midnights', () => {
    expect(longDate(at(2025, 11, 12))).toBe('12 nov 2025');
    expect(endOfDay(new Date(2026, 11, 31, 18)).getTime()).toBe(new Date(2027, 0, 1).getTime());
  });
});

describe('defineSurface', () => {
  const fakeWidget = () => ({ updateTimeline: vi.fn(), updateSnapshot: vi.fn() }) as unknown as Widget<{ id: number }> & {
    updateTimeline: ReturnType<typeof vi.fn>;
    updateSnapshot: ReturnType<typeof vi.fn>;
  };
  const context = { now: new Date(2026, 10, 12), copy: async () => '' };
  const timeline = [
    { date: new Date(2026, 10, 12), props: { id: 7 } },
    { date: new Date(2026, 10, 13), props: { id: 8 } },
  ];

  it('pushes the whole timeline on iOS and the current entry on Android', async () => {
    const widget = fakeWidget();
    const surface = defineSurface({ name: 'Test', load: () => widget, build: async () => timeline });
    await surface.sync(context, 'ios');
    expect(widget.updateTimeline).toHaveBeenCalledWith(timeline);
    await surface.sync(context, 'android');
    expect(widget.updateSnapshot).toHaveBeenCalledWith({ id: 7 });
  });

  it('routes Android taps from what it last showed, and opens the app before that', async () => {
    const surface = defineSurface({
      name: 'Test',
      load: fakeWidget,
      build: async () => timeline,
      tapUrl: (props, index) => `fold://memory/${props.id}?at=${index}`,
    });
    expect(surface.tapUrl(0)).toBe('fold://');
    await surface.sync(context, 'android');
    expect(surface.tapUrl(2)).toBe('fold://memory/7?at=2');
  });

  it('pushes nothing for an empty timeline', async () => {
    const load = vi.fn(fakeWidget);
    await defineSurface({ name: 'Test', load, build: async () => [] }).sync(context, 'ios');
    expect(load).not.toHaveBeenCalled();
  });
});
