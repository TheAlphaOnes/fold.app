/**
 * Almanac — the whole year of doodles, opened from the profile's card.
 * Twelve months in order, each kept day showing its date's doodle; tap a
 * lived day to open it in the Time Machine. The current month boils; the
 * rest stay still, so a full year on screen stays light.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALMANAC_COLUMNS, AlmanacGrid } from '@/components/almanac/almanac-grid';
import { CloseButton } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { fadeIn } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { MONTH_NAMES, almanacYear } from '@/doodles/almanac';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack, navigate } from '@/utils/navigation';

const EMPTY: Record<string, number> = {};

export default function AlmanacScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const cached = useProfileDataStore((s) => s.dayCounts);
  const cachedYear = useProfileDataStore((s) => s.dayCountsYear);
  const counts = cached && cachedYear === year ? cached : EMPTY;

  const months = useMemo(() => almanacYear(year, counts, now), [counts, now, year]);
  const kept = months.reduce((n, m) => n + m.kept, 0);
  const total = months.reduce((n, m) => n + m.days.length, 0);
  const cell = Math.floor((width - 32) / ALMANAC_COLUMNS);

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <CloseButton onPress={() => goBack('/')} />
        <View style={styles.title}>
          <ThemedText style={[styles.year, { color: theme.text }]}>{String(year)}</ThemedText>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`ALMANAC · ${String(kept).padStart(3, '0')} / ${total}`}</ThemedText>
        </View>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        {months.map((m, i) => (
          <Animated.View key={m.month} entering={fadeIn(260, 40 + Math.min(i, 4) * 50)} style={styles.month}>
            <View style={styles.monthHead}>
              <ThemedText style={[Type.rail, { color: m.month === now.getMonth() ? theme.text : theme.textMuted }]}>{MONTH_NAMES[m.month].toUpperCase()}</ThemedText>
              <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${String(m.kept).padStart(2, '0')} / ${m.days.length}`}</ThemedText>
            </View>
            <AlmanacGrid
              days={m.days}
              cell={cell}
              moving={m.month === now.getMonth()}
              onDay={(d) => {
                haptic.press();
                navigate.push(`/time-machine?day=${d.key}`);
              }}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { alignItems: 'center', gap: 2 },
  year: { fontFamily: 'JetBrainsMono-Medium', fontSize: 15, letterSpacing: 2 },
  spacer: { width: 44 },
  month: { marginTop: 18 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
