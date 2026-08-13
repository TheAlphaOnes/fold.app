import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getCompositionById } from '@/db/journal-repository';
import type { Composition, MediaElement } from '@/types/journal';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Pause } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VinylRecord } from '@/components/vinyl-record';
import { DoubleDiagonalStripes } from '@/components/double-diagonal-stripes';
import { formatMillis } from '@/utils/format-date';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

// --- Types ---
type SlideData =
  | { type: 'text'; text: string; id: string }
  | { type: 'media'; media: MediaElement; id: string };

// --- Components ---

function TextSlide({ text, width }: { text: string; width: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView 
      style={{ width, flex: 1 }} 
      contentContainerStyle={{ 
        paddingTop: insets.top + 80, 
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.textSlideContent, { color: theme.text }]}>
        {text}
      </Text>
    </ScrollView>
  );
}

function VideoSlide({ media, width, height, isActive }: { media: MediaElement; width: number; height: number; isActive: boolean }) {
  const player = useVideoPlayer(media.uri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const handlePressIn = () => {
    if (isActive) player.pause();
  };

  const handlePressOut = () => {
    if (isActive) player.play();
  };

  return (
    <Pressable 
      style={{ width, height, justifyContent: 'center', alignItems: 'center' }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <VideoView 
        player={player} 
        style={StyleSheet.absoluteFill} 
        contentFit="contain" 
        nativeControls={false}
      />
    </Pressable>
  );
}

function AudioSlide({ media, width, height, isActive }: { media: MediaElement; width: number; height: number; isActive: boolean }) {
  const player = useAudioPlayer(media.uri);
  const status = useAudioPlayerStatus(player);
  const [isPausedByUser, setIsPausedByUser] = React.useState(false);
  const theme = useTheme();

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    if (isActive && !isPausedByUser) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player, isPausedByUser]);

  const handlePressIn = () => {
    if (isActive) setIsPausedByUser(true);
  };

  const handlePressOut = () => {
    if (isActive) setIsPausedByUser(false);
  };

  const isActuallyPlaying = isActive && !isPausedByUser;

  return (
    <Pressable 
      style={{ width, height, justifyContent: 'center', alignItems: 'center' }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <VinylRecord size={300} isRecording={false} isPlaying={isActuallyPlaying} />
      <Text style={[styles.textSlideContent, { color: theme.text, marginTop: 24, fontSize: 18, fontFamily: 'JetBrainsMono-Medium' }]}>
        {formatMillis(status.currentTime * 1000)} / {formatMillis(status.duration * 1000)}
      </Text>
    </Pressable>
  );
}

function MediaSlide({ media, width, height, isActive }: { media: MediaElement; width: number; height: number; isActive: boolean }) {
  const insets = useSafeAreaInsets();
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Track zoom state in JS so we can toggle the pan gesture's enabled prop.
  // Pan is only active when zoomed in — this lets FlatList receive horizontal
  // swipe events at 1x scale so the user can still paginate between slides.
  const [isZoomed, setIsZoomed] = React.useState(false);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        // Snap back to unzoomed — reset everything and unlock FlatList swipe
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setIsZoomed)(true);
      }
    });

  const panGesture = Gesture.Pan()
    // Only capture pan events when zoomed in — at 1x the FlatList handles swiping
    .enabled(isZoomed)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    flex: 1,
  }));

  if (media.type === 'video') {
    return <VideoSlide media={media} width={width} height={height} isActive={isActive} />;
  }
  if (media.type === 'audio') {
    return <AudioSlide media={media} width={width} height={height} isActive={isActive} />;
  }

  return (
    <View style={{ width, height, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <Image 
            source={{ uri: media.uri }} 
            style={{ flex: 1 }} 
            contentFit="contain" 
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// --- Main Screen ---

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [composition, setComposition] = useState<Composition | null>(null);
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    if (!id) return;
    const fetchMemory = async () => {
      const comp = await getCompositionById(Number(id));
      setComposition(comp);
    };
    fetchMemory();
  }, [id]);

  if (!composition) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <Text style={{ color: theme.text, fontFamily: 'JetBrainsMono-Regular', textAlign: 'center' }}>Loading...</Text>
      </View>
    );
  }

  // Construct Slides
  const slides: SlideData[] = [];
  
  const hasText = !!composition.textContent.trim();
  const hasMedia = composition.mediaElements.length > 0;

  if (hasText) {
    slides.push({ type: 'text', text: composition.textContent, id: 'text-slide' });
  }

  if (hasMedia) {
    composition.mediaElements.forEach((m) => {
      slides.push({ type: 'media', media: m, id: `media-${m.id}` });
    });
  }

  const renderItem = ({ item, index }: { item: SlideData, index: number }) => {
    const isActive = index === currentIndex;
    if (item.type === 'text') {
      return <TextSlide text={item.text} width={width} />;
    }
    return <MediaSlide media={item.media} width={width} height={height} isActive={isActive} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Close Button */}
      <Pressable 
        style={({ pressed }) => [
          styles.backButton, 
          { 
            top: insets.top + 16, 
            borderColor: theme.border,
            backgroundColor: theme.background,
            opacity: pressed ? 0.5 : 1 
          }
        ]} 
        onPress={() => router.back()}
      >
        <X size={16} color={theme.text} />
      </Pressable>

      {/* Slide Indicator (TE Beads) */}
      {slides.length > 1 && (
        <View style={[styles.indicatorContainer, { bottom: insets.bottom + 24 }]}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View 
                key={index} 
                style={[
                  styles.bead, 
                  isActive ? styles.beadActive : styles.beadInactive,
                  { 
                    backgroundColor: isActive ? theme.accent : 'transparent',
                    borderColor: isActive ? theme.accent : theme.text 
                  }
                ]} 
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textSlideContent: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    lineHeight: 38,
  },
  backButton: {
    position: 'absolute',
    left: 21,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bead: {
    height: 6,
    borderWidth: 1,
    borderRadius: 1,
  },
  beadActive: {
    width: 24, // Expanded dash for current
  },
  beadInactive: {
    width: 6, // Small square for inactive
    opacity: 0.3,
  },
});
