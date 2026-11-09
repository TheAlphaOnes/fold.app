import type { CanvasDoc, Layer } from '@/canvas/types';
import type { Composition, MediaElement } from '@/types/journal';

export const image = (id: string, extra: Partial<MediaElement> = {}): MediaElement => ({
  id,
  uri: `file://${id}.jpg`,
  type: 'image',
  x_pos: 0,
  y_pos: 0,
  ...extra,
});

export const video = (id: string, extra: Partial<MediaElement> = {}): MediaElement =>
  image(id, { type: 'video', uri: `file://${id}.mp4`, ...extra });

export const audio = (id: string, extra: Partial<MediaElement> = {}): MediaElement =>
  image(id, { type: 'audio', uri: `file://${id}.m4a`, ...extra });

export const gif = (id: string): MediaElement => image(id, { isGif: true });

export const composition = (extra: Partial<Composition> = {}): Composition => ({
  id: 1,
  textContent: '',
  mediaElements: [],
  createdAt: 0,
  fontFamily: 'JetBrainsMono-Regular',
  fontSize: 20,
  storyIds: [],
  ...extra,
});

export const textLayer = (id = 't1'): Layer => ({
  id,
  kind: 'text',
  text: 'hello',
  font: 'JetBrainsMono-Regular',
  color: null,
  align: 'center',
  style: 'plain',
  size: 0.06,
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
});

export const baseLayer = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
export const dateLayer = (): Layer => ({ id: 'd1', kind: 'date', style: 'stamp', ...baseLayer });
export const locationLayer = (): Layer => ({ id: 'l1', kind: 'location', ...baseLayer });
export const audioLayer = (mediaId = 'a1'): Layer => ({ id: 'au1', kind: 'audio', mediaId, ...baseLayer });

export const emptyDoc = (layers: Layer[] = []): CanvasDoc => ({
  version: 1,
  template: 'story',
  background: { kind: 'stripes' },
  layers,
});
