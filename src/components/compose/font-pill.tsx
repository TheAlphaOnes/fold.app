/**
 * Font controls for the text editor.
 *
 * FontPill — the current font's name, written in that font. Tap cycles to
 * the next font; hold opens the full list.
 * FontList — every font by name, each in its own face, to pick directly.
 *
 * Fonts differ wildly in optical size and vertical metrics, so every name
 * goes through memoryTextMetrics (the same correction the canvas uses) to
 * land at one visual size, centred.
 *
 * Both draw white-on-dark: the editor always sits on a dark dim.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronsUpDown } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { MEMORY_FONTS } from '@/constants/fonts';
import { fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { haptic } from '@/services/haptics';
import { memoryTextMetrics } from '@/utils/memory-text';

const HEIGHT = 40;
const LABEL_SIZE = 15;
const LIST_MAX_HEIGHT = 280;

type FontId = (typeof MEMORY_FONTS)[number]['id'];

function fontName(id: string): string {
  return MEMORY_FONTS.find((f) => f.id === id)?.name ?? 'FONT';
}

function nextFont(id: string): FontId {
  const i = MEMORY_FONTS.findIndex((f) => f.id === id);
  return MEMORY_FONTS[(i + 1) % MEMORY_FONTS.length].id;
}

/** A font's name in its own face, corrected to one optical size. */
function FontName({ id, color }: { id: string; color: string }) {
  const metrics = memoryTextMetrics(id, LABEL_SIZE);
  return (
    <ThemedText style={[styles.name, metrics, { fontFamily: id, color }]} numberOfLines={1}>
      {fontName(id)}
    </ThemedText>
  );
}

interface FontPillProps {
  font: string;
  open: boolean;
  onChange: (font: FontId) => void;
  onToggleList: () => void;
}

export function FontPill({ font, open, onChange, onToggleList }: FontPillProps) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onChange(nextFont(font));
      }}
      onLongPress={() => {
        haptic.tap();
        onToggleList();
      }}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={`Font ${fontName(font)}`}
      accessibilityHint="Tap for the next font, hold to choose from the list"
      accessibilityActions={[{ name: 'longpress', label: 'Choose from list' }]}
      onAccessibilityAction={onToggleList}
      style={({ pressed }) => [styles.pill, open && styles.pillOpen, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {/* Keyed so each change of font plays a small rise. */}
      <Animated.View key={font} entering={riseIn(180, 0, 5)} style={styles.nameWrap}>
        <FontName id={font} color={open ? '#111111' : '#FFFFFF'} />
      </Animated.View>
      <ChevronsUpDown size={14} color={open ? '#111111' : '#FFFFFF99'} />
    </Pressable>
  );
}

interface FontListProps {
  font: string;
  onPick: (font: FontId) => void;
}

export function FontList({ font, onPick }: FontListProps) {
  return (
    <Animated.View entering={riseIn(220, 0, 10)} exiting={fadeOut(120)} style={styles.list}>
      <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.listContent} accessibilityRole="radiogroup" accessibilityLabel="Fonts">
        {MEMORY_FONTS.map((f, i) => {
          const selected = f.id === font;
          return (
            // Rows fade in a beat apart so the list unfolds rather than pops.
            <Animated.View key={f.id} entering={fadeIn(160, Math.min(i, 10) * 18)}>
              <Pressable
                onPress={() => {
                  haptic.select();
                  onPick(f.id);
                }}
                accessibilityRole="radio"
                accessibilityLabel={f.name}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
              >
                <FontName id={f.id} color={selected ? '#111111' : '#FFFFFF'} />
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  pillOpen: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  nameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF33',
    backgroundColor: '#161616',
    overflow: 'hidden',
  },
  listContent: { padding: 6, gap: 2 },
  row: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  rowSelected: { backgroundColor: '#FFFFFF' },
  rowPressed: { backgroundColor: '#FFFFFF1F' },
});
