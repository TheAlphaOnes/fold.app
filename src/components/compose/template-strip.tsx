/**
 * TemplateStrip — the row of templates under the canvas: Story, Text,
 * Stickers, then every grid drawn as a tiny diagram of its cells, so a
 * layout is picked by its shape. The current one is filled in ink.
 * When a grid is active, a gap control sits at the start of the row.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Layers, Type as TypeIcon, Image as ImageIcon, Grid2x2 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import type { GapSize, TemplateId } from '@/canvas/types';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { GRID_LAYOUTS, type GridLayout } from '@/templates/grids';
import { isGrid } from '@/templates/registry';

const ICONS = { story: ImageIcon, text: TypeIcon, stickers: Layers } as const;
const GAP_NEXT: Record<GapSize, GapSize> = { none: 'thin', thin: 'thick', thick: 'none' };

interface TemplateStripProps {
  current: TemplateId;
  gap?: GapSize;
  onPick: (template: TemplateId) => void;
  onGap: (gap: GapSize) => void;
}

export function TemplateStrip({ current, gap = 'none', onPick, onGap }: TemplateStripProps) {
  const theme = useTheme();
  const pick = (t: TemplateId) => {
    haptic.select();
    onPick(t);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {isGrid(current) && (
        <Pressable
          onPress={() => {
            haptic.select();
            onGap(GAP_NEXT[gap]);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Gap ${gap}`}
          style={[styles.chip, { borderColor: theme.border }]}
        >
          <Grid2x2 size={14} color={theme.text} />
          <ThemedText style={[styles.label, { color: theme.text }]}>{gap.toUpperCase()}</ThemedText>
        </Pressable>
      )}
      {(['story', 'text', 'stickers'] as const).map((t) => {
        const Icon = ICONS[t];
        const active = current === t;
        return (
          <Pressable
            key={t}
            onPress={() => pick(t)}
            accessibilityRole="button"
            accessibilityLabel={`${t} template`}
            accessibilityState={{ selected: active }}
            style={[styles.chip, active ? { backgroundColor: theme.text, borderColor: theme.text } : { borderColor: theme.border }]}
          >
            <Icon size={14} color={active ? theme.background : theme.text} />
            <ThemedText style={[styles.label, { color: active ? theme.background : theme.text }]}>{t.toUpperCase()}</ThemedText>
          </Pressable>
        );
      })}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      {GRID_LAYOUTS.map((layout) => {
        const id = `grid:${layout.id}` as TemplateId;
        const active = current === id;
        return (
          <Pressable
            key={layout.id}
            onPress={() => pick(id)}
            accessibilityRole="button"
            accessibilityLabel={`${layout.name} grid`}
            accessibilityState={{ selected: active }}
            style={[styles.gridChip, { borderColor: active ? theme.text : theme.border, backgroundColor: active ? theme.text : 'transparent' }]}
          >
            <GridGlyph layout={layout} color={active ? theme.background : theme.textMuted} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A 18×32 drawing of a layout's cells. */
function GridGlyph({ layout, color }: { layout: GridLayout; color: string }) {
  const W = 18;
  const H = 32;
  return (
    <View style={{ width: W, height: H }}>
      {layout.cells.map((c) => (
        <View
          key={c.id}
          style={{
            position: 'absolute',
            left: c.x * W + 1,
            top: c.y * H + 1,
            width: Math.max(2, c.w * W - 2),
            height: Math.max(2, c.h * H - 2),
            borderRadius: 1.5,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5 },
  divider: { width: 1, height: 24, marginHorizontal: 2 },
  gridChip: {
    width: 40,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
