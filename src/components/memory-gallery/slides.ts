/**
 * The pages of a memory's gallery, in order: its words first (if any),
 * then every photo, video, GIF and song, one per page.
 */

import type { Composition, MediaElement } from '@/types/journal';

export type GallerySlide =
  | { type: 'text'; id: string; text: string; fontFamily?: string; fontSize?: number; textColor?: string }
  | { type: 'media'; id: string; media: MediaElement };

export function gallerySlides(memory: Pick<Composition, 'textContent' | 'fontFamily' | 'fontSize' | 'textColor' | 'mediaElements'>): GallerySlide[] {
  const slides: GallerySlide[] = [];
  if (memory.textContent.trim()) {
    slides.push({
      type: 'text',
      id: 'text',
      text: memory.textContent,
      fontFamily: memory.fontFamily,
      fontSize: memory.fontSize,
      textColor: memory.textColor,
    });
  }
  for (const media of memory.mediaElements) slides.push({ type: 'media', id: `media-${media.id}`, media });
  return slides;
}
