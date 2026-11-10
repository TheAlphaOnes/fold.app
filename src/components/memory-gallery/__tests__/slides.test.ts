import { describe, expect, it } from 'vitest';
import { gallerySlides } from '@/components/memory-gallery/slides';
import type { MediaElement } from '@/types/journal';

const media = (id: string, type: MediaElement['type'] = 'image'): MediaElement => ({ id, uri: `${id}`, type, x_pos: 0, y_pos: 0 });
const memory = (textContent: string, mediaElements: MediaElement[]) => ({ textContent, fontFamily: 'JetBrainsMono-Medium', fontSize: 24, mediaElements });

describe('gallerySlides', () => {
  it('puts the words first, then each media in order', () => {
    const slides = gallerySlides(memory('hello', [media('a'), media('b', 'video'), media('c', 'audio')]));
    expect(slides.map((s) => s.id)).toEqual(['text', 'media-a', 'media-b', 'media-c']);
  });

  it('skips the text page when there are no words', () => {
    expect(gallerySlides(memory('   ', [media('a')])).map((s) => s.type)).toEqual(['media']);
  });

  it('is empty for an empty memory', () => {
    expect(gallerySlides(memory('', []))).toEqual([]);
  });
});

describe('gallerySlides: canvas pieces', () => {
  const base = { textContent: '', fontFamily: undefined, fontSize: undefined, textColor: undefined };
  it('gives each doodle its own page, after the media', () => {
    const doodle = { id: 'd1', kind: 'doodle' as const, strokes: [{ points: [0, 0, 0.1, 0.1] }], color: null, width: 0.01, x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    const slides = gallerySlides({ ...base, mediaElements: [{ id: 'm1', uri: 'a.jpg', type: 'image', x_pos: 0, y_pos: 0 }], layout: { version: 1, template: 'story', background: { kind: 'stripes' }, layers: [doodle] } });
    expect(slides.map((s) => s.type)).toEqual(['media', 'doodle']);
  });
  it('shows a placed stamp as a stamp, not a photo', () => {
    const slides = gallerySlides({
      ...base,
      mediaElements: [{ id: 's1', uri: 's.jpg', type: 'image', isStamp: true, x_pos: 0, y_pos: 0 }],
      layout: { version: 1, template: 'story', background: { kind: 'stripes' }, layers: [{ id: 'l', kind: 'stamp', mediaId: 's1', place: 'Pune', stampedAt: 1, x: 0.5, y: 0.5, scale: 1, rotation: 0 }] },
    });
    expect(slides).toEqual([{ type: 'stamp', id: 'stamp-s1', imageUri: 's.jpg', place: 'Pune', stampedAt: 1 }]);
  });
});
