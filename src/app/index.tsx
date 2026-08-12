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
  // Reanimated style to make the cards bounce/scale down as they move away from center
  const animatedStyle = useAnimatedStyle(() => {
    // Removed scale interpolation based on user feedback to maintain consistent card height
    return {
      transform: [],
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
  
  // Calculate exact visual bounds to perfectly center the card between the UI elements
  const TOP_BAR_HEIGHT = insets.top; // Removed top bar, just use safe area inset
  const BOTTOM_BAR_HEIGHT = insets.bottom + 90; // Add button + Date text
  
  const visualAvailableHeight = height - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;
  
  // Golden ratio aspect ratio, capped to fit the visual area
  const cardHeight = Math.min(width * 1.618, visualAvailableHeight * 0.95);
  const snapInterval = cardHeight + CARD_GAP;
  
  // Padding to perfectly center the active card in the true visual viewport
  const visualPadding = (visualAvailableHeight - snapInterval) / 2;

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
          // Center the first and last cards perfectly between the top and bottom bars
          contentContainerStyle={{
            paddingTop: TOP_BAR_HEIGHT + visualPadding,
            paddingBottom: BOTTOM_BAR_HEIGHT + visualPadding,
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
