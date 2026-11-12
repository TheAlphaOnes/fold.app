/**
 * TrashActionBar — the two actions at the foot of Recently Deleted, over a
 * fade so tiles slide under it instead of being cut off. With nothing
 * selected they act on everything (Restore all / Empty); with a selection
 * they act on just that (Restore 3 / Delete 3).
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RotateCcw, Trash2 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const FADE = 48;

interface TrashActionBarProps {
  selected: number;
  bottomInset: number;
  width: number;
  onRestore: () => void;
  onDelete: () => void;
}

export function TrashActionBar({ selected, bottomInset, width, onRestore, onDelete }: TrashActionBarProps) {
  const theme = useTheme();
  const some = selected > 0;
  return (
    <Animated.View entering={riseIn(300, 160, 16)} style={styles.root} pointerEvents="box-none">
      <Svg width={width} height={FADE} pointerEvents="none">
        <Defs>
          <LinearGradient id="barFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.background} stopOpacity={0} />
            <Stop offset="1" stopColor={theme.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={FADE} fill="url(#barFade)" />
      </Svg>
      <View style={[styles.bar, { backgroundColor: theme.background, paddingBottom: Math.max(bottomInset, 16) }]}>
        <Pressable
          onPress={onRestore}
          accessibilityRole="button"
          accessibilityLabel={some ? `Restore ${selected} selected` : 'Restore all memories'}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.text, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <RotateCcw size={14} color={theme.background} />
          <ThemedText style={[styles.text, { color: theme.background }]} numberOfLines={1}>
            {some ? `RESTORE ${selected}` : 'RESTORE ALL'}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={some ? `Delete ${selected} selected forever` : 'Empty Recently Deleted'}
          style={({ pressed }) => [styles.button, { borderWidth: 1, borderColor: theme.border, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <Trash2 size={14} color={theme.destructive} />
          <ThemedText style={[styles.text, { color: theme.destructive }]} numberOfLines={1}>
            {some ? `DELETE ${selected}` : 'EMPTY'}
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 4 },
  button: { flex: 1, flexDirection: 'row', gap: 8, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, lineHeight: 14, letterSpacing: 1.6 },
});
