import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Type } from '@/constants/theme';
import type { Composition } from '@/types/journal';

interface ActivityGridProps {
  compositions: Composition[];
}

interface DayCell {
  date: string;
  count: number;
  inYear: boolean;
  isToday: boolean;
}

interface WeekColumn {
  index: number;
  days: DayCell[];
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const CELL_GAP = 1;
const LABEL_SIZE = 9;
const LABEL_TRACKING = 0.4;
const LABEL_CHAR = LABEL_SIZE * 0.62;
const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);

function textWidth(text: string): number {
  return text.length * LABEL_CHAR + Math.max(0, text.length - 1) * LABEL_TRACKING;
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function cellFill(
  day: DayCell,
  maxCount: number,
  ink: string,
  idle: string,
): { backgroundColor: string; opacity: number; borderColor: string } {
  if (!day.inYear) {
    return { backgroundColor: 'transparent', opacity: 0, borderColor: 'transparent' };
  }
  if (day.count <= 0) {
    return {
      backgroundColor: idle,
      opacity: day.isToday ? 0.45 : 0.22,
      borderColor: day.isToday ? ink : 'transparent',
    };
  }
  const t = day.count / maxCount;
  return {
    backgroundColor: ink,
    opacity: 0.4 + 0.6 * t,
    borderColor: day.isToday ? ink : 'transparent',
  };
}

export function ActivityGrid({ compositions }: ActivityGridProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const currentYear = new Date().getFullYear();
  const todayKey = formatDate(new Date());

  const { weeks, monthStarts, litDays, maxCount } = useMemo(() => {
    const countMap: Record<string, number> = {};
    compositions.forEach((comp) => {
      const d = new Date(comp.createdAt);
      if (d.getFullYear() === currentYear) {
        const key = formatDate(d);
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const startOfYear = new Date(currentYear, 0, 1);
    const startDate = new Date(startOfYear);
    startDate.setDate(startDate.getDate() - startOfYear.getDay());
    const endOfYear = new Date(currentYear, 11, 31);
    const endDate = new Date(endOfYear);
    endDate.setDate(endDate.getDate() + (6 - endOfYear.getDay()));

    const byWeek: DayCell[][] = [];
    let currentDate = new Date(startDate);
    let weekIndex = 0;
    let peak = 1;
    let lit = 0;

    while (currentDate <= endDate) {
      const key = formatDate(currentDate);
      byWeek[weekIndex] = byWeek[weekIndex] || [];
      const count = countMap[key] || 0;
      const inYear = currentDate.getFullYear() === currentYear;
      if (inYear && count > 0) {
        lit += 1;
        if (count > peak) peak = count;
      }
      byWeek[weekIndex].push({
        date: key,
        count,
        inYear,
        isToday: key === todayKey,
      });
      if (currentDate.getDay() === 6) weekIndex += 1;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const monthStarts = MONTHS.map((label, m) => {
      const first = new Date(currentYear, m, 1);
      const days = Math.round((first.getTime() - startDate.getTime()) / 86400000);
      return { label, week: Math.floor(days / 7) };
    });

    const weeks: WeekColumn[] = byWeek.map((days, index) => ({ index, days }));
    return { weeks, monthStarts, litDays: lit, maxCount: peak };
  }, [compositions, currentYear, todayKey]);

  const innerWidth = width - 64;
  const weekCount = weeks.length;
  const cellSize = (innerWidth - (weekCount - 1) * CELL_GAP) / weekCount;
  const columnPitch = cellSize + CELL_GAP;
  const ink = theme.accentWarm;
  const idle = theme.border;

  const monthLabels = monthStarts.map((ms, i) => {
    const start = ms.week * columnPitch;
    const end = (monthStarts[i + 1]?.week ?? weekCount) * columnPitch;
    const band = Math.max(0, end - start);
    const fullWidth = textWidth(ms.label);
    const text = band >= fullWidth + 4 ? ms.label : ms.label[0];
    const labelW = textWidth(text);
    return {
      key: `${ms.label}-${i}`,
      text,
      left: start + Math.max(0, (band - labelW) / 2),
    };
  });

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Activity ${currentYear}. ${litDays} days written.`}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220).easing(EASE_OUT)}
        style={styles.rail}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>ACTIVITY</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>
          {pad3(litDays)} DAYS
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(80).duration(280).easing(EASE_OUT)}
        style={styles.grid}
      >
        {weeks.map((week) => (
          <View key={`week-${week.index}`} style={styles.column}>
            {week.days.map((day) => {
              const fill = cellFill(day, maxCount, ink, idle);
              return (
                <View
                  key={day.date}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: fill.backgroundColor,
                      opacity: fill.opacity,
                      borderColor: fill.borderColor,
                      borderWidth: day.isToday && day.inYear ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(180).duration(240).easing(EASE_OUT)}
        style={styles.xLabels}
      >
        {monthLabels.map((label) => (
          <ThemedText
            key={label.key}
            style={[styles.xLabel, { color: theme.textMuted, left: label.left }]}
          >
            {label.text}
          </ThemedText>
        ))}
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
    paddingHorizontal: 16,
  },
  column: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    borderRadius: 1,
  },
  xLabels: {
    position: 'relative',
    height: 12,
    marginTop: 8,
    marginBottom: 16,
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
});
