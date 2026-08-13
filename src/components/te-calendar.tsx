import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { getDatesWithMemories } from '@/db/journal-repository';
import { ThemedText } from './themed-text';

interface TECalendarProps {
  onSelect: (date: Date) => void;
}

type ViewMode = 'days' | 'months' | 'years';

export function TECalendar({ onSelect }: TECalendarProps) {
  const theme = useTheme();
  
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  
  // For years view, we show 12 years per page. We track the start year of the current page.
  const [yearPageStart, setYearPageStart] = useState(Math.floor(currentDate.getFullYear() / 12) * 12);

  useEffect(() => {
    getDatesWithMemories().then(dates => {
      setActiveDates(new Set(dates));
    });
  }, []);

  const changePage = (delta: number) => {
    if (viewMode === 'days') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    } else if (viewMode === 'months') {
      setCurrentDate(new Date(currentDate.getFullYear() + delta, currentDate.getMonth(), 1));
    } else if (viewMode === 'years') {
      setYearPageStart(prev => prev + (delta * 12));
    }
  };

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const renderDaysView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstDayOfMonth + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      
      const isRightEdge = (i + 1) % 7 === 0;
      const isBottomRow = i >= 35; // 42 - 7

      if (!isValidDay) {
        cells.push(
          <View 
            key={`empty-${i}`} 
            style={[
              styles.cell, 
              styles.dayCell, 
              { 
                borderRightColor: theme.border, 
                borderBottomColor: theme.border,
                borderRightWidth: isRightEdge ? 0 : 1,
                borderBottomWidth: isBottomRow ? 0 : 1
              }
            ]} 
          />
        );
        continue;
      }

      const isToday = () => {
        const today = new Date();
        return (
          dayNum === today.getDate() &&
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear()
        );
      };

      const hasMemory = () => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dayNum).padStart(2, '0');
        return activeDates.has(`${y}-${m}-${dayStr}`);
      };

      const current = isToday();
      const active = hasMemory();

      cells.push(
        <Pressable
          key={`day-${dayNum}`}
          style={({ pressed }) => [
            styles.cell,
            styles.dayCell,
            { 
              borderRightColor: theme.border, 
              borderBottomColor: theme.border,
              borderRightWidth: isRightEdge ? 0 : 1,
              borderBottomWidth: isBottomRow ? 0 : 1,
              backgroundColor: pressed ? theme.text : 'transparent'
            }
          ]}
          onPress={() => onSelect(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum))}
        >
          {({ pressed }) => (
            <>
              <ThemedText style={[
                styles.dayText,
                { color: pressed ? theme.background : (current ? theme.text : theme.textMuted) }
              ]}>
                {dayNum < 10 ? `0${dayNum}` : dayNum}
              </ThemedText>
              {active && (
                <View style={[
                  styles.dot,
                  { backgroundColor: pressed ? theme.background : '#E45B00' }
                ]} />
              )}
            </>
          )}
        </Pressable>
      );
    }

    return (
      <>
        {/* Days of week header */}
        <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
            <View key={`dow-${i}`} style={styles.dowCell}>
              <ThemedText style={[styles.dowText, { color: theme.textMuted }]}>{day}</ThemedText>
            </View>
          ))}
        </View>
        <View style={[styles.grid, { borderTopColor: theme.border }]}>
          {cells}
        </View>
      </>
    );
  };

  // --- MONTHS VIEW ---
  const renderMonthsView = () => {
    const cells = [];
    for (let i = 0; i < 12; i++) {
      const isSelected = i === currentDate.getMonth();
      const isRightEdge = (i + 1) % 3 === 0;
      const isBottomRow = i >= 9;
      cells.push(
        <Pressable
          key={`month-${i}`}
          style={({ pressed }) => [
            styles.cell,
            styles.monthCell,
            { 
              borderRightColor: theme.border, 
              borderBottomColor: theme.border,
              borderRightWidth: isRightEdge ? 0 : 1,
              borderBottomWidth: isBottomRow ? 0 : 1,
              backgroundColor: pressed || isSelected ? theme.text : 'transparent'
            }
          ]}
          onPress={() => {
            setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
            setViewMode('days');
          }}
        >
          {({ pressed }) => (
            <ThemedText style={[
              styles.monthText,
              { color: (pressed || isSelected) ? theme.background : theme.textMuted }
            ]}>
              {monthNames[i]}
            </ThemedText>
          )}
        </Pressable>
      );
    }
    return (
      <View style={[styles.grid, { borderTopColor: theme.border }]}>
        {cells}
      </View>
    );
  };

  // --- YEARS VIEW ---
  const renderYearsView = () => {
    const cells = [];
    for (let i = 0; i < 12; i++) {
      const year = yearPageStart + i;
      const isSelected = year === currentDate.getFullYear();
      const isRightEdge = (i + 1) % 3 === 0;
      const isBottomRow = i >= 9;
      cells.push(
        <Pressable
          key={`year-${year}`}
          style={({ pressed }) => [
            styles.cell,
            styles.yearCell,
            { 
              borderRightColor: theme.border, 
              borderBottomColor: theme.border,
              borderRightWidth: isRightEdge ? 0 : 1,
              borderBottomWidth: isBottomRow ? 0 : 1,
              backgroundColor: pressed || isSelected ? theme.text : 'transparent'
            }
          ]}
          onPress={() => {
            setCurrentDate(new Date(year, currentDate.getMonth(), 1));
            setViewMode('days');
          }}
        >
          {({ pressed }) => (
            <ThemedText style={[
              styles.yearText,
              { color: (pressed || isSelected) ? theme.background : theme.textMuted }
            ]}>
              {year}
            </ThemedText>
          )}
        </Pressable>
      );
    }
    return (
      <View style={[styles.grid, { borderTopColor: theme.border }]}>
        {cells}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => changePage(-1)} style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}>
          <ChevronLeft size={16} color={theme.text} />
        </Pressable>
        
        <View style={styles.headerCenter}>
          {viewMode === 'years' ? (
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              {yearPageStart} - {yearPageStart + 11}
            </ThemedText>
          ) : (
            <>
              <Pressable onPress={() => setViewMode('months')} style={styles.headerTitleBtn}>
                <ThemedText style={[styles.headerTitle, { color: viewMode === 'months' ? theme.textMuted : theme.text }]}>
                  {monthNames[currentDate.getMonth()]}
                </ThemedText>
              </Pressable>
              
              <Pressable onPress={() => {
                setYearPageStart(Math.floor(currentDate.getFullYear() / 12) * 12);
                setViewMode('years');
              }} style={styles.headerTitleBtn}>
                <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
                  {currentDate.getFullYear()}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
        
        <Pressable onPress={() => changePage(1)} style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}>
          <ChevronRight size={16} color={theme.text} />
        </Pressable>
      </View>

      {viewMode === 'days' && renderDaysView()}
      {viewMode === 'months' && renderMonthsView()}
      {viewMode === 'years' && renderYearsView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // No outer border here, we rely on the parent or the grid itself
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1, // Added missing bottom border to header
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitleBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  dowCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dowText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Removed borderLeftWidth to prevent double border with parent
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCell: {
    width: '14.285%', // exactly 1/7th
    aspectRatio: 1, // square cells
  },
  monthCell: {
    width: '33.333%', // 1/3rd (4 rows, 3 cols)
    aspectRatio: 1.5,
  },
  yearCell: {
    width: '33.333%',
    aspectRatio: 1.5,
  },
  dayText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
  },
  monthText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  yearText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    position: 'absolute',
    bottom: 8,
  }
});
