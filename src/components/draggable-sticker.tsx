import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { PlayCircle } from 'lucide-react-native';
import { VinylRecord } from '@/components/vinyl-record';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { MediaElement } from '@/types/journal';

import { useTheme } from '@/hooks/use-theme';

interface DraggableStickerProps {
  media: MediaElement;
  onDragEnd: (id: string, x: number, y: number, scale?: number) => void;
  cardWidth: number;
  cardHeight: number;
}

export function DraggableSticker({ media, onDragEnd, cardWidth, cardHeight }: DraggableStickerProps) {
  const theme = useTheme();

  // Clamp initial positions just in case they spawned out of bounds
  const clampedStartX = Math.max(0, Math.min(media.x_pos, cardWidth - 90));
  const clampedStartY = Math.max(0, Math.min(media.y_pos, cardHeight - 120));

  const translateX = useSharedValue(clampedStartX);
  const translateY = useSharedValue(clampedStartY);
  const isDragging = useSharedValue(false);
  
  // Scale for pinch
  const baseScale = useSharedValue(media.scale ?? 1);
  const savedBaseScale = useSharedValue(media.scale ?? 1);
  
  // Scale for drag pop
  const activeScale = useSharedValue(1);

  // Keep track of where the drag started so we can calculate relative movement
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      activeScale.value = withSpring(1.05, { damping: 25, stiffness: 400 });
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = cardWidth - 90;
      const maxY = cardHeight - 120;
      
      let nextX = contextX.value + event.translationX;
      let nextY = contextY.value + event.translationY;
      
      // Physically prevent dragging outside the card boundaries
      translateX.value = Math.max(0, Math.min(nextX, maxX));
      translateY.value = Math.max(0, Math.min(nextY, maxY));
    })
    .onEnd(() => {
      isDragging.value = false;
      activeScale.value = withSpring(1, { damping: 25, stiffness: 400 });
      runOnJS(onDragEnd)(media.id, translateX.value, translateY.value, baseScale.value);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      baseScale.value = Math.max(0.5, Math.min(savedBaseScale.value * event.scale, 3));
    })
    .onEnd(() => {
      savedBaseScale.value = baseScale.value;
      runOnJS(onDragEnd)(media.id, translateX.value, translateY.value, baseScale.value);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: baseScale.value * activeScale.value },
      ],
      zIndex: isDragging.value ? 10 : 1,
      shadowOpacity: isDragging.value ? 0.2 : 0.05,
      shadowRadius: isDragging.value ? 12 : 4,
      shadowOffset: { width: 0, height: isDragging.value ? 8 : 2 },
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[
        styles.sticker, 
        { 
          backgroundColor: theme.isDark ? '#111111' : '#F0F0F0',
          borderColor: theme.isDark ? '#000000' : '#FFFFFF' 
        }, 
        animatedStyle
      ]}>
        <View style={styles.innerFrame}>
          {media.type === 'audio' ? (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }]}>
              <VinylRecord size={70} isPlaying={false} isRecording={false} />
            </View>
          ) : (
            <Image
              source={{ uri: media.uri }}
              style={styles.image}
              contentFit="cover"
            />
          )}
          {media.type === 'video' && (
            <View style={styles.videoOverlay}>
              <PlayCircle size={28} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sticker: {
    width: 90, // Reduced size, 3:4 ratio
    height: 120,
    borderWidth: 4,
    shadowColor: '#000',
  },
  innerFrame: {
    flex: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
