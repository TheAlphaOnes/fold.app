import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { getDatesWithMemories } from '@/db/journal-repository';
import { ThemedText } from './themed-text';

interface TECalendarProps {
  onSelect: (date: Date) => void;
}

export function TECalendar({ onSelect }: TECalendarProps) {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    getDatesWithMemories().then(dates => {
      setActiveDates(new Set(dates));
    });
  }, []);

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // empty slots for padding
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (d: number) => {
    const today = new Date();
    return (
      d === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const hasMemory = (d: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return activeDates.has(`${y}-${m}-${dayStr}`);
  };

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const handlePress = (d: number) => {
    onSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
  };

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => changeMonth(-1)} style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}>
          <ChevronLeft size={16} color={theme.text} />
        </Pressable>
        
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </ThemedText>
        
        <Pressable onPress={() => changeMonth(1)} style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}>
          <ChevronRight size={16} color={theme.text} />
        </Pressable>
      </View>

      {/* Days of week */}
      <View style={[styles.weekRow, { borderBottomColor: theme.border }]}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
          <View key={`dow-${i}`} style={styles.dowCell}>
            <ThemedText style={[styles.dowText, { color: theme.textMuted }]}>{day}</ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {days.map((d, i) => {
          // Calculate border styles to form a perfect inner grid
          const isRightEdge = (i + 1) % 7 === 0;
          const isBottomRow = i >= days.length - 7 && days.length - i <= 7;
          
          if (d === null) {
            return (
              <View 
                key={`empty-${i}`} 
                style={[
                  styles.dayCell, 
                  { 
                    borderRightColor: theme.border, 
                    borderBottomColor: theme.border,
                    borderRightWidth: isRightEdge ? 0 : 1,
                    borderBottomWidth: isBottomRow ? 0 : 1,
                  }
                ]} 
              />
            );
          }

          const current = isToday(d);
          const active = hasMemory(d);

          return (
            <Pressable
              key={`day-${d}`}
              style={({ pressed }) => [
                styles.dayCell,
                { 
                  borderRightColor: theme.border, 
                  borderBottomColor: theme.border,
                  borderRightWidth: isRightEdge ? 0 : 1,
                  borderBottomWidth: isBottomRow ? 0 : 1,
                  backgroundColor: pressed ? theme.text : 'transparent'
                }
              ]}
              onPress={() => handlePress(d)}
            >
              {({ pressed }) => (
                <>
                  <ThemedText style={[
                    styles.dayText,
                    { color: pressed ? theme.background : (current ? theme.text : theme.textMuted) }
                  ]}>
                    {d < 10 ? `0${d}` : d}
                  </ThemedText>
                  {/* Dot Indicator */}
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
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
    paddingVertical: 8,
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
  },
  dayCell: {
    width: '14.285%', // exactly 1/7th
    aspectRatio: 1, // square cells
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
  },
  dot: {
    width: 4,
    height: 4,
    position: 'absolute',
    bottom: 6,
  }
});
