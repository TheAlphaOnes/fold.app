import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Play } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { GrainBackground } from '@/components/grain-background';
import { useStoriesStore } from '@/hooks/use-stories';
import { VinylRecord } from '@/components/vinyl-record';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';

interface StoryItem {
  id: string;
  memoryId: number;
  type: 'image' | 'video' | 'audio' | 'text';
  uri?: string;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  metadata?: any;
}

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  
  const { loadStory, activeStory, activeStoryMemories, removeStory, clearActiveStory } = useStoriesStore();

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

  // Flatten media and text into a loop of items
  const storyItems = useMemo<StoryItem[]>(() => {
    const items: StoryItem[] = [];
    activeStoryMemories.forEach(mem => {
      // Add text if available
      if (mem.textContent && mem.textContent.trim()) {
        items.push({
          id: `text-${mem.id}`,
          memoryId: mem.id,
          type: 'text',
          content: mem.textContent.trim(),
          fontFamily: mem.fontFamily,
          fontSize: mem.fontSize,
        });
      }
      // Add all media
      mem.mediaElements.forEach(media => {
        items.push({
          id: `media-${mem.id}-${media.id}`,
          memoryId: mem.id,
          type: media.type,
          uri: media.uri,
          metadata: media.metadata,
        });
      });
    });
    
    // Sort slightly randomly or keep chronological? Chronological is better for memory, but reversed so newest is first.
    return items.reverse();
  }, [activeStoryMemories]);

  // Cylinder math constants
  const ITEM_WIDTH = width * 0.70;
  const ITEM_HEIGHT = height * 0.55;
  const RADIUS = width * 0.45;
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const renderItem = ({ item, index }: { item: StoryItem; index: number }) => {
    return <CarouselNode item={item} index={index} />;
  };

  const CarouselNode = ({ item, index }: { item: StoryItem; index: number }) => {
    const videoThumb = useVideoThumbnail(item.type === 'video' ? item.uri : undefined);
    
    const animatedStyle = useAnimatedStyle(() => {
      // 1. Calculate the item's distance from the center of the screen
      // FlatList paddingLeft is (width/2 - ITEM_WIDTH/2), which places index 0 exactly in the center when scrollX is 0.
      // Therefore, the distance from center is simply:
      const distance = index * ITEM_WIDTH - scrollX.value;
      
      // 3. Map distance to an angle on the horizontal cylinder
      const angle = distance / RADIUS;
      
      // We clamp the angle so it doesn't wrap around the back of the cylinder
      const clampedAngle = interpolate(
        angle,
        [-Math.PI / 2, Math.PI / 2],
        [-Math.PI / 2, Math.PI / 2],
        Extrapolation.CLAMP
      );

      // 4. Calculate 3D transforms
      const translateZ = Math.cos(clampedAngle) * RADIUS - RADIUS;
      // positive angle (item is on the right) should have positive rotateY so its right edge tilts backward (into screen)
      const rotateY = `${clampedAngle}rad`;

      // 5. Calculate X foreshortening
      const targetXOffset = Math.sin(clampedAngle) * RADIUS;
      const translateX = targetXOffset - distance;

      const perspective = 850;
      const scale = perspective / (perspective - translateZ);
      
      const opacity = interpolate(
        Math.abs(angle),
        [0, Math.PI / 3, Math.PI / 2.2], // Fade out just before the edge
        [1, 0.5, 0],
        Extrapolation.CLAMP
      );

      return {
        transform: [
          { translateX },
          { scale },
          { rotateY }
        ],
        opacity,
        zIndex: Math.round(translateZ)
      };
    });

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/memory/${item.memoryId}`);
    };

    return (
      <Animated.View style={[styles.itemContainer, { height: ITEM_HEIGHT, width: ITEM_WIDTH, alignSelf: 'center' }, animatedStyle]}>
        <Pressable onPress={handlePress} style={styles.itemPressable}>
          
          {item.type === 'text' && (
            <View style={[styles.textCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Text 
                style={[styles.textContent, { color: theme.text, fontFamily: item.fontFamily || 'JetBrainsMono-Regular', fontSize: item.fontSize || 24 }]} 
                numberOfLines={8}
                ellipsizeMode="tail"
              >
                {item.content}
              </Text>
            </View>
          )}

          {item.type === 'image' && (
            <View style={[styles.mediaCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          )}

          {item.type === 'video' && (
            <View style={[styles.mediaCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Image source={{ uri: videoThumb || item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.videoOverlay}>
                <Play size={32} color="#FFF" fill="#FFF" />
              </View>
            </View>
          )}

          {item.type === 'audio' && (
            <View style={[styles.audioCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <VinylRecord size={160} isPlaying={false} imageUrl={item.metadata?.artwork} />
              {item.metadata?.title && (
                <Text style={[styles.audioTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.metadata.title}
                </Text>
              )}
            </View>
          )}

        </Pressable>
      </Animated.View>
    );
  };

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
        data={storyItems}
        horizontal={true}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{
          // Give padding so the first/last items can reach the center
          paddingLeft: width / 2 - ITEM_WIDTH / 2,
          paddingRight: width / 2 - ITEM_WIDTH / 2,
          alignItems: 'center',
        }}
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
      {storyItems.length === 0 && (
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
    fontFamily: 'BitcountGridDouble-Light',
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
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  mediaCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    textAlign: 'center',
    lineHeight: 32,
  },
  audioCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  audioTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
