import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Composition } from '@/types/journal';

interface ActivityGridProps {
  compositions: Composition[];
}

interface DayCell {
  key: string;
  count: number;
  isToday: boolean;
}

interface MonthRow {
  label: string;
  cells: DayCell[];
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_LABEL_WIDTH = 26;
const MONTH_LABEL_GAP = 6;
const CELL_GAP = 1;
const DAY_SLOTS = 31;

export function ActivityGrid({ compositions }: ActivityGridProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // One stable clock for the card's lifetime — a fresh Date each render would
  // invalidate every memo below it.
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();

  const minYear = useMemo(() => {
    if (compositions.length === 0) return currentYear;
    return Math.min(...compositions.map(c => new Date(c.createdAt).getFullYear()));
  }, [compositions, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const isCurrentYear = selectedYear === currentYear;
  const canGoPrev = selectedYear > minYear;
  const canGoNext = selectedYear < currentYear;

  const handlePrevYear = () => {
    if (canGoPrev) setSelectedYear(selectedYear - 1);
  };

  const handleNextYear = () => {
    if (canGoNext) setSelectedYear(selectedYear + 1);
  };

  // One row per month, one cell per calendar day — the whole year reads as a
  // vertical tape, no scrolling, day columns aligned across every month.
  const monthRows = useMemo<MonthRow[]>(() => {
    const countMap: Record<string, number> = {};
    compositions.forEach(comp => {
      const d = new Date(comp.createdAt);
      if (d.getFullYear() === selectedYear) {
        const key = `${d.getMonth()}-${d.getDate()}`;
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    return MONTH_LABELS.map((label, month) => {
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
      const cells: DayCell[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        cells.push({
          key: `${month}-${day}`,
          count: countMap[`${month}-${day}`] || 0,
          isToday: isCurrentYear && month === today.getMonth() && day === today.getDate(),
        });
      }
      return { label, cells };
    });
  }, [compositions, selectedYear, isCurrentYear, today]);

  let maxCount = 1;
  monthRows.forEach(row => row.cells.forEach(cell => {
    if (cell.count > maxCount) maxCount = cell.count;
  }));

  // Day cells are sized so the longest month (31 days) fits the card's inner
  // width exactly: window width minus page padding (32), card padding (32),
  // the month label, its gap, and 30 inter-cell gaps.
  const cellSize = Math.max(
    4,
    Math.floor((width - 64 - MONTH_LABEL_WIDTH - MONTH_LABEL_GAP - (DAY_SLOTS - 1) * CELL_GAP) / DAY_SLOTS),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.headerLabel, { color: theme.textMuted }]}>ACTIVITY</ThemedText>
        <View style={styles.yearSelector}>
          <Pressable
            onPress={handlePrevYear}
            disabled={!canGoPrev}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
            accessibilityState={{ disabled: !canGoPrev }}
            style={({ pressed }) => [styles.yearButton, (!canGoPrev || pressed) && styles.yearButtonFaded]}
          >
            <ChevronLeft size={14} color={theme.textMuted} />
          </Pressable>
          <ThemedText style={[styles.yearValue, { color: theme.text }]}>{selectedYear}</ThemedText>
          <Pressable
            onPress={handleNextYear}
            disabled={!canGoNext}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            accessibilityState={{ disabled: !canGoNext }}
            style={({ pressed }) => [styles.yearButton, (!canGoNext || pressed) && styles.yearButtonFaded]}
          >
            <ChevronRight size={14} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {monthRows.map((row, rowIdx) => (
          <Animated.View
            key={row.label}
            entering={FadeIn.delay(rowIdx * 40).duration(300)}
            style={styles.monthRow}
          >
            <ThemedText style={[styles.monthLabel, { color: theme.textMuted }]}>{row.label}</ThemedText>
            <View style={styles.dayRow}>
              {row.cells.map(cell => {
                const opacity = cell.count > 0 ? 0.3 + 0.7 * (cell.count / maxCount) : 0.1;
                return (
                  <View
                    key={cell.key}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize, backgroundColor: theme.text, opacity },
                      cell.isToday && { borderWidth: 1, borderColor: theme.accentWarm },
                    ]}
                  />
                );
              })}
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 3,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearButton: {
    padding: 2,
  },
  yearButtonFaded: {
    opacity: 0.3,
  },
  yearValue: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    lineHeight: 18,
    includeFontPadding: false,
  } as any,
  grid: {
    gap: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthLabel: {
    width: MONTH_LABEL_WIDTH,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 1,
    includeFontPadding: false,
  } as any,
  dayRow: {
    flexDirection: 'row',
    marginLeft: MONTH_LABEL_GAP,
    gap: CELL_GAP,
  },
  cell: {
    borderRadius: 1,
  },
});
