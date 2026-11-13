/**
 * AlmanacGrid — one month of the almanac: each kept day's doodle, a quiet
 * dot for the others (fainter for days still to come), and today ringed in
 * the accent until it's kept. Used by the profile card and the year screen.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AlmanacDay } from '@/doodles/almanac';
import { DayDoodle } from '@/doodles/day-doodle';
import { DOODLES } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';

export const ALMANAC_COLUMNS = 8;

interface AlmanacGridProps {
  days: AlmanacDay[];
  /** Cell side, in points. */
  cell: number;
  /** Doodles keep their hand-drawn boil (off for months scrolled past). */
  moving?: boolean;
  /** Tap a lived day; omitted, the cells aren't touch targets. */
  onDay?: (day: AlmanacDay) => void;
}

export function AlmanacGrid({ days, cell, moving = true, onDay }: AlmanacGridProps) {
  const theme = useTheme();
  let kept = 0;
  return (
    <View style={styles.grid}>
      {days.map((d) => {
        const face = d.kept ? (
          <DayDoodle doodle={DOODLES[d.slot]} size={cell} moving={moving} delay={(kept++) * 45} />
        ) : d.isToday ? (
          <View style={[styles.today, { borderColor: theme.accentWarm }]} />
        ) : (
          <View style={[styles.dot, { backgroundColor: theme.textMuted, opacity: d.isFuture ? 0.35 : 0.8 }]} />
        );
        const canOpen = onDay && !d.isFuture;
        return canOpen ? (
          <Pressable
            key={d.key}
            onPress={() => onDay(d)}
            accessibilityRole="button"
            accessibilityLabel={d.kept ? `${d.key}, ${DOODLES[d.slot].name}` : d.key}
            style={[styles.cell, { width: cell, height: cell }]}
          >
            {face}
          </Pressable>
        ) : (
          <View key={d.key} style={[styles.cell, { width: cell, height: cell }]}>
            {face}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  today: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
