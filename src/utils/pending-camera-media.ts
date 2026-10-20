/**
 * A module-level store for passing camera media between screens.
 *
 * Why not URL params?
 * Expo Router encodes params into URLs. File:// URIs with slashes and colons
 * get percent-encoded and the useState() initializer in the target screen
 * may fire before params are hydrated, silently producing an empty array.
 *
 * This is the correct pattern for passing non-serialisable or large data
 * between screens: store it in a module variable, read + clear it on mount.
 */

export interface PendingMedia {
  uri: string;
  type: 'image' | 'video' | 'audio';
  width?: number;
  height?: number;
}

let _pending: PendingMedia[] = [];

/** One capture from the camera, or every file shared into Fold at once. */
export function setPendingCameraMedia(media: PendingMedia | PendingMedia[]): void {
  _pending = Array.isArray(media) ? media : [media];
}

export function consumePendingCameraMedia(): PendingMedia[] {
  const media = _pending;
  _pending = [];
  return media;
}
