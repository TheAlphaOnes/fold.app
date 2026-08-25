/**
 * EmptyState — shown when there are no memories yet.
 *
 * Teenage Engineering-inspired ASCII art with monospace typography.
 * Minimal, industrial, intentional.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// A classic, highly-detailed top-down open book.
// Exact ASCII art requested from asciiart.eu
const ASCII_ART = [
  '    __________________   __________________',
  '.-/|                  \\ /                  |\\-.',
  '||||                   |                   ||||',
  '||||                   |       ~~*~~       ||||',
  '||||    --==*==--      |                   ||||',
  '||||                   |                   ||||',
  '||||                   |                   ||||',
  '||||                   |     --==*==--     ||||',
  '||||                   |                   ||||',
  '||||                   |                   ||||',
  '||||                   |                   ||||',
  '||||                   |                   ||||',
  '||||__________________ | __________________||||',
  '||/===================\\|/===================\\||',
  '`--------------------~___~-------------------\'\'',
].join('\n');

export function EmptyState() {
  const theme = useTheme();

  // Staggered fade-in animations at different rates
  const artOpacity = useSharedValue(0);
  const artTranslateY = useSharedValue(8);
  const labelOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(6);

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
  }, [artOpacity, artTranslateY, labelOpacity, labelTranslateY]);

  const artStyle = useAnimatedStyle(() => ({
    opacity: artOpacity.value,
    transform: [{ translateY: artTranslateY.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* ASCII art */}
      <Animated.View style={artStyle}>
        <ThemedText style={styles.ascii} themeColor="textMuted">
          {ASCII_ART}
        </ThemedText>
      </Animated.View>

      {/* Status label */}
      <Animated.View style={[styles.labelRow, labelStyle]}>
        <ThemedText style={styles.label} themeColor="textMuted">
          TAP TO CAPTURE YOURSELF
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
    fontSize: 10,
    lineHeight: 10, // Force tight vertical packing so | connects perfectly
    letterSpacing: 0,
    textAlign: 'left',
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
});
