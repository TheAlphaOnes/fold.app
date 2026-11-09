/**
 * CyclePill / CycleList — one control for choosing from a fixed set
 * (fonts, templates). The pill shows the current choice: tap steps to the
 * next one, hold opens CycleList with every choice to pick directly.
 *
 * The parent owns `open` and places the list, since where it fits differs
 * per screen. Colours come in as a palette so the same control works on
 * the editor's dark dim and on the themed composer.
 */

import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronsUpDown } from 'lucide-react-native';

import { fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

export interface CyclePalette {
  ink: string;
  muted: string;
  border: string;
  /** Fill and ink of the chosen row, and of the pill while its list is open. */
  activeFill: string;
  activeInk: string;
  listFill: string;
  pressedFill: string;
}

/** For controls on the text editor's dark dim, in either theme. */
export const ON_DARK_PALETTE: CyclePalette = {
  ink: '#FFFFFF',
  muted: '#FFFFFF99',
  border: '#FFFFFF66',
  activeFill: '#FFFFFF',
  activeInk: '#111111',
  listFill: '#161616',
  pressedFill: '#FFFFFF1F',
};

export function useThemedCyclePalette(): CyclePalette {
  const theme = useTheme();
  return {
    ink: theme.text,
    muted: theme.textMuted,
    border: theme.border,
    activeFill: theme.text,
    activeInk: theme.background,
    listFill: theme.backgroundElement,
    pressedFill: theme.border,
  };
}

export function nextOf<T>(items: readonly T[], value: T): T {
  return items[(items.indexOf(value) + 1) % items.length];
}

interface CyclePillProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  open: boolean;
  onToggleList: () => void;
  /** The choice as drawn in the pill and in list rows, in the given ink. */
  renderItem: (item: T, ink: string) => ReactNode;
  /** Spoken name of a choice. */
  nameOf: (item: T) => string;
  /** What is being chosen, for screen readers ("Font", "Template"). */
  kind: string;
  palette: CyclePalette;
  height: number;
  style?: StyleProp<ViewStyle>;
}

export function CyclePill<T extends string>({
  items,
  value,
  onChange,
  open,
  onToggleList,
  renderItem,
  nameOf,
  kind,
  palette,
  height,
  style,
}: CyclePillProps<T>) {
  const ink = open ? palette.activeInk : palette.ink;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onChange(nextOf(items, value));
      }}
      onLongPress={() => {
        haptic.tap();
        onToggleList();
      }}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={`${kind} ${nameOf(value)}`}
      accessibilityHint={`Tap for the next ${kind.toLowerCase()}, hold to choose from the list`}
      accessibilityActions={[{ name: 'longpress', label: 'Choose from list' }]}
      onAccessibilityAction={onToggleList}
      style={({ pressed }) => [
        styles.pill,
        { height, borderRadius: height / 2, borderColor: open ? palette.activeFill : palette.border },
        open && { backgroundColor: palette.activeFill },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {/* Keyed so every change plays a small rise. */}
      <Animated.View key={value} entering={riseIn(180, 0, 5)} style={styles.current}>
        {renderItem(value, ink)}
      </Animated.View>
      <ChevronsUpDown size={14} color={open ? palette.activeInk : palette.muted} />
    </Pressable>
  );
}

interface CycleListProps<T extends string> {
  items: readonly T[];
  value: T;
  onPick: (value: T) => void;
  renderItem: (item: T, ink: string) => ReactNode;
  nameOf: (item: T) => string;
  kind: string;
  palette: CyclePalette;
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
}

export function CycleList<T extends string>({ items, value, onPick, renderItem, nameOf, kind, palette, maxHeight = 280, style }: CycleListProps<T>) {
  return (
    <Animated.View
      entering={riseIn(220, 0, 10)}
      exiting={fadeOut(120)}
      style={[styles.list, { maxHeight, backgroundColor: palette.listFill, borderColor: palette.border }, style]}
    >
      <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.listContent} accessibilityRole="radiogroup" accessibilityLabel={`${kind}s`}>
        {items.map((item, i) => {
          const selected = item === value;
          return (
            // Rows fade in a beat apart so the list unfolds rather than pops.
            <Animated.View key={item} entering={fadeIn(160, Math.min(i, 10) * 18)}>
              <Pressable
                onPress={() => {
                  haptic.select();
                  onPick(item);
                }}
                accessibilityRole="radio"
                accessibilityLabel={nameOf(item)}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  selected ? { backgroundColor: palette.activeFill } : pressed && { backgroundColor: palette.pressedFill },
                ]}
              >
                {renderItem(item, selected ? palette.activeInk : palette.ink)}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, gap: 8 },
  current: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  list: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  listContent: { padding: 6, gap: 2 },
  row: { minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
});
