import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { GrainBackground } from '@/components/grain-background';
import { useStoriesStore } from '@/hooks/use-stories';
import { useJournalStore } from '@/hooks/use-journal';
import { CarouselItem } from '@/components/carousel-item';
import type { Composition } from '@/types/journal';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  
  const { loadStory, activeStory, activeStoryMemories, removeStory, clearActiveStory } = useStoriesStore();
  const updatePositions = useJournalStore(s => s.updatePositions);

  useEffect(() => {
    if (id) {
      loadStory(Number(id));
    }
    return () => clearActiveStory();
  }, [id]);

  const handleDelete = () => {
    if (activeStory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeStory(activeStory.id);
      router.back();
    }
  };

  // Dimensions (same as home feed)
  const snapInterval = height * 0.70;
  const cardHeight = height * 0.65;
  const symmetricPadding = (height - snapInterval) / 2;
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderItem = useCallback(({ item, index }: { item: Composition; index: number }) => (
    <CarouselItem
      item={item}
      itemOffset={index * snapInterval}
      snapInterval={snapInterval}
      cardHeight={cardHeight}
      scrollY={scrollY}
      updatePositions={updatePositions}
    />
  ), [snapInterval, cardHeight, scrollY, updatePositions]);

  if (!activeStory) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <GrainBackground />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <Animated.FlatList
        data={[...activeStoryMemories].reverse()}
        inverted={true}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToOffsets={activeStoryMemories.map((_, i) => i * snapInterval)}
        decelerationRate="fast"
        disableIntervalMomentum
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: symmetricPadding,
          paddingBottom: symmetricPadding,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />

      {/* Header Overlay */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn, 
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <ArrowLeft size={16} color={theme.text} />
        </Pressable>

        <View style={[styles.titleBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={[styles.titleText, { color: theme.text }]}>
            {activeStory.title}
          </ThemedText>
        </View>

        <Pressable 
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.iconBtn, 
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Trash2 size={16} color="#FF3B30" />
        </Pressable>
      </View>

      {/* Empty State */}
      {activeStoryMemories.length === 0 && (
        <View style={[StyleSheet.absoluteFill, styles.emptyContainer, { pointerEvents: 'box-none' }]}>
          <Pressable 
            style={({ pressed }) => [
              styles.ctaButton, 
              { borderColor: theme.border, backgroundColor: pressed ? theme.background : 'transparent' }
            ]}
            onPress={() => router.push({ pathname: '/compose', params: { storyId: id } })}
          >
            <ThemedText style={[styles.ctaText, { color: theme.text }]}>
              + ADD TO STORY
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  titleText: {
    fontFamily: 'BitcountGridDouble-Regular',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  ctaText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 1,
  }
});
