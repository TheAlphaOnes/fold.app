/**
 * RewardStamp — the "FOLDED" stamp when a moment of the day is captured.
 *
 * Choreography, each part finishing at its own rate:
 *   0ms     scrim fades in
 *   60ms    the stamp drops: scale and tilt settle with a slight overshoot
 *   330ms   impact: a heavy haptic, an ink ring spreads off the edge, the burst fires
 *   380ms+  the rail, then the streak line, then the hint arrive in turn
 * It leaves on a tap or after a few seconds, faster than it came in.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
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
import { CelebrationBurst } from '@/components/celebration-burst';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { Type } from '@/constants/theme';
import { EASE_IN, EASE_OUT, SPRING_BOUNCE } from '@/constants/motion';
import { MOMENTS, getMoment, type Reward } from '@/constants/progression';

const IMPACT_MS = 330;
const AUTO_DISMISS_MS = 3400;
/** Taps this soon after appearing are the tail of the save, not a dismissal. */
const TAP_GUARD_MS = 450;

interface RewardStampProps {
  reward: Reward;
  onDone: () => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** What the stamp says under the word: what's next today, or that the day is full. */
function stampLine(reward: Reward): string {
  if (reward.done >= MOMENTS.length) {
    return `FULL DAY  ·  ${pad2(Math.max(1, reward.streak))} DAY STREAK`;
  }
  if (reward.next) return `${getMoment(reward.next).label} IS NEXT`;
  return `${reward.done} OF ${MOMENTS.length} TODAY`;
}

export function RewardStamp({ reward, onDone }: RewardStampProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const shownAt = useRef(Date.now());
  const leaving = useRef(false);

  const scrim = useSharedValue(0);
  const drop = useSharedValue(reduceMotion ? 1 : 0);
  const stampOpacity = useSharedValue(0);
  const ink = useSharedValue(0);
  const rail = useSharedValue(0);
  const line = useSharedValue(0);
  const hint = useSharedValue(0);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    hint.value = withTiming(0, { duration: 100, easing: EASE_IN });
    stampOpacity.value = withTiming(0, { duration: 140, easing: EASE_IN });
    scrim.value = withTiming(0, { duration: 200, easing: EASE_IN }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [hint, onDone, scrim, stampOpacity]);

  useEffect(() => {
    scrim.value = withTiming(1, { duration: 220, easing: EASE_OUT });
    stampOpacity.value = withDelay(60, withTiming(1, { duration: 120, easing: EASE_OUT }));
    if (!reduceMotion) {
      drop.value = withDelay(60, withTiming(1, { duration: 300, easing: SPRING_BOUNCE }));
      ink.value = withDelay(
        IMPACT_MS,
        withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 480, easing: EASE_OUT })),
      );
    }
    rail.value = withDelay(380, withTiming(1, { duration: 200, easing: EASE_OUT }));
    line.value = withDelay(460, withTiming(1, { duration: 280, easing: EASE_OUT }));
    hint.value = withDelay(1000, withTiming(1, { duration: 320, easing: EASE_OUT }));

    const impact = setTimeout(() => haptic.thud(), IMPACT_MS);
    const landed = setTimeout(() => haptic.success(), IMPACT_MS + 260);
    const auto = setTimeout(leave, AUTO_DISMISS_MS);
    AccessibilityInfo.announceForAccessibility(
      `${getMoment(reward.moment).label.toLowerCase()} folded. ${stampLine(reward).toLowerCase()}.`,
    );
    return () => {
      clearTimeout(impact);
      clearTimeout(landed);
      clearTimeout(auto);
    };
  }, [drop, hint, ink, leave, line, rail, reduceMotion, reward, scrim, stampOpacity]);

  const onPress = useCallback(() => {
    if (Date.now() - shownAt.current < TAP_GUARD_MS) return;
    haptic.tap();
    leave();
  }, [leave]);

  // The timeline stays faintly visible under the stamp, so it reads as a moment on top of it.
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value * 0.88 }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [
      { scale: 1.6 - 0.6 * drop.value },
      { rotate: `${-12 + 8 * drop.value}deg` },
    ],
  }));
  const inkStyle = useAnimatedStyle(() => ({
    opacity: ink.value * 0.55,
    transform: [{ scale: 1.14 - 0.14 * ink.value }],
  }));
  const railStyle = useAnimatedStyle(() => ({ opacity: rail.value }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: line.value,
    transform: [{ translateY: 8 * (1 - line.value) }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));

  const accent = theme.accentWarm;

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${getMoment(reward.moment).label.toLowerCase()} folded. ${stampLine(reward).toLowerCase()}. Tap to continue.`}
      accessibilityViewIsModal
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }, scrimStyle]} />

      <View style={styles.center} pointerEvents="none">
        {!reduceMotion && <CelebrationBurst color={accent} />}

        <Animated.View style={stampStyle}>
          <Animated.View style={[styles.ink, { borderColor: accent }, inkStyle]} />
          <View style={[styles.stamp, { borderColor: accent, backgroundColor: theme.backgroundElement }]}>
            <Animated.View style={[styles.rail, railStyle]}>
              <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{getMoment(reward.moment).label}</ThemedText>
              <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${reward.done}/${MOMENTS.length}`}</ThemedText>
            </Animated.View>

            <ThemedText style={[styles.word, { color: accent }]} allowFontScaling={false}>
              FOLDED
            </ThemedText>

            <Animated.View style={[styles.lineRow, { borderTopColor: theme.border }, lineStyle]}>
              <ThemedText style={[styles.line, { color: theme.text }]}>{stampLine(reward)}</ThemedText>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.hintRow, hintStyle]}>
          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>tap to continue</ThemedText>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  ink: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderRadius: 4,
  },
  stamp: {
    borderWidth: 2,
    borderRadius: 4,
    minWidth: 248,
    overflow: 'hidden',
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  word: {
    fontFamily: 'BitcountGridDouble-Medium',
    fontSize: 54,
    lineHeight: 64,
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  lineRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  line: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 16,
    textAlign: 'center',
  },
  hintRow: {
    marginTop: 28,
  },
  hint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
