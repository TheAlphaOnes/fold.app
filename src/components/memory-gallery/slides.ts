/**
 * The pages of a memory's gallery, in order: its words first (if any),
 * then every photo, video, GIF and song, one per page, then each doodle
 * drawn on its canvas. A stamp placed as a sticker shows as the stamp it
 * is (perforations, place, postmark), not as a bare photo.
 */

import type { DoodleLayer } from '@/canvas/types';
import type { Composition, MediaElement } from '@/types/journal';

export type GallerySlide =
  | { type: 'text'; id: string; text: string; fontFamily?: string; fontSize?: number; textColor?: string }
  | { type: 'media'; id: string; media: MediaElement }
  | { type: 'stamp'; id: string; imageUri: string; place: string; stampedAt: number }
  | { type: 'doodle'; id: string; layer: DoodleLayer };

export function gallerySlides(memory: Pick<Composition, 'textContent' | 'fontFamily' | 'fontSize' | 'textColor' | 'mediaElements' | 'layout'>): GallerySlide[] {
  const layers = memory.layout?.layers ?? [];
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
  for (const media of memory.mediaElements) {
    if (media.isStamp) {
      const placed = layers.find((l) => l.kind === 'stamp' && l.mediaId === media.id);
      if (placed?.kind === 'stamp') slides.push({ type: 'stamp', id: `stamp-${media.id}`, imageUri: media.uri, place: placed.place, stampedAt: placed.stampedAt });
      continue;
    }
    slides.push({ type: 'media', id: `media-${media.id}`, media });
  }
  for (const layer of layers) if (layer.kind === 'doodle') slides.push({ type: 'doodle', id: `doodle-${layer.id}`, layer });
  return slides;
}
