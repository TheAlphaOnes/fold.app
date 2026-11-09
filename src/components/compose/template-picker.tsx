/**
 * Template controls for the composer, on CyclePill / CycleList: the current
 * template (icon or grid diagram, plus its name); tap steps to the next,
 * hold opens every template to pick directly. While a grid is active a gap
 * control sits beside the pill.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Grid2x2, Image as ImageIcon, Layers, Type as TypeIcon } from 'lucide-react-native';

import type { GapSize, TemplateId } from '@/canvas/types';
import { CycleList, CyclePill, useThemedCyclePalette } from '@/components/compose/cycle-pill';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { GRID_LAYOUTS, type GridLayout } from '@/templates/grids';
import { BASE_TEMPLATES, GRID_TEMPLATES, gridIdOf, isGrid, templateName } from '@/templates/registry';

const HEIGHT = 36;
const ICONS = { story: ImageIcon, text: TypeIcon, stickers: Layers } as const;
const TEMPLATE_IDS: readonly TemplateId[] = [...BASE_TEMPLATES, ...GRID_TEMPLATES].map((t) => t.id);
const GAP_NEXT: Record<GapSize, GapSize> = { none: 'thin', thin: 'thick', thick: 'none' };

function renderTemplate(id: TemplateId, ink: string) {
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
  gap?: GapSize;
  open: boolean;
  onPick: (template: TemplateId) => void;
  onGap: (gap: GapSize) => void;
  onToggleList: () => void;
}

export function TemplatePicker({ current, gap = 'none', open, onPick, onGap, onToggleList }: TemplatePickerProps) {
  const theme = useTheme();
  const palette = useThemedCyclePalette();
  return (
    <View style={styles.row}>
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
      {isGrid(current) && (
        <Pressable
          onPress={() => {
            haptic.select();
            onGap(GAP_NEXT[gap]);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Gap ${gap}`}
          style={[styles.gap, { borderColor: theme.border }]}
        >
          <Grid2x2 size={14} color={theme.text} />
          <ThemedText style={[styles.label, { color: theme.text }]}>{gap.toUpperCase()}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export function TemplateList({ current, onPick }: { current: TemplateId; onPick: (template: TemplateId) => void }) {
  const palette = useThemedCyclePalette();
  return <CycleList items={TEMPLATE_IDS} value={current} onPick={onPick} renderItem={renderTemplate} nameOf={templateName} kind="Template" palette={palette} />;
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  pill: { flex: 1 },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5 },
  gap: { height: HEIGHT, borderRadius: HEIGHT / 2, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
});
