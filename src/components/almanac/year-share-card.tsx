/**
 * YearShareCard — the whole year in one picture, for sharing: every day of
 * it in one field, each kept day showing its doodle and the rest a dot,
 * under the year and its count, on Fold's hatch with the crane in the
 * corner. Laid out at a fixed 360 × 450 (4:5) and captured larger, so the
 * image is the same on every phone.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import type { AlmanacMonth } from '@/doodles/almanac';
import { DayDoodle } from '@/doodles/day-doodle';
import { DOODLES } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';

export const YEAR_CARD_WIDTH = 360;
export const YEAR_CARD_HEIGHT = 450;
const PADDING = 22;
/** 19 × 20 holds a leap year with room to spare, and keeps each cell legible. */
const COLUMNS = 19;

interface YearShareCardProps {
  months: AlmanacMonth[];
  year: number;
  kept: number;
  total: number;
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}

export function YearShareCard({ months, year, kept, total, ref }: YearShareCardProps) {
  const theme = useTheme();
  const cell = (YEAR_CARD_WIDTH - PADDING * 2) / COLUMNS;
  const days = months.flatMap((m) => m.days);

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: theme.background }]}>
      <DiagonalStripes color={theme.textMuted} opacity={0.08} />
      <View style={styles.head}>
        <ThemedText style={[styles.year, { color: theme.text }]}>{String(year)}</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${String(kept).padStart(3, '0')} / ${total} KEPT`}</ThemedText>
      </View>
      <View style={styles.field}>
        {days.map((d) => (
          <View key={d.key} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
            {d.kept ? (
              <DayDoodle doodle={DOODLES[d.slot]} size={cell * 1.15} moving={false} />
            ) : d.isToday ? (
              <View style={[styles.today, { borderColor: theme.accentWarm }]} />
            ) : (
              <View style={[styles.dot, { backgroundColor: theme.textMuted, opacity: d.isFuture ? 0.3 : 0.7 }]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>A YEAR OF DOODLES</ThemedText>
        <Logo size={26} color={theme.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: YEAR_CARD_WIDTH, height: YEAR_CARD_HEIGHT, paddingHorizontal: PADDING, paddingVertical: 20, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  year: { fontFamily: 'JetBrainsMono-Bold', fontSize: 28, lineHeight: 36, letterSpacing: 1 },
  field: { flexDirection: 'row', flexWrap: 'wrap' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  today: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.2 },
  foot: { position: 'absolute', left: PADDING, right: PADDING, bottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
