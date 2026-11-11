/**
 * Pure helpers for stamps: cutting the photo to the camera's stamp window,
 * the hand-placed tilt of each stamp, and fitting the map to the places.
 * Pure, so they're unit tested.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/**
 * The part of a photo that showed inside `window` on a preview of size
 * `view` drawn with "cover" (scaled to fill, centred, overflow cropped).
 * Returned in photo pixels, clamped to the photo.
 */
export function photoCropFor(photo: Size, view: Size, window: Rect): { originX: number; originY: number; width: number; height: number } {
  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const offsetX = (view.width - photo.width * scale) / 2;
  const offsetY = (view.height - photo.height * scale) / 2;
  const originX = Math.max(0, Math.round((window.x - offsetX) / scale));
  const originY = Math.max(0, Math.round((window.y - offsetY) / scale));
  const width = Math.min(photo.width - originX, Math.round(window.width / scale));
  const height = Math.min(photo.height - originY, Math.round(window.height / scale));
  return { originX, originY, width, height };
}

/** A stamp's resting tilt in degrees (-4…4), the same every time for a stamp. */
export function stampTilt(id: number): number {
  return (((id * 37) % 9) - 4) * 1;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * A camera position showing every place: the middle of their bounds, zoomed
 * so the widest span fits (one place gets a city-level view).
 */
export function regionFor(points: { latitude: number; longitude: number }[]): MapRegion | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  // Each zoom level halves the span shown; 360° is the whole world at 0.
  // A margin of 1.6× keeps the outer pins off the edges.
  const zoom = span === 0 ? 11 : Math.max(1, Math.min(11, Math.log2(360 / (span * 1.6))));
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, zoom };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The postmark's date: "10 NOV 2026". */
export function postmarkDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** How many distinct places (by name) a collection covers. */
export function placeCount(stamps: { place: string }[]): number {
  return new Set(stamps.map((s) => s.place.toLowerCase())).size;
}

/** One place's stamps, newest first; the collection shows the newest as its tile. */
export interface PlaceGroup<T extends { place: string; createdAt: number }> {
  /** The place as the newest stamp spells it. */
  place: string;
  /** Every stamp of this place, newest first. */
  stamps: T[];
  /** The stamp the tile shows. */
  newest: T;
}

/**
 * The collection as places: stamps of the same place (by name, any case)
 * club together under their newest one, and the places run newest first.
 */
export function groupByPlace<T extends { place: string; createdAt: number }>(stamps: T[]): PlaceGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const stamp of stamps) {
    const key = stamp.place.toLowerCase();
    const list = groups.get(key);
    if (list) list.push(stamp);
    else groups.set(key, [stamp]);
  }
  return [...groups.values()]
    .map((list) => {
      const ordered = [...list].sort((a, b) => b.createdAt - a.createdAt);
      return { place: ordered[0].place, stamps: ordered, newest: ordered[0] };
    })
    .sort((a, b) => b.newest.createdAt - a.newest.createdAt);
}

/** Postmark inks: the muted colours real cancellation marks come in (no orange). */
export const POSTMARK_INKS = ['#1C1B18', '#2B4C7E', '#7A2E2E', '#2F5D50', '#4B3F72'] as const;

/** Each place gets its own ink, the same every time, so a collection reads varied. */
export function postmarkInk(place: string): string {
  let h = 0;
  for (const ch of place.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return POSTMARK_INKS[h % POSTMARK_INKS.length];
}

/** A stamp's number in the collection, in the order they were made: 1 is the first. */
export function stampSerial(stamps: { id: number; createdAt: number }[], id: number): number {
  const target = stamps.find((s) => s.id === id);
  if (!target) return stamps.length + 1;
  return stamps.filter((s) => s.createdAt < target.createdAt || (s.createdAt === target.createdAt && s.id <= target.id)).length;
}

/** "No. 007". */
export function formatSerial(serial: number): string {
  return `No. ${String(serial).padStart(3, '0')}`;
}

/** Whether a place is new to the collection (no stamp of it yet). */
export function isNewPlace(stamps: { place: string }[], place: string): boolean {
  return !stamps.some((s) => s.place.toLowerCase() === place.toLowerCase());
}

/** The largest centred rectangle of `aspect` (height ÷ width) inside a photo, in photo pixels. */
export function centreCropFor(photo: Size, aspect: number): { originX: number; originY: number; width: number; height: number } {
  let width = photo.width;
  let height = Math.round(width * aspect);
  if (height > photo.height) {
    height = photo.height;
    width = Math.round(height / aspect);
  }
  return { originX: Math.round((photo.width - width) / 2), originY: Math.round((photo.height - height) / 2), width, height };
}

/**
 * The crop for a stamp shot: what the window showed, when the photo matches
 * the preview's orientation (it does on phones); otherwise the preview can't
 * be trusted to show this photo (simulators hand back a different frame),
 * so the largest centred stamp-shaped piece is used instead of a sliver.
 */
/** Whether a photo can be the picture a preview of `view` showed (same orientation). */
export function photoMatchesPreview(photo: Size, view: Size): boolean {
  return photo.height >= photo.width === view.height >= view.width;
}

export function stampCropFor(photo: Size, view: Size, window: Rect): { originX: number; originY: number; width: number; height: number } {
  if (!photoMatchesPreview(photo, view)) return centreCropFor(photo, window.height / window.width);
  return photoCropFor(photo, view, window);
}
