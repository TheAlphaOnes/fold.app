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
