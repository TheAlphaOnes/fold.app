import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Composition } from '@/types/journal';

interface ActivityGridProps {
  compositions: Composition[];
}

export function ActivityGrid({ compositions }: ActivityGridProps) {
  const { width } = useWindowDimensions();
  const today = new Date();
  
  // Find min year from DB or default to current year
  const minYear = useMemo(() => {
    if (compositions.length === 0) return today.getFullYear();
    const years = compositions.map(c => new Date(c.createdAt).getFullYear());
    return Math.min(...years);
  }, [compositions]);

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const theme = useTheme();
  
  const handlePrevYear = () => {
    if (selectedYear > minYear) {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < today.getFullYear()) {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Generate 53 weeks x 7 days for the selected year
  const { gridData, totalForYear } = useMemo(() => {
    const data: { date: string; count: number; dayOfWeek: number; weekIndex: number }[] = [];
    
    const countMap: Record<string, number> = {};
    let total = 0;
    
    const formatDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    compositions.forEach(comp => {
      const d = new Date(comp.createdAt);
      if (d.getFullYear() === selectedYear) {
        const key = formatDate(d);
        countMap[key] = (countMap[key] || 0) + 1;
        total++;
      }
    });

    // Determine the first day of the year
    const startOfYear = new Date(selectedYear, 0, 1);
    const startDayOfWeek = startOfYear.getDay(); // 0 (Sun) to 6 (Sat)
    
    // We want the grid to start on a Sunday. So we might need to pad the beginning.
    const startDate = new Date(startOfYear);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    // End date is Dec 31st of selected year, plus padding to end on Saturday
    const endOfYear = new Date(selectedYear, 11, 31);
    const endDayOfWeek = endOfYear.getDay();
    const endDate = new Date(endOfYear);
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    // Now loop from startDate to endDate
    let currentDate = new Date(startDate);
    let weekIndex = 0;

    while (currentDate <= endDate) {
      const key = formatDate(currentDate);
      const count = countMap[key] || 0;
      
      data.push({
        date: key,
        count,
        dayOfWeek: currentDate.getDay(),
        weekIndex
      });

      if (currentDate.getDay() === 6) {
        weekIndex++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { gridData: data, totalForYear: total };
  }, [compositions, selectedYear]);

  const maxCount = Math.max(...gridData.map(d => d.count), 1);

  // Group by week for column-based rendering
  const weeks: (typeof gridData)[] = [];
  gridData.forEach(day => {
    if (!weeks[day.weekIndex]) weeks[day.weekIndex] = [];
    weeks[day.weekIndex].push(day);
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ThemedText style={[styles.title, { color: theme.text }]}>Activity</ThemedText>
          <ThemedText style={styles.scrollHint}>{'<<< SCROLL'}</ThemedText>
        </View>
        <View style={[styles.badge, { borderColor: theme.border }]}>
          <ThemedText style={styles.badgeText}>1Y</ThemedText>
        </View>
      </View>
      
      <View style={styles.scrollWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          ref={(ref) => {
            // Wait for layout then scroll to end
            setTimeout(() => {
              ref?.scrollToEnd({ animated: false });
            }, 0);
          }}
        >
          <View style={styles.grid}>
            {weeks.map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.column}>
                {week.map((day) => {
                  let opacity = 0.1;
                  if (day.count > 0) {
                    opacity = 0.3 + (0.7 * (day.count / maxCount));
                  }

                  const isCurrentYear = new Date(day.date).getFullYear() === selectedYear;

                  return (
                    <View 
                      key={day.date} 
                      style={[
                        styles.cell,
                        day.count > 0 ? { backgroundColor: theme.text, opacity } : { backgroundColor: theme.text, opacity: 0.1 },
                        !isCurrentYear && { opacity: 0 } 
                      ]} 
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.xLabels}>
        <ThemedText style={styles.xLabel}>Jan</ThemedText>
        <ThemedText style={styles.xLabel}>Apr</ThemedText>
        <ThemedText style={styles.xLabel}>Jul</ThemedText>
        <ThemedText style={styles.xLabel}>Oct</ThemedText>
        <ThemedText style={styles.xLabel}>Dec</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0F0F0F',
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
    color: '#E0E0E0',
  },
  scrollHint: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#FF4B00', // TE Orange for subtle accent
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 2,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
  },
  scrollWrapper: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 2,
  },
  column: {
    flexDirection: 'column',
    gap: 2,
  },
  cell: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
  }
});
