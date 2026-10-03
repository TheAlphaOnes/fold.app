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

export const TAPE_CELL = 80;
export const TAPE_HEIGHT = 28;
export const TAPE_DATE_LINE = 16;
const TICK = 4;

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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

export function formatTapeDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]} ${day}.${month}.${date.getFullYear()}`;
}

const TapeCell = memo(function TapeCell({
  date,
  active,
  lit,
  ink,
  dotColor,
  onPress,
}: {
  date: Date;
  active: boolean;
  lit: boolean;
  ink: string;
  dotColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [s.cell, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${date.getDate()} ${date.getMonth() + 1}`}
      accessibilityState={{ selected: active }}
    >
      <View style={[s.dot, { left: -1, backgroundColor: dotColor }]} />
      <View style={[s.dot, { left: 19, backgroundColor: dotColor }]} />
      <ThemedText style={[s.num, { color: ink }]}>
        {String(date.getDate()).padStart(2, '0')}
      </ThemedText>
      <View style={[s.dot, { right: 19, backgroundColor: dotColor }]} />
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
        // Let the tape scroll smoothly before loading heavy data
        setTimeout(() => onSelect(next), 250);
      }
    },
    [tapeDays, haptics, onSelect, selected],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Date; index: number }) => {
      const isActive = index === activeIndex;
      const isLit = litDates.has(toDayKey(item));
      
      let inkColor = isActive ? theme.text : theme.textMuted;
      if (isLit) {
        inkColor = isActive ? theme.accentWarm : `${theme.accentWarm}80`;
      }

      return (
        <TapeCell
          date={item}
          active={isActive}
          lit={isLit}
          ink={inkColor}
          dotColor={theme.textMuted} // Brighter than border so it's visible
          onPress={() => pressIndex(index)}
        />
      );
    },
    [activeIndex, litDates, pressIndex, theme.text, theme.textMuted, theme.accentWarm],
  );

  return (
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
  );
});

const s = StyleSheet.create({
  wrap: {
    height: TAPE_HEIGHT,
    justifyContent: 'center',
  },
  cell: {
    width: TAPE_CELL,
    height: TAPE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: TAPE_HEIGHT / 2 - 1,
    width: 2,
    height: 2,
    borderRadius: 1,
    opacity: 0.4,
  },
  num: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
