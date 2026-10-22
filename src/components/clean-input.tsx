import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, TextInputProps, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { EASE_OUT } from '@/constants/motion';
import { ThemedText } from './themed-text';

interface CleanInputProps extends Omit<TextInputProps, 'style' | 'placeholder'> {
  value: string;
  /**
   * Small muted instruction under the line. It is never drawn in the field
   * itself: a big example word next to the cursor reads as text already
   * typed, and people try to delete it.
   */
  hint?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

/**
 * CleanInput — one big line of type over a hairline, with an accent cursor.
 * Empty, it is just the cursor on the line; the underline warms to accent
 * while focused.
 */
export function CleanInput({ value, hint, style, onFocus, onBlur, ...props }: CleanInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Blinking cursor; hidden when blurred.
  const cursorOpacity = useSharedValue(1);
  useEffect(() => {
    if (isFocused) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 0 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isFocused, cursorOpacity]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  // The line fills with accent from the centre while focused.
  const lineFill = useSharedValue(0);
  useEffect(() => {
    lineFill.value = withTiming(isFocused ? 1 : 0, { duration: 360, easing: EASE_OUT });
  }, [isFocused, lineFill]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: lineFill.value }] }));

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()} accessible={false}>
      <View style={[styles.container, style]}>
        {/* The real input, invisible, owns the keyboard. */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          caretHidden
          accessibilityHint={hint}
          {...props}
        />

        <View style={styles.visualContainer} pointerEvents="none">
          {value.length > 0 && (
            <Animated.Text
              style={[styles.text, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {value}
            </Animated.Text>
          )}
          <Animated.View
            style={[
              styles.cursor,
              value.length > 0 && styles.cursorAfterText,
              { backgroundColor: theme.accentWarm },
              cursorStyle,
            ]}
          />
        </View>

        <View style={[styles.line, { backgroundColor: theme.border }]} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.accentWarm }, lineStyle]} />
        </View>

        {hint && (
          <ThemedText style={[styles.hint, { color: theme.textMuted }]} pointerEvents="none">
            {hint}
          </ThemedText>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 12,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
  },
  visualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 64,
  },
  text: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 48,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cursor: {
    width: 3,
    height: 48,
    borderRadius: 2,
  },
  cursorAfterText: {
    marginLeft: 8,
  },
  line: {
    height: 1,
    marginTop: 12,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  hint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
