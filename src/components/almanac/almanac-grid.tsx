/**
 * AlmanacGrid — one month of the almanac: each kept day's doodle, a quiet
 * dot for the others (fainter for days still to come), and today ringed in
 * the accent until it's kept. The days pop in one by one, in calendar
 * order, so the month fills in like it was lived. Used by the profile card
 * and the year screen. Tapping a kept day's doodle opens it large in the
 * spotlight; tapping another lived day opens it in `onDay`.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { DoodleSpotlight } from '@/components/almanac/doodle-spotlight';
import type { AlmanacDay } from '@/doodles/almanac';
import { DayDoodle, POP } from '@/doodles/day-doodle';
import { DOODLES } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';

export const ALMANAC_COLUMNS = 8;
/** The beat between one day's pop and the next. */
const STEP_MS = 28;

interface AlmanacGridProps {
  days: AlmanacDay[];
  /** Cell side, in points. */
  cell: number;
  /** Doodles keep their hand-drawn boil (off for months scrolled past). */
  moving?: boolean;
  /** Opens a lived day (the Time Machine). */
  onDay: (day: AlmanacDay) => void;
}

export function AlmanacGrid({ days, cell, moving = true, onDay }: AlmanacGridProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [spotlit, setSpotlit] = useState<AlmanacDay | null>(null);
  return (
    <View style={styles.grid}>
      <DoodleSpotlight
        day={spotlit}
        onClose={() => setSpotlit(null)}
        onOpenDay={(d) => {
          setSpotlit(null);
          onDay(d);
        }}
      />
      {days.map((d, i) => {
        const drawn = d.kept ? (
          <DayDoodle doodle={DOODLES[d.slot]} size={cell} moving={moving} />
        ) : d.isToday ? (
          <View style={[styles.today, { borderColor: theme.accentWarm }]} />
        ) : (
          <View style={[styles.dot, { backgroundColor: theme.textMuted, opacity: d.isFuture ? 0.35 : 0.8 }]} />
        );
        const face = <Animated.View entering={reduced ? undefined : POP.delay(i * STEP_MS)}>{drawn}</Animated.View>;
        const canOpen = !d.isFuture;
        return canOpen ? (
          <Pressable
            key={d.key}
            onPress={() => (d.kept ? setSpotlit(d) : onDay(d))}
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
