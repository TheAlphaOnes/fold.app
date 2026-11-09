/**
 * MomentStreak — the streak moment: a short row of tick bars (the profile's
 * Continuum) rise one after another; the last, today's, lights up taller.
 * White on MomentDim.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { MOMENT_INK } from '@/components/moment-dim';

const TICKS = 7;
const STEP_MS = 55;

function Tick({ index, delayMs, today, onDone }: { index: number; delayMs: number; today: boolean; onDone?: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs + index * STEP_MS,
      withTiming(1, { duration: today ? 420 : 260, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: t.value * (today ? 1 : 0.45),
    transform: [{ translateY: (1 - t.value) * 10 }, { scaleY: 0.3 + t.value * 0.7 }],
  }));
  return <Animated.View style={[styles.tick, today && styles.today, style]} />;
}

export function MomentStreak({ delayMs, onComplete }: { delayMs: number; onComplete?: () => void }) {
  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: TICKS }, (_, i) => (
        <Tick key={i} index={i} delayMs={delayMs} today={i === TICKS - 1} onDone={i === TICKS - 1 ? onComplete : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 44 },
  tick: { width: 4, height: 28, borderRadius: 2, backgroundColor: MOMENT_INK },
  today: { height: 44 },
});
