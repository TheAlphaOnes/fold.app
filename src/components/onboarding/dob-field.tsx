/**
 * DobField — date of birth as eight digit cells in three labelled groups
 * (DAY, MONTH, YEAR). One hidden number-pad input owns the keyboard; the
 * cursor moves from cell to cell on its own as digits arrive, and back on
 * delete, so there is no separator to type and nothing to clear first.
 *
 * Reads and writes the canonical DD.MM.YYYY string.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDobInput } from '@/utils/dob';

const GROUPS = [
  { label: 'DAY', cells: [0, 1] },
  { label: 'MONTH', cells: [2, 3] },
  { label: 'YEAR', cells: [4, 5, 6, 7] },
] as const;

interface DobFieldProps {
  value: string;
  onChange: (dob: string) => void;
  /** Red line under the cells, e.g. for an impossible date. */
  invalid?: boolean;
  autoFocus?: boolean;
}

export function DobField({ value, onChange, invalid = false, autoFocus }: DobFieldProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '');
  const active = focused ? Math.min(digits.length, 7) : -1;

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="text"
      accessibilityLabel="Date of birth, day month year"
      accessibilityValue={{ text: value || 'empty' }}
    >
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={(text) => onChange(formatDobInput(text))}
        keyboardType="number-pad"
        maxLength={8}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
      />

      <View style={styles.row} pointerEvents="none">
        {GROUPS.map((group, g) => (
          <React.Fragment key={group.label}>
            {g > 0 && <ThemedText style={[styles.dot, { color: theme.textMuted }]}>.</ThemedText>}
            <View style={styles.group}>
              <View style={styles.cells}>
                {group.cells.map((i) => (
                  <Cell
                    key={i}
                    digit={digits[i]}
                    active={i === active}
                    lineColor={invalid && digits.length === 8 ? '#FF3B30' : theme.border}
                  />
                ))}
              </View>
              <ThemedText style={[styles.label, { color: theme.textMuted }]}>{group.label}</ThemedText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Pressable>
  );
}

function Cell({ digit, active, lineColor }: { digit?: string; active: boolean; lineColor: string }) {
  const theme = useTheme();

  // A digit pops in a touch large and settles.
  const scale = useSharedValue(1);
  const previous = useRef(digit);
  useEffect(() => {
    if (digit && digit !== previous.current) {
      scale.value = 1.18;
      scale.value = withSpring(1, { damping: 14, stiffness: 320 });
    }
    previous.current = digit;
  }, [digit, scale]);
  const digitStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // The empty active cell blinks its cursor.
  const blink = useSharedValue(1);
  useEffect(() => {
    if (active && !digit) {
      blink.value = withRepeat(
        withSequence(withTiming(1, { duration: 0 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 500 })),
        -1,
      );
    } else {
      blink.value = 0;
    }
  }, [active, digit, blink]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <View style={styles.cell}>
      {digit ? (
        <Animated.Text style={[styles.digit, { color: theme.text }, digitStyle]}>{digit}</Animated.Text>
      ) : (
        <Animated.View style={[styles.cursor, { backgroundColor: theme.accentWarm }, cursorStyle]} />
      )}
      <View style={[styles.cellLine, { backgroundColor: active ? theme.accentWarm : lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  group: {
    alignItems: 'center',
  },
  cells: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    width: 28,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 34,
  },
  cursor: {
    width: 2,
    height: 30,
    borderRadius: 1,
  },
  cellLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  dot: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 28,
    lineHeight: 52,
    marginHorizontal: 6,
  },
  label: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 10,
  },
});
