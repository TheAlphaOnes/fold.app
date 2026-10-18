/**
 * ActivityGrid — the year as a compact heatmap: one column per week, one
 * square per day.
 *
 * Refinements over a plain heatmap:
 *  - four distinct accent levels (1, 2, 3, 4+ memories) instead of a
 *    continuous fade, so busy days read at a glance;
 *  - days already lived are grey, the rest of the year fainter, so "now"
 *    is visible in the grid itself;
 *  - today wears an outline that breathes gently;
 *  - months with writing are labelled in full ink, the rest muted;
 *  - a small less/more legend; tap a square to open that day.
 *
 * The whole year sits on one line that fits the card exactly, no scrolling:
 * square size is derived from the card width and the year's week count.
 *
 * Counts come from the database (whole year, live memories only).
 * Entrance: the weeks sweep in left to right, 6ms apart, each column's
 * fade resolving faster than the sweep travels.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { Type } from '@/constants/theme';
import { fadeIn } from '@/constants/motion';
import { getDayCountsForYear } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

interface DayCell {
  date: string;
  count: number;
  inYear: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const CELL_GAP = 1.5;
const GRID_PADDING = 16;
const LABEL_SIZE = 9;
const LABEL_TRACKING = 0.4;
const LABEL_CHAR = LABEL_SIZE * 0.62;
const WEEK_STAGGER = 6;
/** Accent opacity for 1, 2, 3 and 4+ memories in a day. */
const LEVELS = [0.42, 0.62, 0.82, 1];

function textWidth(text: string): number {
  return text.length * LABEL_CHAR + Math.max(0, text.length - 1) * LABEL_TRACKING;
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface Panel {
  weeks: DayCell[][];
  monthStarts: { label: string; month: number; week: number }[];
}

/** Week columns for months [firstMonth, lastMonth] of a year, Sunday-aligned. */
function buildPanel(
  year: number,
  firstMonth: number,
  lastMonth: number,
  countMap: Record<string, number>,
  todayKey: string,
): Panel {
  const first = new Date(year, firstMonth, 1);
  const last = new Date(year, lastMonth + 1, 0);
  const start = new Date(year, firstMonth, 1 - first.getDay());
  const end = new Date(year, lastMonth, last.getDate() + (6 - last.getDay()));

  const weeks: DayCell[][] = [];
  let cursor = new Date(start);
  let week = 0;
  while (cursor <= end) {
    const key = formatDate(cursor);
    const inPanel = cursor >= first && cursor <= last;
    (weeks[week] ??= []).push({
      date: key,
      count: countMap[key] ?? 0,
      inYear: inPanel,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
    if (cursor.getDay() === 6) week += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  const monthStarts = [];
  for (let m = firstMonth; m <= lastMonth; m++) {
    const offset = Math.round((new Date(year, m, 1).getTime() - start.getTime()) / 86400000);
    monthStarts.push({
      label: MONTHS[m],
      month: m,
      week: Math.floor(offset / 7),
    });
  }
  return { weeks, monthStarts };
}

function levelFor(count: number): number {
  return LEVELS[Math.min(count, LEVELS.length) - 1];
}

/** Today's square: an accent outline that breathes, so "now" is findable. */
function TodayOutline({ size }: { size: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    glow.set(
      withRepeat(
        withSequence(
          withTiming(0.35, {
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.todayOutline, { width: size + 2, height: size + 2, borderColor: theme.accentWarm }, style]}
    />
  );
}

function YearStrip({
  panel,
  cellSize,
  columnPitch,
  activeMonths,
  delayBase,
  reduceMotion,
}: {
  panel: Panel;
  cellSize: number;
  columnPitch: number;
  activeMonths: Set<number>;
  delayBase: number;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const ink = theme.accentWarm;
  const { weeks, monthStarts } = panel;

  // One touch target per panel: the tap position picks the day.
  const openDayAt = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const column = weeks[Math.floor((locationX - GRID_PADDING) / columnPitch)];
    const day = column?.[Math.floor(locationY / columnPitch)];
    if (!day || !day.inYear || day.isFuture) return;
    haptic.press();
    router.push(`/time-machine?day=${day.date}`);
  };

  const labels = monthStarts.map((ms, i) => {
    const startX = ms.week * columnPitch;
    const endX = (monthStarts[i + 1]?.week ?? weeks.length) * columnPitch;
    const band = Math.max(0, endX - startX);
    const text = band >= textWidth(ms.label) + 4 ? ms.label : ms.label[0];
    return {
      key: ms.label,
      text,
      left: startX + Math.max(0, (band - textWidth(text)) / 2),
      active: activeMonths.has(ms.month),
    };
  });

  return (
    <View>
      <Pressable
        onPress={openDayAt}
        accessibilityRole="button"
        accessibilityLabel="Open a day in the Time Machine"
        style={styles.grid}
      >
        {weeks.map((days, index) => (
          <Animated.View
            key={`week-${index}`}
            entering={reduceMotion ? undefined : fadeIn(180, delayBase + index * WEEK_STAGGER)}
            style={styles.column}
          >
            {days.map((day) => {
              if (!day.inYear) return <View key={day.date} style={{ width: cellSize, height: cellSize }} />;
              const lit = day.count > 0;
              return (
                <View key={day.date} style={{ width: cellSize, height: cellSize }}>
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.cell,
                      {
                        backgroundColor: lit ? ink : theme.border,
                        opacity: lit ? levelFor(day.count) : day.isFuture ? 0.1 : 0.28,
                      },
                    ]}
                  />
                  {day.isToday && <TodayOutline size={cellSize} />}
                </View>
              );
            })}
          </Animated.View>
        ))}
      </Pressable>

      <Animated.View entering={reduceMotion ? undefined : fadeIn(240, delayBase + 160)} style={styles.xLabels}>
        {labels.map((label) => (
          <ThemedText
            key={label.key}
            style={[
              styles.xLabel,
              {
                color: label.active ? theme.text : theme.textMuted,
                left: label.left,
              },
            ]}
          >
            {label.text}
          </ThemedText>
        ))}
      </Animated.View>
    </View>
  );
}

export function ActivityGrid() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const todayKey = formatDate(now);

  const [countMap, setCountMap] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getDayCountsForYear(currentYear)
      .then((counts) => {
        if (!cancelled) setCountMap(counts);
      })
      .catch((error) => console.error('Failed to load activity', error));
    return () => {
      cancelled = true;
    };
  }, [currentYear, hydrationVersion]);

  const { year, litDays, activeMonths } = useMemo(() => {
    const months = new Set<number>();
    let lit = 0;
    for (const [key, count] of Object.entries(countMap)) {
      if (count > 0 && key.startsWith(`${currentYear}-`)) {
        lit += 1;
        months.add(Number(key.slice(5, 7)) - 1);
      }
    }
    return {
      year: buildPanel(currentYear, 0, 11, countMap, todayKey),
      litDays: lit,
      activeMonths: months,
    };
  }, [countMap, currentYear, todayKey]);

  // Card is inset 16pt from each screen edge; the grid 16pt inside it.
  const innerWidth = width - 32 - GRID_PADDING * 2;
  const columns = year.weeks.length;
  const cellSize = Math.floor(((innerWidth - (columns - 1) * CELL_GAP) / columns) * 10) / 10;
  const columnPitch = cellSize + CELL_GAP;
  const ink = theme.accentWarm;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Activity ${currentYear}. ${litDays} days written.`}
    >
      <Animated.View entering={reduceMotion ? undefined : fadeIn(220)} style={styles.rail}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>ACTIVITY</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{pad3(litDays)} DAYS</ThemedText>
      </Animated.View>

      <YearStrip
        panel={year}
        cellSize={cellSize}
        columnPitch={columnPitch}
        activeMonths={activeMonths}
        delayBase={60}
        reduceMotion={reduceMotion}
      />

      <Animated.View
        entering={reduceMotion ? undefined : fadeIn(240, 300)}
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ThemedText style={[styles.legendText, { color: theme.textMuted }]}>less</ThemedText>
        {LEVELS.map((opacity) => (
          <View key={opacity} style={[styles.legendCell, { backgroundColor: ink, opacity }]} />
        ))}
        <ThemedText style={[styles.legendText, { color: theme.textMuted }]}>more</ThemedText>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
    paddingHorizontal: GRID_PADDING,
  },
  column: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    borderRadius: 1.5,
  },
  todayOutline: {
    position: 'absolute',
    top: -1,
    left: -1,
    borderRadius: 2.5,
    borderWidth: 1,
  },
  xLabels: {
    position: 'relative',
    height: 12,
    marginTop: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  xLabel: {
    position: 'absolute',
    top: 0,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: LABEL_SIZE,
    letterSpacing: LABEL_TRACKING,
    lineHeight: 12,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  legendCell: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
  },
  legendText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 8,
    lineHeight: 11,
    marginHorizontal: 3,
  },
});
