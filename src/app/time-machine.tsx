import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';

import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { FLOWER_ART } from '@/constants/ascii-art';
import {
  TimeMachineTape,
  TAPE_HEIGHT,
  TAPE_DATE_LINE,
  formatTapeDate,
} from '@/components/time-machine-tape';
import { CarouselItem } from '@/components/carousel-item';
import { useDayLog } from '@/hooks/use-day-log';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { clampToToday, startOfDay, toDayKey } from '@/utils/format-date';
import type { Composition } from '@/types/journal';

const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);
const CARD_GAP = 21;
const CLOSE_SIZE = 34;
const ADJACENT_SCALE = 0.95;

function parseDayParam(day?: string): Date {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return startOfDay(new Date());
  }
  const [year, month, date] = day.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, date));
}

export default function TimeMachineScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion() ?? false;
  const { day } = useLocalSearchParams<{ day?: string }>();
  const bootDate = useRef(
    clampToToday(parseDayParam(Array.isArray(day) ? day[0] : day)),
  ).current;
  const { days, selected, select, entries, litDates, loading } = useDayLog(bootDate);
  const updatePositions = useJournalStore((state) => state.updatePositions);
  const setActiveCompositionId = useJournalStore((state) => state.setActiveCompositionId);
  const listRef = useRef<Animated.FlatList<Composition>>(null);
  const selectedKey = toDayKey(selected);
  const isToday = selectedKey === toDayKey(new Date());
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: Composition }> }) => {
      const id = viewableItems[0]?.item?.id;
      if (typeof id === 'number') setActiveCompositionId(id);
    },
  ).current;

  const cardHeight = Math.min(width * 1.618, height * 0.78);
  const snapInterval = cardHeight + CARD_GAP;
  const symmetricPadding = (height - snapInterval) / 2;
  const cardTop = (height - cardHeight) / 2;
  const cardBottom = cardTop + cardHeight;
  const visualGap = CARD_GAP + cardHeight * (1 - ADJACENT_SCALE) * 0.5;
  const tapeTop = cardTop - visualGap / 2 - TAPE_HEIGHT / 2;
  const dateTop = cardBottom + visualGap / 2 - TAPE_DATE_LINE / 2;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const onSelectDay = useCallback((date: Date) => {
    select(date);
  }, [select]);

  const contentOpacity = useSharedValue(1);
  const [displayData, setDisplayData] = useState({ entries, key: selectedKey, isToday });

  useEffect(() => {
    if (selectedKey !== displayData.key) {
      if (loading) {
        contentOpacity.value = withTiming(0, { duration: reduceMotion ? 0 : 150 });
      } else {
        const swap = () => {
          setDisplayData({ entries, key: selectedKey, isToday });
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          scrollY.value = 0;
          setActiveCompositionId(entries[0]?.id ?? null);
          contentOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 250, easing: EASE_OUT });
        };
        if (contentOpacity.value > 0) {
          contentOpacity.value = withTiming(0, { duration: reduceMotion ? 0 : 150 }, (finished) => {
            if (finished) runOnJS(swap)();
          });
        } else {
          swap();
        }
      }
    } else {
      setDisplayData({ entries, key: selectedKey, isToday });
      if (!loading) {
        contentOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 250, easing: EASE_OUT });
      }
    }
  }, [entries, selectedKey, isToday, loading, reduceMotion]);

  // Initial setup for the first render
  useEffect(() => {
    if (entries.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollY.value = 0;
      setActiveCompositionId(entries[0]?.id ?? null);
    }
  }, []);

  return (
    <View style={[s.screen, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <Animated.View style={[{ flex: 1 }, { opacity: contentOpacity }]}>
        {displayData.entries.length === 0 ? (
          <View style={s.empty}>
            <View style={{ marginBottom: 16 }}>
              <AsciiArt art={FLOWER_ART} color={theme.textMuted} fontSize={10} />
            </View>
            <ThemedText style={[s.emptyTitle, { color: theme.textMuted }]}>NO MEMORIES</ThemedText>
            <ThemedText style={[s.emptyCopy, { color: theme.textMuted }]}>
              {displayData.isToday ? 'nothing filed today' : 'this day is blank'}
            </ThemedText>
            {displayData.isToday ? (
              <Pressable
                onPress={() => router.push('/compose')}
                accessibilityRole="button"
                accessibilityLabel="Write today"
                style={({ pressed }) => [
                  s.write,
                  { borderColor: theme.border },
                  pressed && s.pressed,
                ]}
              >
                <ThemedText style={[s.writeLabel, { color: theme.text }]}>WRITE</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Animated.FlatList
            ref={listRef}
            data={displayData.entries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <CarouselItem
                item={item}
                itemOffset={index * snapInterval}
                snapInterval={snapInterval}
                cardHeight={cardHeight}
                scrollY={scrollY}
                updatePositions={updatePositions}
              />
            )}
            showsVerticalScrollIndicator={false}
            snapToOffsets={displayData.entries.map((_, index) => index * snapInterval)}
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            contentContainerStyle={{
              paddingTop: symmetricPadding,
              paddingBottom: symmetricPadding,
            }}
          />
        )}
      </Animated.View>

      <View pointerEvents="box-none" style={[s.tapeHud, { top: tapeTop }]}>
        <TimeMachineTape
          days={days}
          selected={selected}
          litDates={litDates}
          onSelect={onSelectDay}
        />
      </View>

      <ThemedText
        pointerEvents="none"
        style={[s.dateLine, { top: dateTop, color: theme.textSecondary }]}
      >
        {formatTapeDate(selected)}
      </ThemedText>

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          s.close,
          {
            top: Math.max(insets.top, 20),
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: pressed ? 0.8 : 1,
          },
          pressed && s.pressed,
        ]}
      >
        <ArrowLeft size={16} color={theme.text} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tapeHud: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    height: TAPE_HEIGHT,
    justifyContent: 'center',
  },
  dateLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    height: TAPE_DATE_LINE,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: TAPE_DATE_LINE,
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    left: 24,
    zIndex: 100,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 3,
  },
  emptyCopy: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  write: {
    minWidth: 120,
    minHeight: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
  },
  writeLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 3,
  },
});
