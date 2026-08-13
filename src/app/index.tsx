import React, { memo } from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions, Text, Pressable } from 'react-native';
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
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoryCard } from '@/components/memory-card';
import { GrainBackground } from '@/components/grain-background';
import { AddButton } from '@/components/add-button';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/empty-state';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';

const CARD_GAP = 21; // Fibonacci sequence

interface CarouselItemProps {
  item: Composition;
  index: number;
  snapInterval: number;
  cardHeight: number;
  scrollY: SharedValue<number>;
  updatePositions: (id: number, media: any) => void;
}

const CarouselItem = memo(function CarouselItem({ item, index, snapInterval, cardHeight, scrollY, updatePositions }: CarouselItemProps) {
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
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      <GestureDetector gesture={doubleTap}>
        <Animated.View style={animatedStyle}>
          <MemoryCard item={item} height={cardHeight} onUpdatePositions={updatePositions} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function HomeScreen() {
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { compositions, loading, refresh, updatePositions, setTargetDate } = useJournalStore();
  
  // Ensure we are viewing today's data on the home screen
  useFocusEffect(
    useCallback(() => {
      setTargetDate(new Date());
    }, [setTargetDate])
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAdd = () => {
    router.push('/compose');
  };

  const handleSwipeUp = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to capture memories!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Camera URIs on iOS are temporary. Copy to persistent storage before navigating.
        // Preserve the original extension (.mov for iOS videos, .jpg for photos) so the OS can play them.
        const originalUri = asset.uri;
        const extMatch = originalUri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : (asset.type === 'video' ? 'mov' : 'jpg');
        const destUri = `${FileSystem.documentDirectory}camera_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: originalUri, to: destUri });

        setPendingCameraMedia({
          uri: destUri,
          type: asset.type === 'video' ? 'video' : 'image',
          width: asset.width,
          height: asset.height,
        });

        router.push('/compose');
      }
    } catch (error) {
      console.error('Failed to launch camera:', error);
    }
  };

  const listRef = useRef<Animated.FlatList<Composition>>(null);
  const prevCount = useRef(compositions.length);

  // Auto-scroll to the bottom when a new item is added
  // Compute date synchronously so it never flashes empty
  const [dateStr] = useState(() => {
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[now.getDay()];
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    return `${day} ${d}.${m}.${y}`;
  });

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

  const renderItem = useCallback(({ item, index }: { item: Composition; index: number }) => (
    <CarouselItem
      item={item}
      index={index}
      snapInterval={snapInterval}
      cardHeight={cardHeight}
      scrollY={scrollY}
      updatePositions={updatePositions}
    />
  ), [snapInterval, cardHeight, scrollY, updatePositions]);

  return (
    // Clean background
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <Pressable 
        style={({ pressed }) => [
          styles.profileButton, 
          { 
            top: 21, 
            opacity: pressed ? 0.5 : 1,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border
          }
        ]}
        onPress={() => router.push('/profile')}
      >
        <User size={20} color={theme.text} />
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
          <Text style={[styles.dateText, { color: theme.textMuted }]}>{dateStr}</Text>
        </View>
        <AddButton onPress={handleAdd} onSwipeUp={handleSwipeUp} />
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
  profileButton: {
    position: 'absolute',
    right: 21,
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
  },
  carouselItem: {
    justifyContent: 'center',
    paddingHorizontal: 21,
  },
});
