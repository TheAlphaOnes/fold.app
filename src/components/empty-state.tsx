/**
 * EmptyState — shown when there are no memories yet.
 *
 * Teenage Engineering-inspired ASCII art with monospace typography.
 * Minimal, industrial, intentional. Like reading a product manual
 * for a device that hasn't been used yet.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Clean, minimal ASCII card — no box-drawing chars that break across fonts.
// Pure ASCII only, evokes a blank card waiting to be filled.
const ASCII_ART = `
  .-----------------------------.
  |                             |
  |                             |
  |       - - - - - - - -       |
  |       - - - - - - - -       |
  |       - - - - - - - -       |
  |                             |
  |            . . .            |
  |                             |
  '-----------------------------'
`.trim();

export function EmptyState() {
  // Staggered fade-in animations at different rates
  const artOpacity = useSharedValue(0);
  const artTranslateY = useSharedValue(8);
  const labelOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(6);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    // Art fades in first — slow and deliberate
    artOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
    artTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) })
    );

    // Label arrives second — slightly faster
    labelOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    labelTranslateY.value = withDelay(
      600,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })
    );

    // Hint blinks in last — like a cursor
    hintOpacity.value = withDelay(
      1100,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.4, { duration: 600 }),
        withTiming(0.7, { duration: 500 })
      )
    );
  }, [artOpacity, artTranslateY, labelOpacity, labelTranslateY, hintOpacity]);

  const artStyle = useAnimatedStyle(() => ({
    opacity: artOpacity.value,
    transform: [{ translateY: artTranslateY.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* ASCII art card outline */}
      <Animated.View style={artStyle}>
        <ThemedText
          style={styles.ascii}
          themeColor="textMuted"
        >
          {ASCII_ART}
        </ThemedText>
      </Animated.View>

      {/* Status label — like a device readout */}
      <Animated.View style={[styles.labelRow, labelStyle]}>
        <ThemedText style={styles.label} themeColor="textMuted">
          MEMORY_BANK : EMPTY
        </ThemedText>
      </Animated.View>

      {/* Subtle prompt — like a terminal cursor line */}
      <Animated.View style={hintStyle}>
        <ThemedText style={styles.hint} themeColor="textMuted">
          {'> tap to begin _'}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 34,
    gap: 21,
  },
  ascii: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
    textAlign: 'center',
  },
  labelRow: {
    marginTop: 8,
  },
  label: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
