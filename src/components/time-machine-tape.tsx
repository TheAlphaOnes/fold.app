import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useHaptics } from '@/hooks/use-haptics';
import { startOfDay, toDayKey } from '@/utils/format-date';

export const TAPE_CELL = 48;
export const TAPE_HEIGHT = 44;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface TimeMachineTapeProps {
  days: Date[];
  selected: Date;
  litDates: Set<string>;
  onSelect: (date: Date) => void;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function indexFromOffset(offset: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(offset / TAPE_CELL)));
}

function formatDateLine(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}  ·  ${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

const TapeCell = memo(function TapeCell({
  date,
  active,
  lit,
  ink,
  accent,
  onPress,
}: {
  date: Date;
  active: boolean;
  lit: boolean;
  ink: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.cell, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${date.getDate()} ${date.getMonth() + 1}`}
      accessibilityState={{ selected: active }}
    >
      <ThemedText style={[s.num, { color: ink }]}>
        {String(date.getDate()).padStart(2, '0')}
      </ThemedText>
      <View
        style={[
          s.tick,
          { backgroundColor: active || lit ? accent : 'transparent' },
        ]}
      />
    </Pressable>
  );
});

export const TimeMachineTape = memo(function TimeMachineTape({
  days,
  selected,
  litDates,
  onSelect,
}: TimeMachineTapeProps) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Date>>(null);
  const skipAlign = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const tapeDays = useMemo(() => {
    const cap = startOfDay(new Date()).getTime();
    return days.filter((day) => startOfDay(day).getTime() <= cap);
  }, [days]);
  const selectedIndex = useMemo(
    () => Math.max(0, tapeDays.findIndex((day) => sameDay(day, selected))),
    [tapeDays, selected],
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const sidePad = Math.max(0, (width - TAPE_CELL) / 2);
  const snapOffsets = useMemo(
    () => tapeDays.map((_, index) => index * TAPE_CELL),
    [tapeDays],
  );
  const active = tapeDays[activeIndex] ?? selected;

  useEffect(() => {
    if (skipAlign.current) {
      skipAlign.current = false;
      setActiveIndex(selectedIndex);
      return;
    }
    setActiveIndex(selectedIndex);
    listRef.current?.scrollToOffset({
      offset: selectedIndex * TAPE_CELL,
      animated: false,
    });
  }, [selectedIndex]);

  const settle = useCallback(
    (offset: number) => {
      const nextIndex = indexFromOffset(offset, tapeDays.length);
      const next = tapeDays[nextIndex];
      if (!next) return;
      setActiveIndex((current) => {
        if (current !== nextIndex) haptics.selection();
        return nextIndex;
      });
      if (!sameDay(next, selectedRef.current)) {
        skipAlign.current = true;
        onSelect(next);
      }
    },
    [tapeDays, haptics, onSelect],
  );

  const pressIndex = useCallback(
    (index: number) => {
      const next = tapeDays[index];
      if (!next) return;
      skipAlign.current = true;
      setActiveIndex(index);
      listRef.current?.scrollToOffset({
        offset: index * TAPE_CELL,
        animated: true,
      });
      if (!sameDay(next, selected)) {
        haptics.selection();
        onSelect(next);
      }
    },
    [tapeDays, haptics, onSelect, selected],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Date; index: number }) => {
      const isActive = index === activeIndex;
      return (
        <TapeCell
          date={item}
          active={isActive}
          lit={litDates.has(toDayKey(item))}
          ink={isActive ? theme.accentWarm : theme.textMuted}
          accent={theme.accentWarm}
          onPress={() => pressIndex(index)}
        />
      );
    },
    [activeIndex, litDates, pressIndex, theme.accentWarm, theme.textMuted],
  );

  return (
    <View>
      <ThemedText style={[s.dateLine, { color: theme.textMuted }]}>
        {formatDateLine(active)}
      </ThemedText>
      <View style={s.wrap}>
        <FlatList
          ref={listRef}
          data={tapeDays}
          extraData={activeIndex}
          keyExtractor={toDayKey}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum
          bounces={false}
          overScrollMode="never"
          initialNumToRender={11}
          maxToRenderPerBatch={8}
          windowSize={5}
          getItemLayout={(_, index) => ({
            length: TAPE_CELL,
            offset: TAPE_CELL * index,
            index,
          })}
          contentContainerStyle={{ paddingHorizontal: sidePad }}
          onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.x)}
          onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.x)}
          renderItem={renderItem}
        />
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  dateLine: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  wrap: {
    height: TAPE_HEIGHT,
    justifyContent: 'center',
  },
  cell: {
    width: TAPE_CELL,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  num: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 18,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  tick: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
