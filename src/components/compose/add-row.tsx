/**
 * AddRow — the things you can add to a canvas, laid out in the open under
 * the top bar so they're seen and reached in one tap instead of behind a
 * sheet. One row of rectangular pills (icon beside its label), each at its
 * natural width so no label is squeezed; the row scrolls sideways and
 * starts in line with the top bar's close button.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { CalendarDays, MapPin, Mic, Music, PenLine, Smile, Stamp as StampIcon, Type as TypeIcon, type LucideIcon } from 'lucide-react-native';

import { ROUND_BUTTON_SIZE } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/constants/motion';
import { useGuardedPress } from '@/hooks/use-guarded-press';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

export type AddKind = 'text' | 'stamp' | 'gif' | 'doodle' | 'music' | 'voice' | 'location' | 'date';

const ITEMS: { kind: AddKind; icon: LucideIcon; label: string }[] = [
  { kind: 'text', icon: TypeIcon, label: 'Text' },
  { kind: 'gif', icon: Smile, label: 'GIF' },
  { kind: 'doodle', icon: PenLine, label: 'Doodle' },
  { kind: 'stamp', icon: StampIcon, label: 'Stamp' },
  { kind: 'music', icon: Music, label: 'Song' },
  { kind: 'voice', icon: Mic, label: 'Voice' },
  { kind: 'location', icon: MapPin, label: 'Place' },
  { kind: 'date', icon: CalendarDays, label: 'Date' },
];

/** Row height, for the composer's layout budget. */
export const ADD_ROW_HEIGHT = ROUND_BUTTON_SIZE;

export function AddRow({ onAdd }: { onAdd: (kind: AddKind) => unknown }) {
  const theme = useTheme();
  // One guard for the row: a double tap (or a tap on another pill while a
  // picker is opening) adds once.
  const add = useGuardedPress((kind: AddKind) => {
    haptic.tap();
    return onAdd(kind);
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {ITEMS.map(({ kind, icon: Icon, label }, i) => (
        // Pills arrive one after another, so the row settles rather than pops.
        <Animated.View key={kind} entering={riseIn(260, 80 + i * 40, 6)}>
          <Pressable
            onPress={() => add(kind)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${label.toLowerCase()}`}
            style={({ pressed }) => [
              styles.tile,
              { borderColor: theme.border, backgroundColor: pressed ? theme.backgroundElement : 'transparent', transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Icon size={14} color={theme.text} strokeWidth={1.75} />
            <ThemedText style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
              {label.toUpperCase()}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  // Same side margin as the top bar, so the first pill lines up under close.
  row: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tile: {
    height: ADD_ROW_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },
});
