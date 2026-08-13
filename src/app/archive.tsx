import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  runOnJS,
  type SharedValue
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { MemoryCard } from '@/components/memory-card';
import { GrainBackground } from '@/components/grain-background';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';
import { EmptyState } from '@/components/empty-state';
import { useCallback, useRef, useEffect, useState } from 'react';

const CARD_GAP = 21;

interface CarouselItemProps {
  item: Composition;
  index: number;
  snapInterval: number;
  cardHeight: number;
  scrollY: SharedValue<number>;
  updatePositions: (id: number, media: any) => void;
}

function CarouselItem({ item, index, snapInterval, cardHeight, scrollY, updatePositions }: CarouselItemProps) {
  const pressedScale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 2) * snapInterval,
      (index - 1) * snapInterval,
      index * snapInterval,
      (index + 1) * snapInterval,
      (index + 2) * snapInterval,
    ];

    const scrollScale = interpolate(
      scrollY.value,
      inputRange,
      [0.92, 0.95, 1, 0.95, 0.92],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scrollScale * pressedScale.value }],
    };
  });

  const navigateToDetail = () => {
    router.push(`/memory/${item.id}`);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      runOnJS(navigateToDetail)();
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  return (
    <View style={{ height: snapInterval, justifyContent: 'center', paddingHorizontal: 21 }}>
      <GestureDetector gesture={doubleTap}>
        <Animated.View style={animatedStyle}>
          <MemoryCard item={item} height={cardHeight} onUpdatePositions={updatePositions} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ArchiveScreen() {
  const { ts } = useLocalSearchParams<{ ts: string }>();
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const targetDate = useMemo(() => {
    const parsedTs = parseInt(ts, 10);
    return isNaN(parsedTs) ? new Date() : new Date(parsedTs);
  }, [ts]);

  const { compositions, loading, setTargetDate, refresh, updatePositions } = useJournalStore();
  
  // When targetDate changes (from month view picker), update the store
  useEffect(() => {
    setTargetDate(targetDate);
  }, [targetDate, setTargetDate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const listRef = useRef<Animated.FlatList<Composition>>(null);

  const [dateStr, setDateStr] = useState('');
  
  useEffect(() => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[targetDate.getDay()];
    
    const d = String(targetDate.getDate()).padStart(2, '0');
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const y = String(targetDate.getFullYear()).slice(-2);
    
    setDateStr(`${day} ${d}.${m}.${y}`);
  }, [targetDate]);

  const cardHeight = Math.min(width * 1.618, height * 0.78);
  const snapInterval = cardHeight + CARD_GAP;
  const symmetricPadding = (height - snapInterval) / 2;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderItem = ({ item, index }: { item: Composition; index: number }) => (
    <CarouselItem
      item={item}
      index={index}
      snapInterval={snapInterval}
      cardHeight={cardHeight}
      scrollY={scrollY}
      updatePositions={updatePositions}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <Pressable 
        style={({ pressed }) => [
          styles.backButton, 
          { 
            top: insets.top > 0 ? insets.top + 8 : 21, 
            opacity: pressed ? 0.5 : 1,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border
          }
        ]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color={theme.text} />
      </Pressable>

      {compositions.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={compositions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          snapToOffsets={compositions.map((_, i) => i * snapInterval)}
          decelerationRate="fast"
          disableIntervalMomentum
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: symmetricPadding,
            paddingBottom: symmetricPadding + insets.bottom + 90,
          }}
        />
      )}

      {/* Floating bottom bar with Date (no add button in archive) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: theme.textMuted }]}>{dateStr} [ARCHIVE]</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    color: '#878787',
    letterSpacing: 1,
  },
  backButton: {
    position: 'absolute',
    left: 21,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  }
});
