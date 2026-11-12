/**
 * takeShotAsShown — a photo of exactly what the viewfinder showed, used by
 * every camera in the app so what you frame is what you get.
 *
 * The camera preview fills its view with "cover" (scaled, centred, edges
 * cropped), so the full photo is wider or taller than what was on screen;
 * this crops it to the visible part.
 *
 * Two things differ between phones and both used to break the crop:
 *
 *  - The viewfinder's size. It is measured from the camera's own container
 *    at the moment of the press, never assumed to be the window: on many
 *    Android phones the window and the view that holds the camera differ.
 *  - The photo's orientation. Some phones (older Androids above all) write
 *    the pixels sideways plus an EXIF Orientation tag the decoder ignores.
 *    The tag is applied here, so the photo is upright before it is cropped.
 *
 * Only when the photo still cannot be the preview's picture (a simulator
 * camera hands back an unrelated frame) is a snapshot of the viewfinder,
 * taken on the same press, used instead.
 */

import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { CameraView } from 'expo-camera';
import { ImageManipulator, type ImageRef } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';

import { photoCropFor, photoMatchesPreview, type Size } from '@/stamps/geometry';

export interface ShotAsShown {
  /** The visible frame, decoded; the viewfinder maps onto it at `scale` pixels per point. */
  image: ImageRef;
  scale: number;
}

type Container = RefObject<React.ComponentRef<typeof View> | null>;

/** Clockwise degrees that make a photo with this EXIF Orientation upright. */
function exifRotation(orientation: unknown): number {
  switch (Number(orientation)) {
    case 3:
    case 4:
      return 180;
    case 5:
    case 6:
      return 90;
    case 7:
    case 8:
      return 270;
    default:
      return 0;
  }
}

/** The container's laid-out size, or `fallback` when it can't be measured. */
function measure(container: Container, fallback: Size): Promise<Size> {
  return new Promise((resolve) => {
    const node = container.current;
    if (!node) return resolve(fallback);
    node.measure((_x, _y, width, height) => resolve(width > 0 && height > 0 ? { width, height } : fallback));
  });
}

/**
 * @param fallbackView the viewfinder's expected size, used only if the
 *   container can't be measured. Rects the caller crops from the result
 *   must be in the container's coordinates.
 */
export async function takeShotAsShown(camera: CameraView, container: Container, fallbackView: Size): Promise<ShotAsShown> {
  const view = await measure(container, fallbackView);
  // Started on the same press, before the photo, in case the photo turns out unusable.
  const shown = captureRef(container, { format: 'jpg', quality: 0.95 }).catch(() => null);
  const shot = await camera.takePictureAsync({ quality: 0.92, exif: true });

  let upright = await ImageManipulator.manipulate(shot.uri).renderAsync();
  if (!photoMatchesPreview(upright, view)) {
    const degrees = exifRotation(shot.exif?.Orientation);
    if (degrees === 90 || degrees === 270) {
      upright = await ImageManipulator.manipulate(upright).rotate(degrees).renderAsync();
    }
  }

  if (photoMatchesPreview(upright, view)) {
    const crop = photoCropFor(upright, view, { x: 0, y: 0, ...view });
    const image = await ImageManipulator.manipulate(upright).crop(crop).renderAsync();
    return { image, scale: image.width / view.width };
  }
  const snapshot = await shown;
  if (!snapshot) throw new Error('The photo did not match the viewfinder and no snapshot was available');
  const image = await ImageManipulator.manipulate(snapshot).renderAsync();
  return { image, scale: image.width / view.width };
}
