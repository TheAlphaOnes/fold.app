/**
 * Dev-only: the doodle library month by month, every doodle drawing itself
 * in and boiling, with its serial and name, so each can be judged on a
 * device. Tap a month to switch. Not reachable in release builds.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseButton } from '@/components/round-button';
import { DayDoodle } from '@/doodles/day-doodle';
import { DOODLES, MONTH_DAYS, MONTH_STARTS, serialOf } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';
import { goBack } from '@/utils/navigation';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const COLUMNS = 4;

export default function DoodleLibraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [month, setMonth] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;

  const cell = Math.floor((width - 32) / COLUMNS);
  const start = MONTH_STARTS[month];
  const items = DOODLES.slice(start, start + MONTH_DAYS[month]);

  return (
    <View style={[styles.page, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <CloseButton onPress={() => goBack()} />
        <Text style={[styles.count, { color: theme.textSecondary }]}>{`${DOODLES.length} / 366 drawn`}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.months}>
        {MONTHS.map((m, i) => (
          <Pressable key={m} onPress={() => setMonth(i)} style={[styles.month, i === month && { backgroundColor: theme.text }]}>
            <Text style={[styles.monthText, { color: i === month ? theme.background : theme.textSecondary }]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
        {items.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>not drawn yet</Text>
        ) : (
          items.map((d, i) => (
            <View key={`${month}-${d.name}`} style={{ width: cell, alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                <DayDoodle doodle={d} size={cell} delay={i * 35} />
              </View>
              <Text numberOfLines={1} style={[styles.label, { color: theme.textSecondary }]}>{serialOf(start + i)}</Text>
              <Text numberOfLines={1} style={[styles.label, { color: theme.text }]}>{d.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  count: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  months: { gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  month: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center' },
  monthText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, marginTop: 2 },
  empty: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, padding: 24 },
});
