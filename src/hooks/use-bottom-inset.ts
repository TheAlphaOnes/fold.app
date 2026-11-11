/**
 * useBottomInset — the space to keep clear at the bottom of a screen.
 *
 * On Android the app hides the navigation bar (immersive mode), so the safe
 * area reports no bottom inset even though the system gesture handle still
 * floats over the app. Keep a gesture-height gap so controls and peeking
 * content never sit under it. iOS keeps its real home-indicator inset.
 */

import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Android's gesture-navigation handle strip (24dp). */
const ANDROID_GESTURE_INSET = 24;

export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'android' ? ANDROID_GESTURE_INSET : 0);
}
