/**
 * Font controls for the text editor, on CyclePill / CycleList: the current
 * font's name written in that font; tap cycles, hold opens the list.
 *
 * Fonts differ wildly in optical size and vertical metrics, so every name
 * goes through memoryTextMetrics (the same correction the canvas uses) to
 * land at one visual size, centred.
 */

import React from 'react';
import { StyleSheet } from 'react-native';

import { CycleList, CyclePill, ON_DARK_PALETTE } from '@/components/compose/cycle-pill';
import { ThemedText } from '@/components/themed-text';
import { MEMORY_FONTS } from '@/constants/fonts';
import { memoryTextMetrics } from '@/utils/memory-text';

const HEIGHT = 40;
const LABEL_SIZE = 15;

export type FontId = (typeof MEMORY_FONTS)[number]['id'];
const FONT_IDS: readonly FontId[] = MEMORY_FONTS.map((f) => f.id);

function nameOf(id: string): string {
  return MEMORY_FONTS.find((f) => f.id === id)?.name ?? 'FONT';
}

/**
 * A font's name in its own face, corrected to one optical size. Only the
 * size is taken from memoryTextMetrics: its tall line box (room for script
 * flourishes across several lines) is taller than the pill, which pushed
 * Dancing, Caveat and Cookiemonster down and cut them off. One line here
 * gets a line box exactly the pill's height, so every face sits centred.
 */
function renderFont(id: FontId, ink: string) {
  const { fontSize } = memoryTextMetrics(id, LABEL_SIZE);
  return (
    <ThemedText style={[styles.name, { fontSize, lineHeight: HEIGHT, fontFamily: id, color: ink }]} numberOfLines={1}>
      {nameOf(id)}
    </ThemedText>
  );
}

/** A stored font that's no longer offered falls back to the first one. */
function known(font: string): FontId {
  return (FONT_IDS as readonly string[]).includes(font) ? (font as FontId) : FONT_IDS[0];
}

interface FontPillProps {
  font: string;
  open: boolean;
  onChange: (font: FontId) => void;
  onToggleList: () => void;
}

export function FontPill({ font, open, onChange, onToggleList }: FontPillProps) {
  return (
    <CyclePill
      items={FONT_IDS}
      value={known(font)}
      onChange={onChange}
      open={open}
      onToggleList={onToggleList}
      renderItem={renderFont}
      nameOf={nameOf}
      kind="Font"
      palette={ON_DARK_PALETTE}
      height={HEIGHT}
      style={styles.pill}
    />
  );
}

export function FontList({ font, onPick }: { font: string; onPick: (font: FontId) => void }) {
  return (
    <CycleList
      items={FONT_IDS}
      value={known(font)}
      onPick={onPick}
      renderItem={renderFont}
      nameOf={nameOf}
      kind="Font"
      palette={ON_DARK_PALETTE}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1 },
  name: { textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center', paddingTop: 0, paddingBottom: 0 },
  list: { marginHorizontal: 16, marginBottom: 8 },
});
