/**
 * Startup permissions — on first launch after onboarding, Fold asks for the
 * permissions it can explain up front: microphone, photos (saving memories
 * out) and location (auto-tagging). The camera is asked the first time a
 * photo is taken, so nobody is prompted for a camera before they want one.
 *
 * Each prompt only appears if the system has not decided yet, so this is safe
 * to run again. Vibration needs no prompt: Android grants it at install and
 * iOS has no such permission.
 */

import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { AudioModule } from 'expo-audio';

import { track, trackError } from '@/services/analytics';

export interface StartupPermissions {
  microphone: boolean;
  photos: boolean;
  location: boolean;
  /** Location was undecided and has just been allowed: the user said yes to tagging. */
  locationNewlyGranted: boolean;
}

/** Runs one request; a failure counts as not granted rather than stopping the rest. */
async function granted(name: keyof StartupPermissions, request: () => Promise<{ granted: boolean }>): Promise<boolean> {
  try {
    return (await request()).granted;
  } catch (error) {
    trackError(error, `permission_${name}`);
    console.error(`Failed to request ${name} permission`, error);
    return false;
  }
}

/** Asks for each permission in turn. Never throws. */
export async function requestStartupPermissions(): Promise<StartupPermissions> {
  const microphone = await granted('microphone', AudioModule.requestRecordingPermissionsAsync);
  // Save-only: Fold saves memories to the gallery but never reads it.
  const photos = await granted('photos', () => MediaLibrary.requestPermissionsAsync(true));
  const locationBefore = await Location.getForegroundPermissionsAsync().catch(() => null);
  const location = await granted('location', Location.requestForegroundPermissionsAsync);

  track('startup_permissions', { microphone, photos, location });
  return {
    microphone,
    photos,
    location,
    locationNewlyGranted: location && locationBefore?.status === Location.PermissionStatus.UNDETERMINED,
  };
}
