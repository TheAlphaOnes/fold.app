/**
 * InkGain — after a save, the ink it earned slides out from beside the
 * profile tab, rests a moment, and drifts away. No overlay, no sound,
 * nothing to dismiss: the Continuum card on the profile is where it adds up.
 *
 * It waits until home is in view and the new memory's own card animation
 * has played, so the two never compete. Segments finish at different rates:
 * opacity resolves first, the slide settles after, the exit lifts and fades.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { EDGE_TAB_HEIGHT, EDGE_TAB_WIDTH } from '@/components/edge-tab';
import { EASE_IN, EASE_OUT } from '@/constants/motion';
import { useJournalStore } from '@/hooks/use-journal';
import { useProgressionStore, type InkGain as Gain } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';

/** Lets the new memory's card scroll in and settle first. */
const SETTLE_MS = 900;
const HOLD_MS = 1500;
const PILL_HEIGHT = 26;

function GainPill({ gain, onDone }: { gain: Gain; onDone: (id: number) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() ?? false;

  const opacity = useSharedValue(0);
  const slide = useSharedValue(reduceMotion ? 0 : 10);
  const lift = useSharedValue(0);

  useEffect(() => {
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(onDone)(gain.id);
    };
    opacity.value = withSequence(
      withTiming(1, { duration: 180, easing: EASE_OUT }),
      withDelay(HOLD_MS, withTiming(0, { duration: 260, easing: EASE_IN }, finish)),
    );
    if (reduceMotion) return;
    slide.value = withTiming(0, { duration: 420, easing: EASE_OUT });
    lift.value = withDelay(180 + HOLD_MS, withTiming(-6, { duration: 260, easing: EASE_IN }));
  }, [gain.id, lift, onDone, opacity, reduceMotion, slide]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slide.value }, { translateY: lift.value }],
  }));

  const top = Math.max(insets.top, 20) + (EDGE_TAB_HEIGHT - PILL_HEIGHT) / 2;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`plus ${gain.points} ink`}
      style={[
        s.pill,
        { top, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
    >
      <ThemedText style={[s.text, { color: theme.accentWarm }]}>{`+${gain.points}`}</ThemedText>
    </Animated.View>
  );
}

export function InkGain() {
  const gain = useProgressionStore((state) => state.gain);
  const clearGain = useProgressionStore((state) => state.clearGain);
  const appVisible = useJournalStore((state) => state.isAppVisible);
  const pathname = usePathname();

  const ready = gain !== null && appVisible && pathname === '/';
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Each new gain waits its own settle, even if the last one just played.
    setSettled(false);
    if (!ready) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ready, gain?.id]);

  if (!ready || !settled || !gain) return null;
  return <GainPill key={gain.id} gain={gain} onDone={clearGain} />;
}

const s = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: EDGE_TAB_WIDTH + 8,
    zIndex: 100,
    height: PILL_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
