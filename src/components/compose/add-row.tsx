/**
 * AddRow — the things you can add to a canvas, laid out in the open under
 * the top bar so they're seen and reached in one tap instead of behind a
 * sheet. Two rows of three equal rectangular pills (icon beside its label)
 * lined up with the top bar's edges: six in one row would crush the
 * labels on a phone, three per row leaves each room to breathe.
 * Nothing scrolls or clips at any width.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CalendarDays, Image as ImageIcon, MapPin, Mic, Music, Smile, type LucideIcon } from 'lucide-react-native';

import { ROUND_BUTTON_SIZE } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

export type AddKind = 'photo' | 'gif' | 'music' | 'voice' | 'location' | 'date';

const ITEMS: { kind: AddKind; icon: LucideIcon; label: string }[] = [
  { kind: 'photo', icon: ImageIcon, label: 'Photo' },
  { kind: 'gif', icon: Smile, label: 'GIF' },
  { kind: 'music', icon: Music, label: 'Song' },
  { kind: 'voice', icon: Mic, label: 'Voice' },
  { kind: 'location', icon: MapPin, label: 'Place' },
  { kind: 'date', icon: CalendarDays, label: 'Date' },
];

const PILL_HEIGHT = ROUND_BUTTON_SIZE;
const ROW_GAP = 8;
const PER_ROW = 3;

/** Height of the whole block, for the composer's layout budget. */
export const ADD_ROW_HEIGHT = PILL_HEIGHT * 2 + ROW_GAP;

export function AddRow({ onAdd }: { onAdd: (kind: AddKind) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {ITEMS.map(({ kind, icon: Icon, label }, i) => (
        // Pills arrive one after another, so the row settles rather than pops.
        <Animated.View key={kind} entering={riseIn(260, 80 + i * 40, 6)} style={styles.slot}>
          <Pressable
            onPress={() => {
              haptic.tap();
              onAdd(kind);
            }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Same side margin as the top bar, so the pills line up under its buttons.
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, columnGap: 8, rowGap: ROW_GAP },
  // A third of the row, less its share of the two gaps between columns.
  slot: { flexBasis: `${100 / PER_ROW - 3}%`, flexGrow: 1 },
  tile: {
    height: PILL_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },
});
