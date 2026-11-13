/**
 * AlmanacCard — the profile's activity card: this month as doodles. Every
 * day a memory was kept shows that date's doodle; the rest are dots. The
 * card opens the whole year (/almanac); the share icon keeps opening the
 * achievement card.
 *
 * Counts come from the profile cache (this year, live memories only).
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronRight, Share2 } from 'lucide-react-native';

import { ALMANAC_COLUMNS, AlmanacGrid } from '@/components/almanac/almanac-grid';
import { ThemedText } from '@/components/themed-text';
import { fadeIn } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { MONTH_NAMES, almanacMonth } from '@/doodles/almanac';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { navigate } from '@/utils/navigation';

const PADDING = 16;
const HEAD = 40;
const FOOTER = 44;
const EMPTY: Record<string, number> = {};

/** The card's cell size at a screen width: inset 16 from the edges, grid 16 inside. */
export const almanacCell = (screenWidth: number) => Math.floor((screenWidth - 32 - PADDING * 2) / ALMANAC_COLUMNS);

/** The card's full height for a month of `days`, so its placeholder never jumps. */
export const almanacCardHeight = (screenWidth: number, days: number) =>
  HEAD + Math.ceil(days / ALMANAC_COLUMNS) * almanacCell(screenWidth) + FOOTER + 2;

const pad3 = (n: number) => String(n).padStart(3, '0');

export function AlmanacCard() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const cached = useProfileDataStore((s) => s.dayCounts);
  const cachedYear = useProfileDataStore((s) => s.dayCountsYear);
  const counts = cached && cachedYear === now.getFullYear() ? cached : EMPTY;

  const month = useMemo(() => almanacMonth(now.getFullYear(), now.getMonth(), counts, now), [counts, now]);
  const keptYear = useMemo(() => Object.entries(counts).filter(([k, n]) => n > 0 && k.startsWith(`${now.getFullYear()}-`)).length, [counts, now]);

  const cell = almanacCell(width);

  const open = () => {
    haptic.press();
    navigate.push('/almanac');
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Almanac, ${MONTH_NAMES[month.month]}: ${month.kept} doodles kept. Opens the whole year.`}
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <View style={styles.head}>
        <ThemedText style={[Type.rail, { color: theme.text }]}>{MONTH_NAMES[month.month].toUpperCase()}</ThemedText>
        <View style={styles.headRight}>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${String(month.kept).padStart(2, '0')} / ${month.days.length}`}</ThemedText>
          <ChevronRight size={14} color={theme.textMuted} />
        </View>
      </View>

      <View style={styles.grid}>
        <AlmanacGrid
          days={month.days}
          cell={cell}
          onDay={(d) => {
            haptic.press();
            navigate.push(`/time-machine?day=${d.key}`);
          }}
        />
      </View>

      <Animated.View entering={fadeIn(240, 300)} style={styles.footer}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`ALMANAC · ${pad3(keptYear)} DAYS`}</ThemedText>
        <Pressable
          onPress={() => {
            haptic.tap();
            navigate.push('/achievement');
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Share your achievement"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Share2 size={16} color={theme.textMuted} />
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  head: { height: HEAD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PADDING },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { paddingHorizontal: PADDING },
  footer: { height: FOOTER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PADDING },
});
