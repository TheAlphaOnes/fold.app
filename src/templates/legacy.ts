/**
 * Memories made before templates have no saved canvas. canvasOf() gives
 * every memory one: the saved layout if there is one, otherwise a canvas
 * built from the old fields that looks like the card did:
 *
 *   text only            → Text   (centred text on the stripes)
 *   one photo/video      → Story  (media full-bleed, text near the bottom)
 *   one song/voice note  → Story  (disc in the middle on the stripes)
 *   several media        → Stickers (positions converted from pixels)
 *
 * Nothing in the database is rewritten; a memory gets a saved layout the
 * first time it's edited in the new composer.
 */

import { NO_CROP, type CanvasDoc, type Layer } from '@/canvas/types';
import type { Composition, MediaElement } from '@/types/journal';
import { TEMPLATE_ALIASES } from '@/templates/arrangements';
import { stickerFrame } from '@/utils/sticker-layout';

/** The card size old pixel positions were laid out against. */
export interface LegacyCard {
  width: number;
  height: number;
}

function textLayerFrom(memory: Composition, cardWidth: number, y: number, fallbackSize: number): Layer | null {
  const text = memory.textContent?.trim();
  if (!text) return null;
  return {
    id: 'legacy-text',
    kind: 'text',
    text,
    font: memory.fontFamily || 'JetBrainsMono-Regular',
    color: memory.textColor ?? null,
    align: 'center',
    style: 'plain',
    size: (memory.fontSize || fallbackSize) / cardWidth,
    x: 0.5,
    y,
    scale: 1,
    rotation: 0,
  };
}

function stickerFrom(m: MediaElement, card: LegacyCard): Layer {
  const frame = stickerFrame(m);
  const scale = m.scale ?? 1;
  const w = frame.width * scale;
  const h = frame.height * scale;
  const x = (m.x_pos + w / 2) / card.width;
  const y = (m.y_pos + h / 2) / card.height;
  const base = {
    id: `legacy-${m.id}`,
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    // Renderers size stickers from their frame; scale carries over as-is.
    scale,
    rotation: 0,
  };
  return m.type === 'audio'
    ? { ...base, kind: 'audio', mediaId: m.id }
    : { ...base, kind: 'media', mediaId: m.id, shape: 'rounded', auto: true };
}

export function legacyCanvas(memory: Composition, card: LegacyCard): CanvasDoc {
  const media = memory.mediaElements ?? [];
  const text = (y: number, size: number) => textLayerFrom(memory, card.width, y, size);

  if (media.length === 0) {
    const t = text(0.5, 21);
    return { version: 1, template: 'text', background: { kind: 'stripes' }, layers: t ? [t] : [] };
  }

  if (media.length === 1) {
    const m = media[0];
    if (m.type === 'audio') {
      const t = text(0.78, 18);
      const disc: Layer = { id: `legacy-${m.id}`, kind: 'audio', mediaId: m.id, x: 0.5, y: 0.42, scale: 1.6, rotation: 0 };
      return { version: 1, template: 'story', background: { kind: 'stripes' }, layers: t ? [disc, t] : [disc] };
    }
    const t = text(0.8, 18);
    return {
      version: 1,
      template: 'story',
      background: { kind: 'media', mediaId: m.id, crop: NO_CROP },
      layers: t ? [{ ...t, style: 'highlight' } as Layer] : [],
    };
  }

  const ordered = [...media].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const t = text(0.5, 21);
  return {
    version: 1,
    template: 'stickers',
    background: { kind: 'stripes' },
    layers: [...(t ? [t] : []), ...ordered.map((m) => stickerFrom(m, card))],
  };
}

/** Every memory's canvas: saved, or built from its old fields. */
export function canvasOf(memory: Composition, card: LegacyCard): CanvasDoc {
  const layout = memory.layout;
  if (!layout) return legacyCanvas(memory, card);
  // A template that was retired opens as the one that replaced it.
  const alias = TEMPLATE_ALIASES[layout.template as string];
  return alias ? { ...layout, template: alias } : layout;
}
