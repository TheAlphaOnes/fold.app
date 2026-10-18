/**
 * ToggleSwitch — Fold's own on/off control, identical on iOS and Android.
 *
 * The native Switch renders a different shape, size and motion per platform;
 * this one is drawn by us so every toggle in the app matches. "On" uses the
 * orange key's language: accent track with the same diagonal hatching.
 *
 * Controlled: it only moves when `value` changes, so a toggle that needs
 * confirmation first (biometrics) never flips before the parent agrees.
 *
 * Motion is split into segments that land at different rates: the knob
 * travels on a spring, the track colour eases over 180ms, and the stripes
 * fade in 60ms behind it. Pressing squashes the knob slightly.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { DURATION, EASE_OUT, SPRING_GESTURE } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const BORDER = 1;
const INSET = 2;
const KNOB = TRACK_HEIGHT - BORDER * 2 - INSET * 2;
const TRAVEL = TRACK_WIDTH - BORDER * 2 - INSET * 2 - KNOB;
const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  /** Renders at 40% opacity and ignores presses. */
  disabled?: boolean;
}

export function ToggleSwitch({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleSwitchProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const position = useSharedValue(value ? 1 : 0);
  const tint = useSharedValue(value ? 1 : 0);
  const hatch = useSharedValue(value ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    const target = value ? 1 : 0;
    if (reduceMotion) {
      position.value = target;
      tint.value = target;
      hatch.value = target;
      return;
    }
    position.value = withSpring(target, SPRING_GESTURE);
    tint.value = withTiming(target, { duration: 180, easing: EASE_OUT });
    hatch.value = withDelay(value ? 60 : 0, withTiming(target, { duration: value ? 220 : 120, easing: EASE_OUT }));
  }, [value, reduceMotion, position, tint, hatch]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tint.value, [0, 1], [theme.backgroundSelected, theme.accentWarm]),
    borderColor: interpolateColor(tint.value, [0, 1], [theme.border, theme.accentWarm]),
  }));

  const hatchStyle = useAnimatedStyle(() => ({ opacity: hatch.value }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: position.value * TRAVEL },
      // A pressed knob widens a touch, like a finger flattening a key.
      { scaleX: 1 + pressed.value * 0.12 },
      { scaleY: 1 - pressed.value * 0.04 },
    ],
  }));

  const pressTo = (target: number) => {
    pressed.value = withTiming(target, { duration: DURATION.press, easing: EASE_OUT });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => !disabled && pressTo(1)}
      onPressOut={() => pressTo(0)}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, hatchStyle]} pointerEvents="none">
          <DiagonalStripes color="#863800" opacity={0.55} />
        </Animated.View>
        <Animated.View
          style={[styles.knob, { backgroundColor: theme.background, borderColor: theme.border }, knobStyle]}
        >
          <View style={[styles.grip, { backgroundColor: theme.border }]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: BORDER,
    padding: INSET,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // The 1px border gives the tight edge; the shadow adds a soft lift
    // (React Native supports a single shadow per view).
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  grip: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
});
