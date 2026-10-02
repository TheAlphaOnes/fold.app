import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Composition } from '@/types/journal';

interface ActivityGridProps {
  compositions: Composition[];
}

interface DayCell {
  date: string;
  count: number;
  inYear: boolean;
}

interface WeekColumn {
  index: number;
  days: DayCell[];
}

const CELL_GAP = 1;
const MIN_CELL = 3;

export function ActivityGrid({ compositions }: ActivityGridProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  // Generate the year padded to whole Sunday-Saturday weeks, one entry per
  // day, grouped into week columns — the same grid the card always showed.
  const weeks = useMemo<WeekColumn[]>(() => {
    const countMap: Record<string, number> = {};
    compositions.forEach(comp => {
      const d = new Date(comp.createdAt);
      if (d.getFullYear() === currentYear) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Start on the Sunday before Jan 1, end on the Saturday after Dec 31.
    const startOfYear = new Date(currentYear, 0, 1);
    const startDate = new Date(startOfYear);
    startDate.setDate(startDate.getDate() - startOfYear.getDay());
    const endOfYear = new Date(currentYear, 11, 31);
    const endDate = new Date(endOfYear);
    endDate.setDate(endDate.getDate() + (6 - endOfYear.getDay()));

    const byWeek: DayCell[][] = [];

    let currentDate = new Date(startDate);
    let weekIndex = 0;
    while (currentDate <= endDate) {
      const key = formatDate(currentDate);
      byWeek[weekIndex] = byWeek[weekIndex] || [];
      byWeek[weekIndex].push({
        date: key,
        count: countMap[key] || 0,
        inYear: currentDate.getFullYear() === currentYear,
      });
      if (currentDate.getDay() === 6) weekIndex++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return byWeek.map((days, index) => ({ index, days }));
  }, [compositions, currentYear]);

  let maxCount = 1;
  weeks.forEach(week => week.days.forEach(day => {
    if (day.count > maxCount) maxCount = day.count;
  }));

  // All week columns in one horizontal strip, squares shrunk to whatever
  // fits the card's inner width (page padding 32 + card padding 32). Only if
  // the squares would drop below the legible minimum does the strip wrap
  // onto more lines.
  const innerWidth = width - 64;
  const weekCount = weeks.length;
  let cellSize = Math.floor((innerWidth - (weekCount - 1) * CELL_GAP) / weekCount);
  let columnsPerLine = weekCount;
  if (cellSize < MIN_CELL) {
    columnsPerLine = Math.max(1, Math.floor((innerWidth + CELL_GAP) / (MIN_CELL + CELL_GAP)));
    cellSize = MIN_CELL;
  }
  const lineCount = Math.ceil(weekCount / columnsPerLine);
  const lines = Array.from({ length: lineCount }, (_, rowIdx) =>
    weeks.slice(rowIdx * columnsPerLine, (rowIdx + 1) * columnsPerLine),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Activity</ThemedText>
      </View>

      <View style={styles.gridBlock}>
        {lines.map((line, rowIdx) => (
          <Animated.View
            key={`row-${rowIdx}`}
            entering={FadeIn.delay(rowIdx * 120).duration(400)}
            style={styles.grid}
          >
            {line.map(week => (
              <View key={`week-${week.index}`} style={styles.column}>
                {week.days.map(day => {
                  const opacity = day.count > 0 ? 0.3 + 0.7 * (day.count / maxCount) : 0.1;
                  return (
                    <View
                      key={day.date}
                      style={[
                        styles.cell,
                        { width: cellSize, height: cellSize, backgroundColor: theme.text },
                        day.inYear ? { opacity } : { opacity: 0 },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </Animated.View>
        ))}
      </View>

      <View style={styles.xLabels}>
        <ThemedText style={[styles.xLabel, { color: theme.textMuted }]}>Jan</ThemedText>
        <ThemedText style={[styles.xLabel, { color: theme.textMuted }]}>Apr</ThemedText>
        <ThemedText style={[styles.xLabel, { color: theme.textMuted }]}>Jul</ThemedText>
        <ThemedText style={[styles.xLabel, { color: theme.textMuted }]}>Oct</ThemedText>
        <ThemedText style={[styles.xLabel, { color: theme.textMuted }]}>Dec</ThemedText>
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
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
  },
  gridBlock: {
    gap: CELL_GAP,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  column: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    borderRadius: 1,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  xLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
  },
});
