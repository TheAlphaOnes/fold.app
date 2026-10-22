/**
 * useTransitionDone — false while this screen is still sliding in, true once
 * the push transition has finished.
 *
 * A screen that mounts heavy content in the same frame as its push makes the
 * slide wait for it, which reads as the app freezing. Render the light shell
 * first and the heavy parts once this flips to true.
 */

import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';

/** Fallback for when no transitionEnd arrives (e.g. reduced motion, web). */
const FALLBACK_MS = 600;

export function useTransitionDone(): boolean {
  const navigation = useNavigation();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const fallback = setTimeout(() => setDone(true), FALLBACK_MS);
    const unsubscribe = navigation.addListener('transitionEnd' as never, (event: { data?: { closing?: boolean } }) => {
      if (!event.data?.closing) setDone(true);
    });
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [navigation, done]);

  return done;
}
