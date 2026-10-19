/**
 * Startup permissions — on first launch after onboarding, Fold asks for
 * everything it uses in one pass, so no prompt interrupts a capture later.
 *
 * Asked in the order the features matter: notifications (the daily
 * moments), camera, microphone, photos (saving memories out), location
 * (auto-tagging). Each prompt only appears if the system has not decided
 * yet, so this is safe to run again. Vibration needs no prompt: Android
 * grants it at install and iOS has no such permission.
 */

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { AudioModule } from 'expo-audio';

import { requestReminderPermission } from '@/services/reminders.service';
import { track, trackError } from '@/services/analytics';

export interface StartupPermissions {
  notifications: boolean;
  camera: boolean;
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
  const notifications = await requestReminderPermission();
  const camera = await granted('camera', ImagePicker.requestCameraPermissionsAsync);
  const microphone = await granted('microphone', AudioModule.requestRecordingPermissionsAsync);
  const photos = await granted('photos', () => MediaLibrary.requestPermissionsAsync());
  const locationBefore = await Location.getForegroundPermissionsAsync().catch(() => null);
  const location = await granted('location', Location.requestForegroundPermissionsAsync);

  track('startup_permissions', { notifications, camera, microphone, photos, location });
  return {
    notifications,
    camera,
    microphone,
    photos,
    location,
    locationNewlyGranted: location && locationBefore?.status === Location.PermissionStatus.UNDETERMINED,
  };
}
