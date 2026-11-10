/**
 * Template controls for the composer, on CyclePill / CycleList: the current
 * template (icon or grid diagram, plus its name); tap steps to the next,
 * hold opens every template to pick directly. The grid gap is a template
 * setting, so it lives at the top of the list while a grid is active.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CircleDashed, Clapperboard, GalleryHorizontalEnd, Layers, Layers2, Paintbrush, Type as TypeIcon } from 'lucide-react-native';

import type { GapSize, TemplateId } from '@/canvas/types';
import { CycleList, CyclePill, useThemedCyclePalette } from '@/components/compose/cycle-pill';
import { fadeIn } from '@/constants/motion';
import { ROUND_BUTTON_SIZE } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { GRID_LAYOUTS, type GridLayout } from '@/templates/grids';
import { BASE_TEMPLATES, GRID_TEMPLATES, gridIdOf, isGrid, templateName } from '@/templates/registry';

// Shares the bottom row with the round buttons, so it matches their height.
const HEIGHT = ROUND_BUTTON_SIZE;
const ICONS = {
  // The free canvas you make anything on (Photo has the image icon, Doodle the pen)
  story: Paintbrush,
  text: TypeIcon,
  stickers: Layers,
  slideshow: Clapperboard,
  ring: CircleDashed,
  fan: GalleryHorizontalEnd,
  stack: Layers2,
} as const;
export const TEMPLATE_IDS: readonly TemplateId[] = [...BASE_TEMPLATES, ...GRID_TEMPLATES].map((t) => t.id);
const GAPS: readonly GapSize[] = ['none', 'thin', 'thick'];

/** A template's icon (or grid diagram) and name, as every template control shows it. */
export function renderTemplate(id: TemplateId, ink: string) {
  const layout = isGrid(id) ? GRID_LAYOUTS.find((g) => g.id === gridIdOf(id)) : undefined;
  const Icon = isGrid(id) ? null : ICONS[id as keyof typeof ICONS];
  return (
    <>
      {layout ? <GridGlyph layout={layout} color={ink} /> : Icon && <Icon size={14} color={ink} />}
      <ThemedText style={[styles.label, { color: ink }]} numberOfLines={1}>
        {templateName(id).toUpperCase()}
      </ThemedText>
    </>
  );
}

interface TemplatePickerProps {
  current: TemplateId;
  open: boolean;
  onPick: (template: TemplateId) => void;
  onToggleList: () => void;
}

/** Fills the space it's given at a fixed width, so it never resizes as names change. */
export function TemplatePicker({ current, open, onPick, onToggleList }: TemplatePickerProps) {
  const palette = useThemedCyclePalette();
  return (
    <CyclePill
      items={TEMPLATE_IDS}
      value={current}
      onChange={onPick}
      open={open}
      onToggleList={onToggleList}
      renderItem={renderTemplate}
      nameOf={templateName}
      kind="Template"
      palette={palette}
      height={HEIGHT}
      style={styles.pill}
    />
  );
}

interface TemplateListProps {
  current: TemplateId;
  gap?: GapSize;
  onPick: (template: TemplateId) => void;
  onGap: (gap: GapSize) => void;
}

export function TemplateList({ current, gap = 'none', onPick, onGap }: TemplateListProps) {
  const theme = useTheme();
  const palette = useThemedCyclePalette();
  return (
    <View style={[styles.panel, { backgroundColor: palette.listFill, borderColor: palette.border }]}>
      {isGrid(current) && (
        <Animated.View entering={fadeIn(160)} style={[styles.gapRow, { borderBottomColor: theme.border }]} accessibilityRole="radiogroup" accessibilityLabel="Gap between photos">
          <ThemedText style={[styles.label, { color: theme.textMuted }]}>GAP</ThemedText>
          <View style={styles.gapOptions}>
            {GAPS.map((g) => {
              const selected = g === gap;
              return (
                <Pressable
                  key={g}
                  onPress={() => {
                    haptic.select();
                    onGap(g);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`Gap ${g}`}
                  accessibilityState={{ selected }}
                  style={[styles.gapOption, selected ? { backgroundColor: theme.text } : { borderColor: theme.border, borderWidth: 1 }]}
                >
                  <ThemedText style={[styles.label, { color: selected ? theme.background : theme.text }]}>{g.toUpperCase()}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}
      <CycleList
        items={TEMPLATE_IDS}
        value={current}
        onPick={onPick}
        renderItem={renderTemplate}
        nameOf={templateName}
        kind="Template"
        palette={palette}
        maxHeight={isGrid(current) ? 236 : 280}
        style={styles.list}
      />
    </View>
  );
}

/** A 10×18 (9:16) drawing of a layout's cells. */
function GridGlyph({ layout, color }: { layout: GridLayout; color: string }) {
  const W = 10;
  const H = 18;
  return (
    <View style={{ width: W, height: H }}>
      {layout.cells.map((c) => (
        <View
          key={c.id}
          style={{
            position: 'absolute',
            left: c.x * W + 0.75,
            top: c.y * H + 0.75,
            width: Math.max(1.5, c.w * W - 1.5),
            height: Math.max(1.5, c.h * H - 1.5),
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1, paddingHorizontal: 14 },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5 },
  panel: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  // The list sits inside the panel, which draws the frame.
  list: { borderWidth: 0, borderRadius: 0 },
  gapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  gapOptions: { flexDirection: 'row', gap: 6 },
  gapOption: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center' },
});
