/**
 * ActivityGrid — a year of writing at a glance.
 *
 * Twelve rows, one per month, each a line of day dots: written days glow in
 * the accent (brighter with more memories), unwritten past days are small
 * grey dots, future days fainter still, and today wears a ring. Each month
 * shows its count on the right. Tap a day to open it in the Time Machine;
 * the chevrons step back through earlier years.
 *
 * Counts come from the database (not the profile's recent-memories list),
 * so the whole year is accurate and binned memories never count.
 *
 * Entrance: months reveal top to bottom 30ms apart; the header and footer
 * resolve on their own curves.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { ThemedText } from './themed-text';
import { Type } from '@/constants/theme';
import { fadeIn, riseIn } from '@/constants/motion';
import { getDayCountsForYear, getFirstMemoryYear } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_IN_ROW = 31;
const CARD_GUTTER = 16; // profile screen padding
const INNER_PADDING = 16;
const LABEL_WIDTH = 34;
const COUNT_WIDTH = 22;
const ROW_GAP = 5;
const ROW_STAGGER = 30;

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Brightness for a written day: one memory reads clearly, three or more is full. */
function intensity(count: number): number {
  if (count >= 3) return 1;
  if (count === 2) return 0.78;
  return 0.56;
}

interface MonthRowProps {
  year: number;
  month: number;
  counts: Record<string, number>;
  cell: number;
  todayKey: string;
  now: Date;
  index: number;
}

function MonthRow({ year, month, counts, cell, todayKey, now, index }: MonthRowProps) {
  const theme = useTheme();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const key = dayKey(year, month, day);
    return {
      key,
      count: counts[key] ?? 0,
      future: new Date(year, month, day) > now,
      isToday: key === todayKey,
    };
  });
  const written = days.filter((d) => d.count > 0).length;

  const dots = days.map(({ key, count, future, isToday }) => {
    const size = count > 0 ? cell * 0.78 : cell * 0.3;
    return (
      <View key={key} style={[styles.cell, { width: cell, height: cell }]}>
        {isToday && (
          <View
            style={[
              styles.todayRing,
              { width: cell, height: cell, borderRadius: cell / 2, borderColor: theme.accentWarm },
            ]}
          />
        )}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: count > 0 ? theme.accentWarm : theme.textMuted,
            opacity: count > 0 ? intensity(count) : future ? 0.12 : 0.35,
          }}
        />
      </View>
    );
  });

  // One touch target per month: the tapped x picks the day, so 365 dots do
  // not each need their own pressable.
  const handlePress = (event: GestureResponderEvent) => {
    const day = Math.floor(event.nativeEvent.locationX / cell) + 1;
    if (day < 1 || day > daysInMonth) return;
    if (new Date(year, month, day) > now) return;
    haptic.press();
    router.push(`/time-machine?day=${dayKey(year, month, day)}`);
  };

  return (
    <Animated.View entering={riseIn(260, 80 + index * ROW_STAGGER, 6)} style={styles.row}>
      <ThemedText style={[styles.monthLabel, { color: written > 0 ? theme.text : theme.textMuted }]}>
        {MONTHS[month]}
      </ThemedText>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${MONTHS[month]} ${year}, ${written} days written. Tap a day to open it.`}
        style={[styles.dots, { width: cell * DAYS_IN_ROW }]}
      >
        {dots}
      </Pressable>
      <ThemedText style={[styles.count, { color: written > 0 ? theme.accentWarm : theme.textMuted }]}>
        {written > 0 ? written : '·'}
      </ThemedText>
    </Animated.View>
  );
}

export function ActivityGrid() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [firstYear, setFirstYear] = useState(thisYear);
  const [counts, setCounts] = useState<{ year: number; byDay: Record<string, number> } | null>(null);
  const [now] = useState(() => new Date());
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDayCountsForYear(year), getFirstMemoryYear()])
      .then(([byDay, first]) => {
        if (cancelled) return;
        setCounts({ year, byDay });
        setFirstYear(Math.min(first ?? thisYear, thisYear));
      })
      .catch((error) => console.error('Failed to load activity', error));
    return () => {
      cancelled = true;
    };
  }, [year, hydrationVersion, thisYear]);

  const byDay = useMemo(() => (counts?.year === year ? counts.byDay : {}), [counts, year]);
  const totalDays = Object.keys(byDay).length;
  const busiest = useMemo(() => {
    const perMonth = new Array(12).fill(0) as number[];
    for (const key of Object.keys(byDay)) perMonth[Number(key.slice(5, 7)) - 1] += 1;
    const max = Math.max(...perMonth);
    return max > 0 ? { month: MONTHS[perMonth.indexOf(max)], days: max } : null;
  }, [byDay]);

  const available = width - CARD_GUTTER * 2 - 2 - INNER_PADDING * 2 - LABEL_WIDTH - COUNT_WIDTH - 16;
  const cell = Math.floor((available / DAYS_IN_ROW) * 10) / 10;

  const step = (delta: number) => {
    const next = year + delta;
    if (next < firstYear || next > thisYear) return;
    haptic.select();
    setYear(next);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <Animated.View entering={fadeIn(220)} style={styles.rail}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>ACTIVITY</ThemedText>
        <View style={styles.yearNav}>
          <Pressable
            onPress={() => step(-1)}
            disabled={year <= firstYear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
            style={{ opacity: year <= firstYear ? 0.3 : 1 }}
          >
            <ChevronLeft size={14} color={theme.text} />
          </Pressable>
          <ThemedText style={[Type.rail, styles.yearText, { color: theme.text }]}>{year}</ThemedText>
          <Pressable
            onPress={() => step(1)}
            disabled={year >= thisYear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            style={{ opacity: year >= thisYear ? 0.3 : 1 }}
          >
            <ChevronRight size={14} color={theme.text} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Re-keyed per year so the months cascade in again on year change. */}
      <View key={year} style={styles.months}>
        {MONTHS.map((_, month) => (
          <MonthRow
            key={month}
            year={year}
            month={month}
            counts={byDay}
            cell={cell}
            todayKey={todayKey}
            now={now}
            index={month}
          />
        ))}
      </View>

      <Animated.View entering={fadeIn(260, 480)} style={[styles.footer, { borderTopColor: theme.border }]}>
        <ThemedText style={[styles.footerText, { color: theme.textMuted }]} numberOfLines={1}>
          {totalDays === 0
            ? `no memories in ${year} yet`
            : `${totalDays} ${totalDays === 1 ? 'day' : 'days'} written${busiest ? `  ·  busiest ${busiest.month} (${busiest.days})` : ''}`}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: INNER_PADDING,
    paddingTop: 16,
    paddingBottom: 14,
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearText: {
    fontVariant: ['tabular-nums'],
  },
  months: {
    paddingHorizontal: INNER_PADDING,
    paddingBottom: 14,
    gap: ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    width: LABEL_WIDTH,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  count: {
    width: COUNT_WIDTH,
    textAlign: 'right',
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    lineHeight: 12,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    paddingHorizontal: INNER_PADDING,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
});
