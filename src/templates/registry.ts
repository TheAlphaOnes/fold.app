/**
 * Templates: what each one is called, and how a canvas is (re)built for it
 * from the memory's media. Switching templates keeps every text layer and
 * sticker; only the base (background, cells) is rebuilt.
 */

import { NO_CROP, type CanvasDoc, type CellFill, type GridLayoutId, type Layer, type MediaSticker, type TemplateId } from '@/canvas/types';
import { SAFE_ZONE, newId } from '@/canvas/geometry';
import { GRID_LAYOUTS, gridForCount, gridLayout } from '@/templates/grids';
import type { MediaElement } from '@/types/journal';

export interface TemplateInfo {
  id: TemplateId;
  name: string;
}

export const BASE_TEMPLATES: readonly TemplateInfo[] = [
  // Shown as "Canvas"; the id stays 'story' so saved memories keep working.
  { id: 'story', name: 'Canvas' },
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
  return [...BASE_TEMPLATES, ...GRID_TEMPLATES].find((t) => t.id === template)?.name ?? 'Canvas';
}

/** Photos and videos, the media a background or cell can show. */
export function visualMedia(media: MediaElement[]): MediaElement[] {
  return media.filter((m) => (m.type === 'image' || m.type === 'video') && !m.isGif);
}

/** Template that suits a number of photos (plan D5). Pass the base candidates. */
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

/** Media shown by photo stickers the user placed (not the Stickers template's own). */
function userStickerIds(doc: CanvasDoc): Set<string> {
  return new Set(doc.layers.filter((l): l is MediaSticker => l.kind === 'media' && !l.auto).map((l) => l.mediaId));
}

/** Photos/videos the base (background, cells, template stickers) may use: not GIFs, not user stickers. */
export function baseCandidates(doc: CanvasDoc, media: MediaElement[]): MediaElement[] {
  const stickers = userStickerIds(doc);
  return visualMedia(media).filter((m) => !stickers.has(m.id));
}

/** Every visual media is on the canvas somewhere (base or a sticker). */
export function placesAll(doc: CanvasDoc, media: MediaElement[]): boolean {
  const shown = baseMediaIds(doc);
  for (const l of doc.layers) if (l.kind === 'media') shown.add(l.mediaId);
  return visualMedia(media).every((m) => shown.has(m.id));
}

/**
 * Rebuilds `doc` for `template`, keeping its text, audio, place and date
 * layers and the user's own photo stickers. The base keeps what it can:
 * the Story background (and its framing) if that photo is still a
 * candidate, each grid cell's photo and crop, filling only empty cells.
 */
export function applyTemplate(doc: CanvasDoc, template: TemplateId, media: MediaElement[]): CanvasDoc {
  const candidates = baseCandidates(doc, media);
  const ids = new Set(candidates.map((m) => m.id));
  // The Stickers template's own photo stickers are rebuilt or dropped below.
  const kept: Layer[] = doc.layers.filter((l) => !(l.kind === 'media' && l.auto));

  if (template === 'story') {
    const current = doc.background.kind === 'media' && ids.has(doc.background.mediaId) ? doc.background : null;
    const first = candidates[0];
    return {
      version: 1,
      template,
      background: current ?? (first ? { kind: 'media', mediaId: first.id, crop: NO_CROP } : { kind: 'stripes' }),
      layers: kept,
    };
  }

  if (template === 'text') {
    return { version: 1, template, background: { kind: 'stripes' }, layers: kept };
  }

  if (template === 'stickers') {
    // Keep the template's existing stickers where they are; add the rest.
    const existing = doc.layers.filter((l): l is MediaSticker => l.kind === 'media' && !!l.auto && ids.has(l.mediaId));
    const placed = new Set(existing.map((l) => l.mediaId));
    const added = candidates
      .filter((m) => !placed.has(m.id))
      .map((m, i) => ({ ...(scatterSticker(m.id, existing.length + i) as MediaSticker), auto: true }));
    return { version: 1, template, background: { kind: 'stripes' }, layers: [...existing, ...added, ...kept] };
  }

  // Grids: keep each cell's photo (by cell id) while it's still a candidate; fill empties in order.
  const layout = gridLayout(gridIdOf(template)!);
  const before = new Map((doc.cells ?? []).map((c) => [c.cellId, c]));
  const keptCells = layout.cells.map((cell) => {
    const prev = before.get(cell.id);
    return prev?.mediaId && ids.has(prev.mediaId) ? prev : null;
  });
  const used = new Set(keptCells.filter(Boolean).map((c) => c!.mediaId!));
  // A photo that was the Story background brings its framing along into a cell.
  const priorCrop = new Map<string, CellFill>();
  for (const c of doc.cells ?? []) if (c.mediaId) priorCrop.set(c.mediaId, c);
  const queue = candidates.filter((m) => !used.has(m.id));
  const cells: CellFill[] = layout.cells.map((cell, i) => {
    if (keptCells[i]) return { ...keptCells[i]!, cellId: cell.id };
    const m = queue.shift();
    const prior = m ? priorCrop.get(m.id) : undefined;
    return { cellId: cell.id, mediaId: m?.id, crop: prior?.crop ?? NO_CROP, mirrored: prior?.mirrored };
  });
  return {
    version: 1,
    template,
    background: { kind: 'color', color: layout.decor === 'polaroid' ? '#E9E4DA' : '#0B0B0B' },
    cells,
    gap: doc.gap ?? (layout.decor ? 'none' : 'thin'),
    layers: kept,
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
