/**
 * Hands a photo or video from the in-app camera (/capture) back to the
 * screen that opened it. Same pattern as pending-camera-media: a module-level
 * slot, because file URIs don't survive being URL params. The opener awaits
 * `awaitCapture()`; the camera calls `resolveCapture()` once, with the shot
 * or null if it was closed.
 */

export interface CapturedMedia {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

let waiting: ((result: CapturedMedia | null) => void) | null = null;

/** Resolves when the camera closes. A second call supersedes the first (which gets null). */
export function awaitCapture(): Promise<CapturedMedia | null> {
  waiting?.(null);
  return new Promise((resolve) => {
    waiting = resolve;
  });
}

/** Whether a screen is waiting for this capture (otherwise the camera continues to compose). */
export function hasCaptureWaiter(): boolean {
  return waiting !== null;
}

export function resolveCapture(result: CapturedMedia | null): void {
  const resolve = waiting;
  waiting = null;
  resolve?.(result);
}
