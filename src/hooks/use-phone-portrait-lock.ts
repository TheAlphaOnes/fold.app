/**
 * usePhonePortraitLock — keeps Android phones in portrait.
 *
 * The Android manifest leaves orientation unspecified (see
 * plugins/withAndroidFreeOrientation.js): Android 16 ignores the lock on
 * large screens anyway, and Play flags apps that declare it. So the lock is
 * applied here, only on phones, and tablets and foldables rotate freely.
 * iOS keeps its portrait lock from app.json.
 */

import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

/** Android's own phone/tablet line: smallest width under 600dp is a phone. */
const TABLET_MIN_DP = 600;

export function usePhonePortraitLock(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const { width, height } = Dimensions.get('screen');
    if (Math.min(width, height) >= TABLET_MIN_DP) return;
    // Loaded only on Android, the one platform that needs it, so iOS builds
    // made before this module existed keep running.
    const ScreenOrientation: typeof import('expo-screen-orientation') = require('expo-screen-orientation');
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((error) =>
      console.error('Failed to lock portrait', error),
    );
  }, []);
}
