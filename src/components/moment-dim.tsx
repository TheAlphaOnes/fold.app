/**
 * MomentDim — the brief screen dim behind every small celebration (the
 * share bird, the save sparkle), so the moment always reads over busy
 * photos or the list. Black in both themes; the moment on top is drawn in
 * white.
 *
 * Fades in fast, holds while the moment plays, then clears a little slower.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

export const MOMENT_DIM_OPACITY = 0.5;
/** What moments draw in, on top of the dim. */
export const MOMENT_INK = '#FFFFFF';

const IN_MS = 240;
const OUT_MS = 380;

/** delayMs lets a moment wait out a closing screen before it dims. */
export function MomentDim({ holdMs, delayMs = 0 }: { holdMs: number; delayMs?: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withSequence(
        withTiming(MOMENT_DIM_OPACITY, { duration: IN_MS, easing: Easing.out(Easing.cubic) }),
        withDelay(holdMs, withTiming(0, { duration: OUT_MS })),
      ),
    );
  }, [holdMs, delayMs, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, style]} />;
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#000' },
});
