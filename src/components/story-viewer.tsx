import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Play, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';

interface StoryItem {
  id: string;
  memoryId: number;
  type: 'image' | 'video' | 'audio' | 'text';
  uri?: string;
  content?: string;
}

interface StoryViewerProps {
  items: StoryItem[];
  initialIndex: number;
  onClose: () => void;
}

const ViewerCard = React.memo(({
  item,
  index,
  scrollX,
  ITEM_WIDTH,
  SPACING,
  SNAP_INTERVAL,
  theme
}: {
  item: StoryItem;
  index: number;
  scrollX: import('react-native-reanimated').SharedValue<number>;
  ITEM_WIDTH: number;
  SPACING: number;
  SNAP_INTERVAL: number;
  theme: any;
}) => {
  const cardStyle = useAnimatedStyle(() => {
    // distance from center of screen to center of this card (in pixels)
    const distance = scrollX.value - (index * SNAP_INTERVAL);
    // normalize it: -1 means it's 1 slot to the right, 0 is center, 1 is 1 slot to the left
    const progress = distance / SNAP_INTERVAL;

    const scale = interpolate(
      progress,
      [-1, 0, 1],
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );
    
    const opacity = interpolate(
      progress,
      [-2, -1, 0, 1, 2],
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP
    );

    // Create a beautiful parabolic arc
    // When progress is 1 or -1, the card dips down by 60px
    const translateY = Math.pow(progress, 2) * 60;
    
    // Tilt the cards along the arc (-15deg on left, +15deg on right)
    const rotateZ = `${progress * -15}deg`;

    return {
      transform: [
        { translateY },
        { scale },
        { rotateZ }
      ],
      opacity,
    };
  });

  return (
    <View style={{ width: ITEM_WIDTH, marginHorizontal: SPACING / 2, justifyContent: 'center' }}>
      <Animated.View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, cardStyle]}>
        <Image
          source={{ uri: item.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
        {item.type === 'video' && (
          <View style={styles.videoOverlay}>
            <Play size={32} color="#FFF" fill="#FFF" />
          </View>
        )}
      </Animated.View>
    </View>
  );
});

export function StoryViewer({ items, initialIndex, onClose }: StoryViewerProps) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const scrollX = useSharedValue(initialIndex * (width * 0.75 + 16));
  const appearAnim = useSharedValue(0);

  const ITEM_WIDTH = width * 0.75;
  const SPACING = 16;
  const SNAP_INTERVAL = ITEM_WIDTH + SPACING;
  // Subtract SPACING / 2 because each item has marginHorizontal: SPACING / 2
  const PADDING_HORIZONTAL = (width - ITEM_WIDTH) / 2 - SPACING / 2;

  const flatListRef = useRef<Animated.FlatList<StoryItem>>(null);

  useEffect(() => {
    appearAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    appearAnim.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: appearAnim.value,
    backgroundColor: theme.background, // full background color
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(appearAnim.value, [0, 1], [0.9, 1]) }],
    opacity: appearAnim.value,
  }));

  const renderItem = ({ item, index }: { item: StoryItem; index: number }) => {
    return (
      <ViewerCard
        item={item}
        index={index}
        scrollX={scrollX}
        ITEM_WIDTH={ITEM_WIDTH}
        SPACING={SPACING}
        SNAP_INTERVAL={SNAP_INTERVAL}
        theme={theme}
      />
    );
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, { zIndex: 1000 }]}>
      {/* Header */}
      <View style={[styles.header, { top: Math.max(insets.top, 20) }]}>
        <Pressable 
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <X size={20} color={theme.text} />
        </Pressable>
      </View>

      {/* Carousel */}
      <Animated.View style={[StyleSheet.absoluteFill, containerStyle, { justifyContent: 'center' }]}>
        <Animated.FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: PADDING_HORIZONTAL,
            alignItems: 'center',
          }}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          windowSize={3}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          renderItem={renderItem}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  card: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
