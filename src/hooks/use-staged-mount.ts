/**
 * useStagedMount — lets a heavy screen open smoothly. Nothing past the
 * first stage mounts until the screen's push transition has finished; then
 * one more stage mounts per frame, so the work spreads across frames
 * instead of landing on the frames that animate the transition.
 */

import { useEffect, useState } from 'react';
import { useNavigation, type NativeStackNavigationProp } from 'expo-router';

/** If the navigator never reports the transition (e.g. a cold deep link), start anyway. */
const FALLBACK_MS = 500;

/** Returns how many of `stages` may render now, counting up from 0 to `stages`. */
export function useStagedMount(stages: number): number {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [settled, setSettled] = useState(false);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const settle = () => setSettled(true);
    const timer = setTimeout(settle, FALLBACK_MS);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) settle();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (!settled || revealed >= stages) return;
    const frame = requestAnimationFrame(() => setRevealed((n) => n + 1));
    return () => cancelAnimationFrame(frame);
  }, [settled, revealed, stages]);

  return revealed;
}
