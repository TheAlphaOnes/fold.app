/**
 * ProfileLayer — the profile, mounted once and kept alive for the session.
 *
 * Expo Router unmounts a popped route, so the profile used to be rebuilt on
 * every open: the module graph, the MapLibre view, the calendar's photos.
 * Home hosts this layer instead, and the profile tab only flips the
 * visibility store — the screen itself slides in on the UI thread.
 *
 * The screen is imported lazily and mounted at the first idle moment after
 * launch (with the same fallback the launch warm-up uses), so its module
 * graph — MapLibre included — stays out of the launch bundle and the first
 * open is as ready as every later one. A tap that beats the warm-up mounts
 * it immediately instead of waiting, and the warm-up backdrop below keeps
 * that moment from looking stuck.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/constants/motion';
import { useProfileVisibility } from '@/hooks/use-profile-visibility';
import { useTheme } from '@/hooks/use-theme';

const ProfileScreen = lazy(() => import('./profile-screen'));

/** Don't wait on idle forever to prewarm the layer. */
const PREWARM_FALLBACK_MS = 1200;

/**
 * The only loading state this screen can still show: a tap that beat the
 * warm-up while the layer's module was still loading. In a release build
 * the module is already in the bundle, so this barely ever appears; dev
 * pays the evaluation. The delayed fade keeps a quick load from flashing
 * at all — the backdrop only reads as visible when there is a real wait.
 */
function WarmupBackdrop() {
  const theme = useTheme();
  return (
    <Animated.View
      entering={fadeIn(200, 120)}
      style={[styles.backdrop, { backgroundColor: theme.background }]}
    >      <ActivityIndicator size="small" color={theme.textMuted} />
    </Animated.View>
  );
}

export function ProfileLayer() {
  const [prewarmed, setPrewarmed] = useState(false);
  // A tap can beat the prewarm; mounting then is still a win — the layer
  // slides in the moment the module is in.
  const open = useProfileVisibility((state) => state.open);

  useEffect(() => {
    const idle = requestIdleCallback(() => setPrewarmed(true));
    const fallback = setTimeout(() => setPrewarmed(true), PREWARM_FALLBACK_MS);
    return () => {
      cancelIdleCallback(idle);
      clearTimeout(fallback);
    };
  }, []);

  if (!prewarmed && !open) return null;

  return (
    <Suspense fallback={open ? <WarmupBackdrop /> : null}>
      <ProfileScreen />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
