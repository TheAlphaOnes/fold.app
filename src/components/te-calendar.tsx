import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { getDatesWithMemories } from '@/db/journal-repository';
import { ThemedText } from './themed-text';

interface TECalendarProps {
  onSelect: (date: Date) => void;
}

type ViewMode = 'days' | 'months' | 'years';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_LABELS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function TECalendar({ onSelect }: TECalendarProps) {
  const theme = useTheme();

  const [currentDate, setCurrentDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [yearPageStart, setYearPageStart] = useState(
    Math.floor(currentDate.getFullYear() / 12) * 12
  );

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
    } else {
      setYearPageStart(prev => prev + delta * 12);
    }
  };

  // --- Compute grid data ---
  const { totalCells, firstDay, daysInMonth } = useMemo(() => {
    const dim = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const fd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const rows = Math.ceil((fd + dim) / 7);
    return { totalCells: rows * 7, firstDay: fd, daysInMonth: dim };
  }, [currentDate]);

  const today = useMemo(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
  }, []);

  const isToday = (dayNum: number): boolean =>
    dayNum === today.day &&
    currentDate.getMonth() === today.month &&
    currentDate.getFullYear() === today.year;

  const hasMemory = (dayNum: number): boolean => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return activeDates.has(`${y}-${m}-${d}`);
  };

  // --------------- DAYS VIEW ---------------
  const renderDaysView = () => {
    const cols = 7;
    const rows = totalCells / cols;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDay + 1;
      const valid = dayNum > 0 && dayNum <= daysInMonth;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isLastCol = col === cols - 1;
      const isLastRow = row === rows - 1;

      if (!valid) {
        cells.push(
          <View
            key={`e-${i}`}
            style={[
              styles.dayCell,
              !isLastCol && { borderRightWidth: 1, borderRightColor: theme.border },
              !isLastRow && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          />
        );
        continue;
      }

      const isTodayCell = isToday(dayNum);
      const hasMemoryCell = hasMemory(dayNum);

      cells.push(
        <Pressable
          key={`d-${dayNum}`}
          onPress={() => onSelect(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum))}
          style={({ pressed }) => [
            styles.dayCell,
            !isLastCol && { borderRightWidth: 1, borderRightColor: theme.border },
            !isLastRow && { borderBottomWidth: 1, borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.text },
          ]}
        >
          {({ pressed }) => (
            <>
              {/* Today: thin ring behind the number */}
              {isTodayCell && (
                <View
                  style={[
                    styles.todayRing,
                    { borderColor: pressed ? theme.background : theme.text },
                  ]}
                />
              )}
              <ThemedText
                style={[
                  styles.dayText,
                  {
                    color: pressed
                      ? theme.background
                      : isTodayCell
                        ? theme.text
                        : theme.textMuted,
                  },
                ]}
              >
                {dayNum < 10 ? `0${dayNum}` : dayNum}
              </ThemedText>
              {/* Memory dot: sits at bottom of cell, well below text */}
              {hasMemoryCell && (
                <View
                  style={[
                    styles.memoryDot,
                    { backgroundColor: pressed ? theme.background : '#E45B00' },
                  ]}
                />
              )}
            </>
          )}
        </Pressable>
      );
    }

    return (
      <>
        <View style={[styles.dowRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          {DOW_LABELS.map((d, i) => (
            <View key={d} style={[styles.dowCell, i < 6 && { borderRightWidth: 1, borderRightColor: theme.border }]}>
              <ThemedText style={[styles.dowText, { color: theme.textMuted }]}>{d}</ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.grid}>{cells}</View>
      </>
    );
  };

  // --------------- MONTHS VIEW ---------------
  const renderMonthsView = () => {
    const cols = 3;
    const rows = 4;
    const cells = [];

    for (let i = 0; i < 12; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isSelected = i === currentDate.getMonth();

      cells.push(
        <Pressable
          key={`m-${i}`}
          onPress={() => {
            setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
            setViewMode('days');
          }}
          style={({ pressed }) => [
            styles.pickerCell,
            col < cols - 1 && { borderRightWidth: 1, borderRightColor: theme.border },
            row < rows - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            (pressed || isSelected) && { backgroundColor: theme.text },
          ]}
        >
          {({ pressed }) => (
            <ThemedText
              style={[
                styles.pickerText,
                { color: pressed || isSelected ? theme.background : theme.textMuted },
              ]}
            >
              {MONTH_NAMES[i]}
            </ThemedText>
          )}
        </Pressable>
      );
    }

    return <View style={styles.grid}>{cells}</View>;
  };

  // --------------- YEARS VIEW ---------------
  const renderYearsView = () => {
    const cols = 3;
    const rows = 4;
    const cells = [];

    for (let i = 0; i < 12; i++) {
      const year = yearPageStart + i;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isSelected = year === currentDate.getFullYear();

      cells.push(
        <Pressable
          key={`y-${year}`}
          onPress={() => {
            setCurrentDate(new Date(year, currentDate.getMonth(), 1));
            setViewMode('months');
          }}
          style={({ pressed }) => [
            styles.pickerCell,
            col < cols - 1 && { borderRightWidth: 1, borderRightColor: theme.border },
            row < rows - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            (pressed || isSelected) && { backgroundColor: theme.text },
          ]}
        >
          {({ pressed }) => (
            <ThemedText
              style={[
                styles.pickerText,
                { color: pressed || isSelected ? theme.background : theme.textMuted },
              ]}
            >
              {year}
            </ThemedText>
          )}
        </Pressable>
      );
    }

    return <View style={styles.grid}>{cells}</View>;
  };

  // --------------- HEADER ---------------
  const renderHeaderLabel = () => {
    if (viewMode === 'years') {
      return (
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          {yearPageStart} — {yearPageStart + 11}
        </ThemedText>
      );
    }

    return (
      <View style={styles.headerCenter}>
        <Pressable
          onPress={() => setViewMode('months')}
          hitSlop={8}
        >
          <ThemedText
            style={[
              styles.headerTitle,
              { color: viewMode === 'months' ? theme.textMuted : theme.text },
            ]}
          >
            {MONTH_NAMES[currentDate.getMonth()]}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            setYearPageStart(Math.floor(currentDate.getFullYear() / 12) * 12);
            setViewMode('years');
          }}
          hitSlop={8}
        >
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {currentDate.getFullYear()}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Navigation header */}
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => changePage(-1)}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.4 }]}
        >
          <ChevronLeft size={16} color={theme.text} />
        </Pressable>

        {renderHeaderLabel()}

        <Pressable
          onPress={() => changePage(1)}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.4 }]}
        >
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
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    letterSpacing: 2,
  },
  navBtn: {
    padding: 4,
  },

  // --- DOW row ---
  dowRow: {
    flexDirection: 'row',
  },
  dowCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dowText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    letterSpacing: 1,
  },

  // --- Grid ---
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // --- Day cells ---
  dayCell: {
    width: '14.2857%', // 1/7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    zIndex: 1, // above the todayCircle
  },

  // Today: a thin ring positioned behind the number, centered
  todayRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },

  // Memory dot: absolute at cell bottom
  memoryDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // --- Month / Year picker cells ---
  pickerCell: {
    width: '33.333%',
    aspectRatio: 1.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
});
