import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Play, ImageOff } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  useFrameCallback,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

const CarouselNode = React.memo(({ 
  item, 
  index, 
  total,
  rotation 
}: { 
  item: StoryItem; 
  index: number; 
  total: number;
  rotation: import('react-native-reanimated').SharedValue<number>;
}) => {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const router = useRouter();

  const ITEM_WIDTH = width * 0.3;
  const ITEM_HEIGHT = ITEM_WIDTH * 1.3;
  const RADIUS = width * 0.38;

  // Strict circle layout
  const baseAngle = (index / total) * Math.PI * 2;
  
  const animatedStyle = useAnimatedStyle(() => {
    const currentAngle = baseAngle + rotation.value;
    const translateX = Math.sin(currentAngle) * RADIUS;
    const translateY = -Math.cos(currentAngle) * RADIUS;

    return {
      transform: [{ translateX }, { translateY }],
      zIndex: Math.round(translateY * 100),
    };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/memory/${item.memoryId}`);
  };

  const videoThumb = useVideoThumbnail(item.type === 'video' ? item.uri : undefined);

  // Memoize the image source so expo-image doesn't re-trigger transitions on identical renders
  const imageSource = useMemo(() => {
    return item.type === 'video' && videoThumb ? { uri: videoThumb } : { uri: item.uri };
  }, [item.type, item.uri, videoThumb]);

  const [hasError, setHasError] = useState(false);

  // Reset error state if the underlying item changes
  useEffect(() => {
    setHasError(false);
  }, [item.uri]);

  return (
    <Animated.View style={[styles.itemContainer, { height: ITEM_HEIGHT, width: ITEM_WIDTH, position: 'absolute', top: height / 2 - ITEM_HEIGHT / 2, left: width / 2 - ITEM_WIDTH / 2 }, animatedStyle]}>
      <Pressable onPress={handlePress} style={styles.itemPressable}>
        <View style={[styles.mediaCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          
          {/* Native expo-image crossfade when source changes */}
          {!hasError && (
            <Image 
              source={imageSource} 
              style={StyleSheet.absoluteFill} 
              contentFit="cover" 
              transition={800}
              onError={() => setHasError(true)} 
            />
          )}

          {hasError && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
              <ImageOff size={32} color={theme.text} opacity={0.3} />
            </View>
          )}

          {item.type === 'video' && !hasError && (
            <View style={styles.videoOverlay}>
              <Play size={20} color="#FFF" fill="#FFF" />
            </View>
          )}

        </View>
      </Pressable>
    </Animated.View>
  );
}, (prev, next) => {
  return prev.item.id === next.item.id && prev.index === next.index && prev.total === next.total && prev.rotation === next.rotation;
});

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

  // Flatten media into a loop of items (only images and videos)
  const storyItems = useMemo<StoryItem[]>(() => {
    const items: StoryItem[] = [];
    activeStoryMemories.forEach(mem => {
      // Only extract images and videos
      mem.mediaElements.forEach((media, index) => {
        if (media.type === 'audio') return; // Skip audio
        
        items.push({
          id: `media-${mem.id}-${index}`,
          memoryId: mem.id,
          type: media.type,
          uri: media.uri,
          metadata: media.metadata,
        });
      });
    });
    
    // Reverse so newest is first.
    return items.reverse();
  }, [activeStoryMemories]);

  const MAX_SLOTS = 12;
  const [activeSlots, setActiveSlots] = useState<StoryItem[]>([]);
  const queueRef = useRef<StoryItem[]>([]);

  // 2D Ring math constants
  const ITEM_WIDTH = width * 0.3;
  const ITEM_HEIGHT = ITEM_WIDTH * 1.3;
  const RADIUS = width * 0.38;
  
  const rotation = useSharedValue(0);
  const isInteracting = useSharedValue(false);
  const velocity = useSharedValue(0);

  // Initialize slots
  useEffect(() => {
    if (!storyItems.length) return;
    
    if (storyItems.length <= MAX_SLOTS) {
      setActiveSlots(storyItems);
      queueRef.current = [];
    } else {
      setActiveSlots(storyItems.slice(0, MAX_SLOTS));
      queueRef.current = storyItems.slice(MAX_SLOTS);
    }
  }, [storyItems]);

  // Queue swapping logic
  useEffect(() => {
    if (storyItems.length <= MAX_SLOTS) return;

    const interval = setInterval(() => {
      // Read shared value outside state updater to avoid reading during React's render phase
      // (React can call state updaters during render in strict mode)
      const currentRotation = rotation.value;
      
      setActiveSlots(prev => {
        const nextQueue = [...queueRef.current];
        if (nextQueue.length === 0) return prev;
        
        // Find the slots that are currently in the "back" of the wheel (near the top)
        // translateY = -Math.cos(currentAngle) * RADIUS
        // The back of the wheel is where cos(angle) is positive (closest to 1)
        const slotScores = prev.map((_, i) => {
          const baseAngle = (i / MAX_SLOTS) * Math.PI * 2;
          const currentAngle = baseAngle + currentRotation;
          return { index: i, score: Math.cos(currentAngle) };
        });

        // Sort descending by score (highest score = furthest back)
        slotScores.sort((a, b) => b.score - a.score);
        
        // Pick randomly from the top 3 furthest back cards
        const candidates = slotScores.slice(0, 3);
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        const slotToReplace = picked.index;
        
        const oldItem = prev[slotToReplace];
        const newItem = nextQueue.shift()!;
        nextQueue.push(oldItem); // Put the old item back at the end of the queue
        
        queueRef.current = nextQueue;
        
        const newSlots = [...prev];
        newSlots[slotToReplace] = newItem;
        return newSlots;
      });
    }, 5000); // Swap an item every 5 seconds

    return () => clearInterval(interval);
  }, [storyItems.length]);

  // Auto-rotation + momentum decay loop
  useFrameCallback((frameInfo) => {
    if (isInteracting.value) return;
    const delta = frameInfo.timeSincePreviousFrame || 16;
    
    // base speed (approx 1 full rotation every 30 seconds)
    const baseSpeed = 0.0002; 
    
    // decay residual swipe velocity
    velocity.value = velocity.value * 0.95;
    
    // add them together
    rotation.value += (baseSpeed + velocity.value) * delta;
  });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isInteracting.value = true;
      velocity.value = 0;
    })
    .onChange((e) => {
      // Dampen sensitivity to make the wheel feel heavier and more deliberate
      rotation.value += e.changeX * 0.002 + e.changeY * 0.001;
    })
    .onEnd((e) => {
      isInteracting.value = false;
      // Aggressively dampen the release momentum (from 0.05 to 0.01)
      velocity.value = (e.velocityX * 0.002 + e.velocityY * 0.001) * 0.01;
    });

  const renderItem = (item: StoryItem, index: number) => {
    // Key must be index so the slot component stays mounted and can animate the item swap
    return <CarouselNode key={`slot-${index}`} item={item} index={index} total={activeSlots.length} rotation={rotation} />;
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

      <GestureDetector gesture={panGesture}>
        <Animated.View style={StyleSheet.absoluteFill}>
          {activeSlots.map((item, index) => renderItem(item, index))}
        </Animated.View>
      </GestureDetector>

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
