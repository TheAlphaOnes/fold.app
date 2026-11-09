/**
 * Templates: what each one is called, and how a canvas is (re)built for it
 * from the memory's media. Switching templates keeps every text layer and
 * sticker; only the base (background, cells) is rebuilt.
 */

import { NO_CROP, type CanvasDoc, type GridLayoutId, type Layer, type TemplateId } from '@/canvas/types';
import { SAFE_ZONE, newId } from '@/canvas/geometry';
import { GRID_LAYOUTS, gridForCount, gridLayout } from '@/templates/grids';
import type { MediaElement } from '@/types/journal';

export interface TemplateInfo {
  id: TemplateId;
  name: string;
}

export const BASE_TEMPLATES: readonly TemplateInfo[] = [
  { id: 'story', name: 'Story' },
  { id: 'text', name: 'Text' },
  { id: 'stickers', name: 'Stickers' },
];

export const GRID_TEMPLATES: readonly TemplateInfo[] = GRID_LAYOUTS.map((g) => ({
  id: `grid:${g.id}` as TemplateId,
  name: g.name,
}));

export function isGrid(template: TemplateId): template is `grid:${GridLayoutId}` {
  return template.startsWith('grid:');
}

export function gridIdOf(template: TemplateId): GridLayoutId | null {
  return isGrid(template) ? (template.slice(5) as GridLayoutId) : null;
}

export function templateName(template: TemplateId): string {
  return [...BASE_TEMPLATES, ...GRID_TEMPLATES].find((t) => t.id === template)?.name ?? 'Story';
}

/** Photos and videos, the media a background or cell can show. */
export function visualMedia(media: MediaElement[]): MediaElement[] {
  return media.filter((m) => (m.type === 'image' || m.type === 'video') && !m.isGif);
}

/** Template that suits what's been added (plan D5). */
export function suggestTemplate(media: MediaElement[]): TemplateId {
  const visual = visualMedia(media).length;
  if (visual === 0) return 'text';
  if (visual === 1) return 'story';
  return `grid:${gridForCount(visual)}`;
}

/** Media ids placed by the base (background or cells) of a doc. */
export function baseMediaIds(doc: CanvasDoc): Set<string> {
  const ids = new Set<string>();
  if (doc.background.kind === 'media') ids.add(doc.background.mediaId);
  for (const c of doc.cells ?? []) if (c.mediaId) ids.add(c.mediaId);
  return ids;
}

/**
 * Rebuilds `doc` for `template`, keeping its layers. Visual media not shown
 * by the new base stays reachable: in Stickers it becomes photo stickers;
 * elsewhere unplaced media simply waits (it's still in mediaElements and
 * comes back when switching to a template with room for it).
 */
export function applyTemplate(doc: CanvasDoc, template: TemplateId, media: MediaElement[]): CanvasDoc {
  const visual = visualMedia(media);
  // Keep non-photo layers; photo stickers are rebuilt for Stickers below.
  const keptLayers: Layer[] = doc.layers.filter((l) => l.kind !== 'media' || template !== 'stickers');

  if (template === 'story') {
    const first = visual[0];
    return {
      version: 1,
      template,
      background: first ? { kind: 'media', mediaId: first.id, crop: NO_CROP } : { kind: 'stripes' },
      layers: keptLayers,
    };
  }

  if (template === 'text') {
    return { version: 1, template, background: { kind: 'stripes' }, layers: keptLayers };
  }

  if (template === 'stickers') {
    const already = new Set(doc.layers.filter((l) => l.kind === 'media').map((l) => (l as { mediaId: string }).mediaId));
    const stickers: Layer[] = doc.layers.filter((l) => l.kind === 'media');
    visual
      .filter((m) => !already.has(m.id))
      .forEach((m, i) => stickers.push(scatterSticker(m.id, stickers.length + i)));
    return {
      version: 1,
      template,
      background: { kind: 'stripes' },
      layers: [...stickers, ...keptLayers.filter((l) => l.kind !== 'media')],
    };
  }

  // Grids: fill cells in order, keeping each photo's crop where it was already placed.
  const layout = gridLayout(gridIdOf(template)!);
  const previous = new Map((doc.cells ?? []).filter((c) => c.mediaId).map((c) => [c.mediaId!, c]));
  const cells = layout.cells.map((cell, i) => {
    const m = visual[i];
    const before = m ? previous.get(m.id) : undefined;
    return { cellId: cell.id, mediaId: m?.id, crop: before?.crop ?? NO_CROP, mirrored: before?.mirrored };
  });
  return {
    version: 1,
    template,
    background: { kind: 'color', color: layout.decor === 'film' ? '#0B0B0B' : layout.decor === 'polaroid' ? '#E9E4DA' : '#0B0B0B' },
    cells,
    gap: doc.gap ?? (layout.decor ? 'none' : 'thin'),
    layers: keptLayers,
  };
}

/** A fresh canvas for new media, before the user has designed anything. */
export function newDoc(media: MediaElement[], template: TemplateId = suggestTemplate(media)): CanvasDoc {
  return applyTemplate({ version: 1, template, background: { kind: 'stripes' }, layers: [] }, template, media);
}

/** A loose, tidy scatter for photo stickers added one after another. */
export function scatterSticker(mediaId: string, index: number): Layer {
  const spots = [
    { x: 0.32, y: 0.3 },
    { x: 0.68, y: 0.38 },
    { x: 0.36, y: 0.62 },
    { x: 0.66, y: 0.7 },
    { x: 0.5, y: 0.48 },
    { x: 0.28, y: 0.8 },
  ];
  const spot = spots[index % spots.length];
  const tilt = [-6, 4, -3, 7, -2, 5][index % 6];
  return { id: newId(), kind: 'media', mediaId, shape: 'rounded', x: spot.x, y: spot.y, scale: 1, rotation: tilt };
}

/** Where new text goes on a template by default. */
export function defaultTextSpot(template: TemplateId): { x: number; y: number } {
  const grid = gridIdOf(template);
  if (grid) return gridLayout(grid).textAnchor;
  if (template === 'story') return { x: 0.5, y: 1 - SAFE_ZONE.bottom - 0.08 };
  return { x: 0.5, y: 0.5 };
}
