import React from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions } from 'react-native';
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
import { useCallback, useRef, useEffect } from 'react';

const CARD_GAP = 21; // Fibonacci sequence

interface CarouselItemProps {
  item: Composition;
  index: number;
  snapInterval: number;
  cardHeight: number;
  scrollY: Animated.SharedValue<number>;
}

function CarouselItem({ item, index, snapInterval, cardHeight, scrollY }: CarouselItemProps) {
  // Reanimated style to make the cards bounce/scale down as they move away from center
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [
        (index - 1) * snapInterval,
        index * snapInterval,
        (index + 1) * snapInterval,
      ],
      [0.938, 1, 0.938], // Much softer scale so they peek out
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
  useEffect(() => {
    if (compositions.length > prevCount.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 300); // Wait for render
    }
    prevCount.current = compositions.length;
  }, [compositions.length]);
  
  // Calculate available height excluding notch and home indicator
  const availableHeight = height - insets.top - insets.bottom;
  
  // Golden ratio aspect ratio: 1:1.618 based on width, capped to fit safe area
  const cardHeight = Math.min(width * 1.618, availableHeight * 0.9);
  const snapInterval = cardHeight + CARD_GAP;
  
  // Padding to perfectly center the active card in the safe viewport
  const verticalPadding = (availableHeight - snapInterval) / 2;

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
          // Center the first and last cards perfectly in the safe area
          contentContainerStyle={{
            paddingTop: verticalPadding + insets.top,
            paddingBottom: verticalPadding + insets.bottom,
          }}
        />
      )}

      {/* Floating add button pinned to the bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
});
