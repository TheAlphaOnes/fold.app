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
  type: 'image' | 'video';
  width: number;
  height: number;
  isCinematic?: boolean;
}

let _pending: PendingMedia | null = null;

export function setPendingCameraMedia(media: PendingMedia): void {
  _pending = media;
}

export function consumePendingCameraMedia(): PendingMedia | null {
  const media = _pending;
  _pending = null;
  return media;
}
