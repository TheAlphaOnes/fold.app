import React from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions, Text } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoryCard } from '@/components/memory-card';
import { GrainBackground } from '@/components/grain-background';
import { AddButton } from '@/components/add-button';
import { useJournal } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/empty-state';
import { useCallback, useRef, useEffect, useState } from 'react';

const CARD_GAP = 21; // Fibonacci sequence

interface CarouselItemProps {
  item: Composition;
  index: number;
  snapInterval: number;
  cardHeight: number;
  scrollY: Animated.SharedValue<number>;
}

function CarouselItem({ item, index, snapInterval, cardHeight, scrollY }: CarouselItemProps) {
  // Maya motion: scale creates depth without affecting layout dimensions.
  // Active card = 1.0, neighbors = 0.95, distant = 0.92
  // Opacity fades distant cards gently so the active card dominates focus.
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 2) * snapInterval,
      (index - 1) * snapInterval,
      index * snapInterval,
      (index + 1) * snapInterval,
      (index + 2) * snapInterval,
    ];

    // Gentle scale: active card is full size, neighbors slightly smaller
    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.92, 0.95, 1, 0.95, 0.92],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={{ height: snapInterval, justifyContent: 'center', paddingHorizontal: 21 }}>
      <Animated.View style={animatedStyle}>
        <MemoryCard content={item.textContent} height={cardHeight} timestamp={item.createdAt} />
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { compositions, loading, refresh } = useJournal();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAdd = () => {
    router.push('/compose');
  };

  const listRef = useRef<Animated.FlatList<Composition>>(null);
  const prevCount = useRef(compositions.length);

  // Auto-scroll to the bottom when a new item is added
  const [dateStr, setDateStr] = useState('');
  
  useEffect(() => {
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[now.getDay()];
    
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    
    setDateStr(`${day} ${d}.${m}.${y}`);
  }, []);

  useEffect(() => {
    if (compositions.length > prevCount.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 300); // Wait for render
    }
    prevCount.current = compositions.length;
  }, [compositions.length]);
  
  // The user wants the active card perfectly physically centered in the absolute screen
  // so that the previous card and next card peek by the exact same number of pixels.
  // We calculate card height strictly based on golden ratio, capped safely.
  const cardHeight = Math.min(width * 1.618, height * 0.78);
  const snapInterval = cardHeight + CARD_GAP;
  
  // Pure symmetric padding based on the physical screen height
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
    />
  );

  return (
    // Clean background
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      {compositions.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={compositions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          // Perfect mathematical snapping
          snapToOffsets={compositions.map((_, i) => i * snapInterval)}
        decelerationRate="fast"
        disableIntervalMomentum
        // iOS specific fixes
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        // Smooth scroll animations tracking
        onScroll={scrollHandler}
        scrollEventThrottle={16}
          // Center cards perfectly in the absolute physical screen.
          // We add extra padding at the bottom so the user can overscroll past the floating bottom bar if needed.
          contentContainerStyle={{
            paddingTop: symmetricPadding,
            paddingBottom: symmetricPadding + insets.bottom + 90,
          }}
        />
      )}

      {/* Floating bottom bar with Date and Add Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <AddButton onPress={handleAdd} />
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
    marginBottom: 16, // Space between date and Add Button
  },
  dateText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    color: '#878787', // Technical gray
    letterSpacing: 1,
  },
});
