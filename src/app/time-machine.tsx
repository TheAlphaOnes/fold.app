import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { TimeMachineTape } from '@/components/time-machine-tape';
import { CarouselItem } from '@/components/carousel-item';
import { useDayLog } from '@/hooks/use-day-log';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { clampToToday, startOfDay, toDayKey } from '@/utils/format-date';
import type { Composition } from '@/types/journal';

const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);
const CARD_GAP = 21;

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

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const onSelectDay = useCallback((date: Date) => {
    select(date);
  }, [select]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    scrollY.value = 0;
    setActiveCompositionId(entries[0]?.id ?? null);
  }, [entries, scrollY, setActiveCompositionId]);

  return (
    <View style={[s.screen, { backgroundColor: theme.background }]}>
      <GrainBackground />

      {loading ? (
        <View style={s.empty} />
      ) : entries.length === 0 ? (
        <Animated.View
          key={`empty-${selectedKey}`}
          entering={reduceMotion ? undefined : FadeIn.duration(200).easing(EASE_OUT)}
          exiting={reduceMotion ? undefined : FadeOut.duration(140).easing(Easing.in(Easing.cubic))}
          style={s.empty}
        >
          <ThemedText style={[s.emptyTitle, { color: theme.textMuted }]}>NO MEMORIES</ThemedText>
          <ThemedText style={[s.emptyCopy, { color: theme.textMuted }]}>
            {isToday ? 'nothing filed today' : 'this day is blank'}
          </ThemedText>
          {isToday ? (
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
        </Animated.View>
      ) : (
        <Animated.FlatList
          key={selectedKey}
          ref={listRef}
          data={entries}
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
          snapToOffsets={entries.map((_, index) => index * snapInterval)}
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

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close time machine"
        style={({ pressed }) => [
          s.close,
          {
            top: Math.max(insets.top, 20),
            backgroundColor: pressed ? '#E0E0E0' : theme.backgroundElement,
            borderColor: theme.border,
          },
          pressed && s.pressed,
        ]}
      >
        <X size={16} color={theme.text} strokeWidth={2.5} />
      </Pressable>

      <View
        pointerEvents="box-none"
        style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <TimeMachineTape
          days={days}
          selected={selected}
          litDates={litDates}
          onSelect={onSelectDay}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    right: 0,
    zIndex: 100,
    width: 56,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingTop: 12,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.7,
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
