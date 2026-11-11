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
 * it immediately instead of waiting.
 */

import { lazy, Suspense, useEffect, useState } from 'react';

import { useProfileVisibility } from '@/hooks/use-profile-visibility';

const ProfileScreen = lazy(() => import('./profile-screen'));

/** Don't wait on idle forever to prewarm the layer. */
const PREWARM_FALLBACK_MS = 1200;

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
    <Suspense fallback={null}>
      <ProfileScreen />
    </Suspense>
  );
}
