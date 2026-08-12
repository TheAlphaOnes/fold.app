import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { getDatesWithMemories } from '@/db/journal-repository';
import { ThemedText } from './themed-text';

interface TECalendarProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function TECalendar({ value, onChange }: TECalendarProps) {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
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

  const isSelected = (d: number) => {
    return (
      d === value.getDate() &&
      currentMonth.getMonth() === value.getMonth() &&
      currentMonth.getFullYear() === value.getFullYear()
    );
  };

  const hasMemory = (d: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return activeDates.has(`${y}-${m}-${dayStr}`);
  };

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.navButton}>
          <ChevronLeft size={20} color={theme.text} />
        </Pressable>
        
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </ThemedText>
        
        <Pressable onPress={() => changeMonth(1)} style={styles.navButton}>
          <ChevronRight size={20} color={theme.text} />
        </Pressable>
      </View>

      {/* Days of week */}
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <View key={`dow-${i}`} style={styles.dayCell}>
            <ThemedText style={[styles.dowText, { color: theme.textMuted }]}>{day}</ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {days.map((d, i) => {
          if (d === null) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }

          const selected = isSelected(d);
          const current = isToday(d);
          const active = hasMemory(d);

          return (
            <Pressable
              key={`day-${d}`}
              style={styles.dayCell}
              onPress={() => onChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))}
            >
              <View style={[
                styles.dayCircle,
                selected && { backgroundColor: theme.text }
              ]}>
                <ThemedText style={[
                  styles.dayText,
                  { color: selected ? theme.background : (current ? theme.text : theme.textMuted) }
                ]}>
                  {d}
                </ThemedText>
              </View>
              {/* Dot Indicator */}
              <View style={[
                styles.dot,
                { backgroundColor: active ? '#FF4B00' : 'transparent' }
              ]} />
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
    borderRadius: 8,
    width: '100%',
    maxWidth: 340,
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
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dowText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  dayCell: {
    width: '14.28%', // 100 / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  }
});
