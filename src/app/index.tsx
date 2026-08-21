import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions, Text, Pressable, Alert, Modal, Platform } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler,
  useSharedValue, FadeOut,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  withSequence,
  withTiming,
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
import { User } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSettingsStore } from '@/hooks/use-settings';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';
import { useShareIntent } from 'expo-share-intent';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AudioModule, useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { VinylRecord } from '@/components/vinyl-record';
import { formatMillis } from '@/utils/format-date';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

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
  const shareFlashOpacity = useSharedValue(0);
  const hiddenCardRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const theme = useTheme();
  
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

  const flashStyle = useAnimatedStyle(() => ({
    opacity: shareFlashOpacity.value,
  }));

  const navigateToDetail = () => {
    router.push(`/memory/${item.id}`);
  };

  const triggerShareFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    shareFlashOpacity.value = withSequence(
      withTiming(0.6, { duration: 50 }),
      withTiming(0, { duration: 400 })
    );
  };

  const captureAndShareCard = async () => {
    try {
      // Small delay to ensure the offscreen card is rendered
      await new Promise(resolve => setTimeout(resolve, 50));
      const uri = await captureRef(hiddenCardRef, {
        format: 'png',
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share Memory Card',
          mimeType: 'image/png',
        });
      }
    } catch (e) {
      console.error('Failed to capture memory card:', e);
    }
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(navigateToDetail)();
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      runOnJS(triggerShareFeedback)();
      runOnJS(captureAndShareCard)();
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const composed = Gesture.Exclusive(doubleTap, longPress);

  return (
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      {/* Hidden card for capturing as image */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, width, height: cardHeight }}>
        <View 
          ref={hiddenCardRef} 
          collapsable={false} 
          style={{ width: width - 42, height: cardHeight, alignSelf: 'center', justifyContent: 'center' }}
        >
          <MemoryCard 
            item={item} 
            height={cardHeight} 
            onUpdatePositions={() => {}} 
            isExporting={true}
          />
        </View>
      </View>

      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <MemoryCard item={item} height={cardHeight} onUpdatePositions={updatePositions} />
          {/* Flash overlay for share trigger */}
          <Animated.View 
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.text, borderRadius: 24, zIndex: 10 }, flashStyle]} 
            pointerEvents="none" 
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function HomeScreen() {
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { compositions, loading, refresh, updatePositions, setTargetDate, addComposition, setActiveCompositionId } = useJournalStore();
  
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  
  const { settings, updateSetting } = useSettingsStore();
  
  // Handle incoming shared media (e.g. from Photos app, Chrome, etc.)
  useEffect(() => {
    if (error) {
      console.error('Share Intent Error:', error);
      return;
    }
    
    if (hasShareIntent && shareIntent.files && shareIntent.files.length > 0) {
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      
      if (isExpoGo) {
        Alert.alert(
          'Expo Go Limitation',
          'Receiving shared media from other apps is disabled in Expo Go. It WILL work seamlessly in your final built app.',
          [{ text: 'OK', onPress: () => resetShareIntent() }]
        );
        return;
      }
      
      const file = shareIntent.files[0];
      const isVideo = file.mimeType?.startsWith('video/') || file.path.endsWith('.mp4');
      const ext = isVideo ? 'mp4' : 'jpg';
      
      // We must copy the file to our document directory to ensure we own it before navigating to compose
      const dest = `${FileSystem.documentDirectory}shared_${Date.now()}.${ext}`;
      FileSystem.copyAsync({ from: file.path, to: dest }).then(() => {
        setPendingCameraMedia({ uri: dest, type: isVideo ? 'video' : 'image', width: 1080, height: 1920 });
        resetShareIntent();
        router.push('/compose');
      }).catch(err => {
        console.error('Failed to copy shared file', err);
        resetShareIntent();
      });
    }
  }, [hasShareIntent, shareIntent, error]);

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

  const isCameraOpenRef = useRef(false);

  const handleSwipeUp = async (type: 'photo' | 'video') => {
    
    if (isCameraOpenRef.current) return;
    try {
      isCameraOpenRef.current = true;
      if (type === 'video' && !Device.isDevice && Platform.OS === 'ios') {
        Alert.alert(
          'Simulator Unsupported',
          'Video capture is not supported on the iOS Simulator. Please test this on a physical device.'
        );
        return;
      }

      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') return;

      if (type === 'video') {
        const { status: micStatus } = await AudioModule.requestRecordingPermissionsAsync();
        if (micStatus !== 'granted') return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        allowsEditing: false,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        
        // Copy to safe document directory
        const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : (asset.type === 'video' ? 'mp4' : 'jpg');
        const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        
        await FileSystem.copyAsync({ from: asset.uri, to: dest });

        setPendingCameraMedia({
          uri: dest,
          type: asset.type === 'video' ? 'video' : 'image',
          width: asset.width,
          height: asset.height
        });
        
        router.push('/compose');
      }
    } catch (error) {
      console.error('Failed to launch camera:', error);
    } finally {
      isCameraOpenRef.current = false;
    }
  };

  const recordIntentRef = useRef(false);

  const handleLongPressStart = async () => {
    
    try {
      recordIntentRef.current = true;
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') return;
      
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      
      // Check if user released while we were preparing
      if (!recordIntentRef.current) {
        return;
      }
      
      await recorder.record();
    } catch (err) {
      console.error('Failed to start quick record', err);
    }
  };

  const handleLongPressEnd = async () => {
    try {
      recordIntentRef.current = false;
      // Use the recorder's live state rather than the React state which might be a tick behind
      if (recorder.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          // Copy to safe document directory
          const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'm4a';
          const dest = `${FileSystem.documentDirectory}audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          
          await FileSystem.copyAsync({ from: uri, to: dest });

          const newMedia = {
            id: Math.random().toString(36).substring(2, 9),
            uri: dest,
            type: 'audio' as const,
            x_pos: 30 + Math.random() * (width - 150),
            y_pos: 30 + Math.random() * (height - 200),
          };
          // Instant save as a memory
          await addComposition({
            textContent: '',
            mediaElements: [newMedia],
            fontFamily: 'JetBrainsMono-Regular',
            fontSize: 16,
          });
        }
      }
    } catch (err) {
      console.error('Failed to save quick record', err);
    }
  };

  const listRef = useRef<Animated.FlatList<Composition>>(null);
  const prevCount = useRef(compositions.length);

  // Auto-scroll to the bottom when a new item is added
  const [activeDate, setActiveDate] = useState(() => new Date());

  // Compute the date string to display. Use activeDate if valid, else today.
  // This is a plain function, not useMemo, to guarantee it always produces output.
  const getDateString = (): string => {
    let date = activeDate;
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    }
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear()); // Explicit String() cast
    return `${day}  ${dd}.${mm}.${yyyy}`;
  };

  const dateDisplayString = getDateString();

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const centerItem = viewableItems.find((v: any) => v.isViewable) || viewableItems[0];
      if (centerItem && centerItem.item) {
        setActiveCompositionId(centerItem.item.id);
        if (centerItem.item.createdAt) {
          const parsed = new Date(centerItem.item.createdAt);
          // Only update if the parsed date is actually valid
          if (!isNaN(parsed.getTime())) {
            setActiveDate(parsed);
          }
        }
      }
    }
  }).current;

  useEffect(() => {
    if (compositions.length > prevCount.current) {
      setTimeout(() => {
        // Since the list is inverted and data is reversed, index 0 (the newest item) is at offset 0 (the bottom).
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
        style={({pressed}) => [
          styles.tabB, 
          { 
            top: Math.max(insets.top, 20),
            backgroundColor: pressed ? '#E0E0E0' : theme.backgroundElement,
            borderColor: theme.border 
          }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/profile');
        }}
      >
        <User size={16} color={theme.text} strokeWidth={2.5} />
        <View style={[styles.notchIndicator, { backgroundColor: theme.accentWarm }]} />
      </Pressable>

      {compositions.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={[...compositions].reverse()}
          inverted={true}
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
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          // Center cards perfectly in the absolute physical screen.
          // Because the list is inverted, paddingTop is applied at the visual bottom and paddingBottom at the visual top.
          // We use symmetricPadding for both to ensure every card perfectly snaps to the physical center of the screen.
          contentContainerStyle={{
            paddingBottom: symmetricPadding, // visual top
            paddingTop: symmetricPadding, // visual bottom
          }}
        />
      )}

      {/* Floating bottom bar with Date and Add Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dateContainer}>
          <Text 
            style={[styles.dateText, { color: theme.textMuted }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {dateDisplayString}
          </Text>
        </View>
        <AddButton 
          onPress={handleAdd} 
          onSwipeUp={handleSwipeUp}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
        />
      </View>

      {/* Quick Record Overlay using Modal for guaranteed centering and top-level z-index */}
      <Modal 
        visible={recorderState.isRecording} 
        transparent={true} 
        animationType="fade"
      >
        <View style={styles.recordingOverlay}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="vignette" cx="50%" cy="50%" rx="70%" ry="70%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000'} stopOpacity="0.4" />
                <Stop offset="40%" stopColor={theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000'} stopOpacity="0.7" />
                <Stop offset="100%" stopColor={theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000'} stopOpacity="0.95" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#vignette)" />
          </Svg>
          
          <VinylRecord isPlaying={true} />
          <Text style={[styles.recordingTime, { color: theme.text }]}>
            {formatMillis(recorderState.durationMillis)}
          </Text>
        </View>
      </Modal>
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
    zIndex: 999,
    elevation: 99,
    pointerEvents: 'box-none',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16, // Space between date and Add Button
  },
  dateText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    color: '#878787',
    minWidth: 200, // Guarantees enough width for "fri  14.08.2026" to never clip
    textAlign: 'center',
  },
  tabB: {
    position: 'absolute',
    right: 0,
    zIndex: 100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1,
    borderRightWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notchIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 8,
  },
  carouselItem: {
    justifyContent: 'center',
    paddingHorizontal: 21,
  },
  recordingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed the black background per user request, just a subtle shadow/tint to keep text legible if needed
    backgroundColor: 'transparent',
  },
  recordingTime: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    marginTop: 40,
    letterSpacing: 2,
  },
});
