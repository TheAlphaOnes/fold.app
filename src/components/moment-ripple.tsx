/**
 * MomentRipple — the default small moment: a dot pulses once and two thin
 * rings spread from it at different rates, then everything fades. White on
 * MomentDim.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MOMENT_INK } from '@/components/moment-dim';

const RING = 220;

function Ring({ delayMs, durationMs, onDone }: { delayMs: number; durationMs: number; onDone?: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.9 * (1 - t.value),
    transform: [{ scale: 0.12 + t.value * 0.88 }],
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

export function MomentRipple({ delayMs, onComplete }: { delayMs: number; onComplete?: () => void }) {
  const dot = useSharedValue(0);
  useEffect(() => {
    dot.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, [delayMs, dot]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dot.value,
    transform: [{ scale: 0.6 + dot.value * 0.4 }],
  }));

  return (
    <View style={styles.center} pointerEvents="none">
      <Ring delayMs={delayMs + 40} durationMs={1100} />
      <Ring delayMs={delayMs + 220} durationMs={1300} onDone={onComplete} />
      <Animated.View style={[styles.dot, dotStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: MOMENT_INK,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: MOMENT_INK },
});
