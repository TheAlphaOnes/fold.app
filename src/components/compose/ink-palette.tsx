/**
 * Ink (text colour) controls for the text editor's toolbar. The editor
 * always sits on a dark dim, so by default these draw white-on-dark in both
 * themes, and "no ink" (null) shows as white, which is how the editor writes
 * it. The doodle toolbar sits on the page itself, so it asks for `onDark`
 * false and the controls follow the theme instead.
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

/** Matches the editor's other tool buttons. */
const BUTTON = 40;
const ON_DARK = '#FFFFFF';
const ON_DARK_BORDER = '#FFFFFF66';

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
  /** What the colour is for, read out with its name. */
  label?: string;
  /** True on the editor's dark dim; false on the page's own surface. */
  onDark?: boolean;
}

export function InkButton({ color, open, onPress, style, label = 'Text colour', onDark = true }: InkButtonProps) {
  const theme = useTheme();
  const ink = color ?? (onDark ? ON_DARK : theme.text);
  const border = onDark ? ON_DARK_BORDER : theme.border;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${inkLabel(color)}`}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        style,
        styles.button,
        { borderColor: open ? (onDark ? ON_DARK : theme.text) : border, opacity: pressed ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: ink, borderColor: border }]} />
    </Pressable>
  );
}

interface InkPaletteProps {
  color: string | null;
  onChange: (color: string | null) => void;
  /** True on the editor's dark dim; false on the page's own surface. */
  onDark?: boolean;
}

export function InkPalette({ color, onChange, onDark = true }: InkPaletteProps) {
  const theme = useTheme();
  const inkOf = (id: string | null) => id ?? (onDark ? ON_DARK : theme.text);
  const ring = onDark ? ON_DARK : theme.text;
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
                  borderColor: selected ? ring : 'transparent',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: inkOf(option.id) }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    // Keeps dark inks visible against the dim.
    borderWidth: 1,
    borderColor: ON_DARK_BORDER,
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Lines up with the toolbar's edge, with breathing room beneath it.
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
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
