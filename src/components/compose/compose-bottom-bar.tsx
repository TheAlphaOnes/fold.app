/**
 * ComposeBottomBar — the writing tools that sit just above the keyboard:
 * the story chip on the left, the ink (text colour) control on the right.
 *
 * Keeping these out of the header leaves the top of the page to the date and
 * the attach row, so the header never reflows when a long story name is set.
 * The ink palette is disclosed only on demand, as a row of swatches that rises
 * out of the bar.
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Book } from 'lucide-react-native';
import { haptic } from '@/services/haptics';

import { ThemedText } from '@/components/themed-text';
import { MEMORY_INKS } from '@/constants/theme';
import { fadeOut, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const SWATCH = 28;
const SWATCH_HIT = (40 - SWATCH) / 2;

/** Bottom safe-area padding is only needed while the keyboard is down. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

interface ComposeBottomBarProps {
  storyLabel: string;
  hasStory: boolean;
  onOpenStories: () => void;
  textColor: string | null;
  onChangeTextColor: (color: string | null) => void;
  bottomInset: number;
}

export function ComposeBottomBar({
  storyLabel,
  hasStory,
  onOpenStories,
  textColor,
  onChangeTextColor,
  bottomInset,
}: ComposeBottomBarProps) {
  const theme = useTheme();
  const keyboardShown = useKeyboardShown();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ink = textColor ?? theme.text;
  const inkLabel = MEMORY_INKS.find((option) => option.id === textColor)?.label ?? 'Ink';

  const pick = (color: string | null) => {
    haptic.select();
    onChangeTextColor(color);
  };

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: theme.border, paddingBottom: keyboardShown ? 10 : Math.max(bottomInset, 12) },
      ]}
    >
      {paletteOpen && (
        <Animated.View entering={riseIn(220, 0, 8)} exiting={fadeOut(120)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.palette}
            accessibilityRole="radiogroup"
            accessibilityLabel="Text colour"
          >
            {MEMORY_INKS.map((option) => {
              const fill = option.id ?? theme.text;
              const selected = option.id === textColor;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => pick(option.id)}
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
                  <View style={[styles.swatch, { backgroundColor: fill }]} />
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onOpenStories();
          }}
          accessibilityRole="button"
          accessibilityLabel={hasStory ? `Story: ${storyLabel}` : 'Add to a story'}
          style={({ pressed }) => [
            styles.chip,
            hasStory
              ? { backgroundColor: theme.text, borderColor: theme.text }
              : { borderColor: theme.border },
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Book size={13} color={hasStory ? theme.background : theme.text} />
          <ThemedText
            style={[styles.chipText, { color: hasStory ? theme.background : theme.text }]}
            numberOfLines={1}
          >
            {storyLabel}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            haptic.tap();
            setPaletteOpen((open) => !open);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Text colour, ${inkLabel}`}
          accessibilityState={{ expanded: paletteOpen }}
          style={({ pressed }) => [
            styles.chip,
            { borderColor: paletteOpen ? theme.text : theme.border, transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <View style={[styles.inkDot, { backgroundColor: ink }]} />
          <ThemedText style={[styles.chipText, { color: theme.text }]}>{inkLabel.toUpperCase()}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 10,
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 2,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  inkDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
