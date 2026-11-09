/**
 * AddRow — the things you can add to a canvas, laid out in the open under
 * the top bar so they're seen and reached in one tap instead of behind a
 * sheet. Six equal rectangular pills (icon beside a compact label) share
 * the width exactly, lined up with the top bar's edges and at its button
 * height: nothing scrolls or clips; on the narrowest phones the labels
 * shrink a touch to fit.
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

/** Row height, for the composer's layout budget. */
export const ADD_ROW_HEIGHT = ROUND_BUTTON_SIZE;

export function AddRow({ onAdd }: { onAdd: (kind: AddKind) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
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
            <Icon size={13} color={theme.text} strokeWidth={1.75} />
            <ThemedText style={[styles.label, { color: theme.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {label.toUpperCase()}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same side margin as the top bar, so the tiles line up under its buttons.
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 6 },
  slot: { flex: 1 },
  tile: {
    height: ADD_ROW_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, flexShrink: 1 },
});
