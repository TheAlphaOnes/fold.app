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
