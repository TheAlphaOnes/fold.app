/**
 * Ink (text colour) controls for compose, living in the top toolbar beside
 * the size and font buttons.
 *
 * InkButton — a toolbar button showing the current ink as a dot.
 * InkPalette — the swatch row it discloses, under the toolbar.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MEMORY_INKS } from '@/constants/theme';
import { fadeOut, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

/** Height of every compose toolbar chip (ink, size, font), so they line up. */
export const TOOL_CHIP_HEIGHT = 42;

const SWATCH = 28;
const SWATCH_HIT = (40 - SWATCH) / 2;

export function inkLabel(color: string | null): string {
  return MEMORY_INKS.find((option) => option.id === color)?.label ?? 'Ink';
}

interface InkButtonProps {
  color: string | null;
  open: boolean;
  onPress: () => void;
  style?: object;
}

export function InkButton({ color, open, onPress, style }: InkButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Text colour, ${inkLabel(color)}`}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        style,
        styles.button,
        { borderColor: open ? theme.text : theme.border, opacity: pressed ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color ?? theme.text, borderColor: theme.border }]} />
    </Pressable>
  );
}

interface InkPaletteProps {
  color: string | null;
  onChange: (color: string | null) => void;
}

export function InkPalette({ color, onChange }: InkPaletteProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={riseIn(220, 0, -6)} exiting={fadeOut(120)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.palette}
        accessibilityRole="radiogroup"
        accessibilityLabel="Text colour"
      >
        {MEMORY_INKS.map((option) => {
          const selected = option.id === color;
          return (
            <Pressable
              key={option.label}
              onPress={() => {
                haptic.select();
                onChange(option.id);
              }}
              hitSlop={SWATCH_HIT}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.swatchRing,
                {
                  borderColor: selected ? theme.text : 'transparent',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: option.id ?? theme.text }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A circle at the toolbar chip height, level with the size and font chips.
  button: {
    width: TOOL_CHIP_HEIGHT,
    height: TOOL_CHIP_HEIGHT,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 21,
    paddingBottom: 12,
  },
  swatchRing: {
    width: SWATCH + 8,
    height: SWATCH + 8,
    borderRadius: (SWATCH + 8) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
  },
});
