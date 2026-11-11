/**
 * takeShotAsShown — a photo of exactly what the viewfinder showed, used by
 * every camera in the app so what you frame is what you get.
 *
 * The camera preview fills its view with "cover" (scaled, centred, edges
 * cropped), so the full photo is wider or taller than what was on screen;
 * this crops it to the visible part. When the photo can't be the preview's
 * picture at all (a simulator camera hands back a different, sideways
 * frame), a snapshot of the viewfinder taken on the same press is used.
 */

import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { CameraView } from 'expo-camera';
import { ImageManipulator, type ImageRef } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';

import { photoCropFor, photoMatchesPreview, type Size } from '@/stamps/geometry';

export interface ShotAsShown {
  /** The visible frame, decoded; `view` maps onto it at `scale` pixels per point. */
  image: ImageRef;
  scale: number;
}

export async function takeShotAsShown(camera: CameraView, container: RefObject<React.ComponentRef<typeof View> | null>, view: Size): Promise<ShotAsShown> {
  // Started on the same press, before the photo, in case the photo turns out unusable.
  const shown = captureRef(container, { format: 'jpg', quality: 0.95 }).catch(() => null);
  const shot = await camera.takePictureAsync({ quality: 0.92 });
  // The decoded size (orientation applied) can differ from what the camera reports.
  const upright = await ImageManipulator.manipulate(shot.uri).renderAsync();
  const photo = { width: upright.width, height: upright.height };

  if (photoMatchesPreview(photo, view)) {
    const crop = photoCropFor(photo, view, { x: 0, y: 0, ...view });
    const image = await ImageManipulator.manipulate(upright).crop(crop).renderAsync();
    return { image, scale: image.width / view.width };
  }
  const snapshot = await shown;
  if (!snapshot) throw new Error('The photo did not match the viewfinder and no snapshot was available');
  const image = await ImageManipulator.manipulate(snapshot).renderAsync();
  return { image, scale: image.width / view.width };
}
