import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, ScrollView, Alert, Share, Platform, Modal, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import type { Composition, MediaElement } from '@/types/journal';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Pause, Share as ShareIcon, Download, Trash2, Image as ImageIcon, FileText, MapPin, Book, BookMinus, BookPlus, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VinylRecord } from '@/components/vinyl-record';
import { StoryPicker } from '@/components/story-picker';
import { DoubleDiagonalStripes } from '@/components/double-diagonal-stripes';
import { formatMillis } from '@/utils/format-date';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';
import { usePostHog } from 'posthog-react-native';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { captureRef } from 'react-native-view-shot';
import { MemoryCard } from '@/components/memory-card';
import { DigitalAshOverlay } from '@/components/digital-ash-overlay';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';

function StoryPickerThumbnail({ media, style }: { media: { uri: string; type: string }; style: any }) {
  const isVideo = media.type === 'video';
  const videoThumb = useVideoThumbnail(isVideo ? media.uri : undefined);
  const sourceUri = isVideo && videoThumb ? videoThumb : media.uri;

  return (
    <Image 
      source={{ uri: sourceUri }} 
      style={style} 
      contentFit="cover"
    />
  );
}

// --- Types ---
type SlideData =
  | { type: 'text'; text: string; id: string; fontFamily?: string; fontSize?: number }
  | { type: 'media'; media: MediaElement; id: string };

// --- Components ---

function TextSlide({ text, width, fontFamily, fontSize }: { text: string; width: number; fontFamily?: string; fontSize?: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView 
      style={{ width, flex: 1 }} 
      contentContainerStyle={{ 
        paddingTop: insets.top + 80, 
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 32,
        flexGrow: 1,
        justifyContent: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[
        styles.textSlideContent, 
        { 
          color: theme.text,
          fontFamily: fontFamily || 'JetBrainsMono-Regular',
          fontSize: fontSize || 24,
          lineHeight: (fontSize || 24) * 1.5,
          textAlign: 'center'
        }
      ]}>
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
  // Guard: only attempt play when player has fully loaded the source
  const isLoaded = status.isLoaded;

  // Keep track of the scrub state
  const isScrubbing = useSharedValue(false);
  const scrubStartPos = useSharedValue(0);
  
  // Track visual rotation offset
  const scrubRotationOffset = useSharedValue(0);
  const scrubStartRotation = useSharedValue(0);
  const previousAngle = useSharedValue(0);
  const totalAngleDiff = useSharedValue(0);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    if (!isLoaded) return; // Wait for player to be ready
    if (isActive && !isPausedByUser) {
      try { player.play(); } catch (e) {}
    } else {
      try { player.pause(); } catch (e) {}
    }
  }, [isActive, isLoaded, player, isPausedByUser]);

  const seekTo = (seconds: number) => {
    try { player.seekTo(seconds); } catch (e) {}
  };


  const panGesture = Gesture.Pan()
    .onStart((e) => {
      runOnJS(setIsPausedByUser)(true);
      isScrubbing.value = true;
      scrubStartPos.value = status.currentTime; // status.currentTime is in seconds
      scrubStartRotation.value = scrubRotationOffset.value;
      
      // Calculate initial angle relative to the center of the 320x320 VinylRecord
      previousAngle.value = Math.atan2(e.y - 160, e.x - 160);
      totalAngleDiff.value = 0;
    })
    .onUpdate((e) => {
      const currentAngle = Math.atan2(e.y - 160, e.x - 160);
      let diff = currentAngle - previousAngle.value;
      
      // Handle the wrap-around at -PI and PI
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      
      totalAngleDiff.value += diff;
      previousAngle.value = currentAngle;

      // Convert radians to degrees
      const degrees = totalAngleDiff.value * (180 / Math.PI);
      
      // Rotate the vinyl visually
      scrubRotationOffset.value = scrubStartRotation.value + degrees;

      // 20 degrees = 1 second of audio (360 degrees = 18 seconds)
      const deltaSeconds = degrees / 20;
      const targetSeconds = scrubStartPos.value + deltaSeconds;
      const clamped = Math.max(0, Math.min(targetSeconds, status.duration));
      
      // Throttle seeking slightly by running on JS (already async)
      runOnJS(seekTo)(clamped);
    })
    .onEnd(() => {
      isScrubbing.value = false;
      runOnJS(setIsPausedByUser)(false);
    });

  const isActuallyPlaying = isActive && !isPausedByUser;

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{ alignItems: 'center' }}>
        <GestureDetector gesture={panGesture}>
          <View>
            <VinylRecord 
              size={320} 
              isRecording={false} 
              isPlaying={isActuallyPlaying} 
              scrubOffset={scrubRotationOffset}
              imageUrl={media.metadata?.artwork?.replace('100x100', '600x600')} 
            />
          </View>
        </GestureDetector>
        {media.metadata ? (
          <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 32 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
              {media.metadata.title}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '500', marginTop: 6, textAlign: 'center' }}>
              {media.metadata.artist}
            </Text>
          </View>
        ) : null}
        <Text style={{ color: theme.textMuted, marginTop: media.metadata ? 32 : 24, fontSize: 14, fontWeight: '500', letterSpacing: 1 }}>
          {formatMillis(status.currentTime * 1000)} / {formatMillis(status.duration * 1000)}
        </Text>
      </Animated.View>
    </View>
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

  // Search allCompositions (full timeline) first, then fall back to compositions (On-This-Day).
  // This ensures memories from any date resolve, not just today's.
  const composition = useJournalStore(state =>
    state.allCompositions.find(c => c.id === Number(id)) ??
    state.compositions.find(c => c.id === Number(id)) ??
    null
  );
  const { loadAllCompositions } = useJournalStore();

  // If allCompositions is empty (store hasn't loaded yet), trigger a load.
  // This handles navigating directly to a memory URL / deep-link.
  const allCount = useJournalStore(state => state.allCompositions.length);
  React.useEffect(() => {
    if (allCount === 0) {
      loadAllCompositions();
    }
  }, [allCount, loadAllCompositions]);

  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShareMenuVisible, setIsShareMenuVisible] = useState(false);
  const [isStoryPickerVisible, setIsStoryPickerVisible] = useState(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const { removeComposition, toggleStoryId } = useJournalStore();
  const { stories } = useStoriesStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
          }
        }
      ]
    );
  };

  const finalizeDelete = async () => {
    await removeComposition(Number(id));
    router.back();
  };

  const handleSaveMedia = async (uri: string) => {
    try {
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      
      if (isExpoGo && Platform.OS === 'android') {
        Alert.alert(
          'Expo Go Limitation',
          'Direct saving to gallery is disabled in Expo Go on Android due to strict permission rules. It WILL work silently with one tap in your final built app.\n\nFor now, we will open the Share sheet so you can tap "Save to device".',
          [
            { 
              text: 'OK', 
              onPress: async () => {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) await Sharing.shareAsync(uri);
              } 
            }
          ]
        );
        return;
      }

      // For iOS Expo Go, and built apps on both platforms, do the proper native save
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow Fold to access your gallery to save media.');
        return;
      }
      
      // Check if file exists first (old memories might have used temp URIs that got cleared)
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert(
          'File Unavailable',
          'The original high-resolution file is no longer available on this device. This can happen with older memories where the temporary file was cleared by the OS.'
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Saved to your gallery.');
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save media.');
    }
  };

  const hiddenCardRef = useRef<View>(null);

  const captureAndShareCard = async () => {
    try {
      setIsShareMenuVisible(false);
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
        posthog?.capture('Memory Shared', { method: 'card' });
      }
    } catch (e) {
      console.error('Failed to capture memory card:', e);
      Alert.alert('Error', 'Failed to generate image.');
    }
  };

  const shareRawContent = async (slidesList: SlideData[]) => {
    try {
      setIsShareMenuVisible(false);
      const current = slidesList[currentIndex];
      if (current.type === 'media') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(current.media.uri);
          posthog?.capture('Memory Shared', { method: 'raw_media' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      } else if (current.type === 'text') {
        await Share.share({ message: current.text });
        posthog?.capture('Memory Shared', { method: 'raw_text' });
      }
    } catch (e) {
      console.error(e);
    }
  };


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
    slides.push({ 
      type: 'text', 
      text: composition.textContent, 
      id: 'text-slide',
      fontFamily: composition.fontFamily,
      fontSize: composition.fontSize 
    });
  }

  if (hasMedia) {
    composition.mediaElements.forEach((m) => {
      slides.push({ type: 'media', media: m, id: `media-${m.id}` });
    });
  }

  const renderItem = ({ item, index }: { item: SlideData, index: number }) => {
    const isActive = index === currentIndex;
    if (item.type === 'text') {
      return <TextSlide text={item.text} width={width} fontFamily={item.fontFamily} fontSize={item.fontSize} />;
    }
    return <MediaSlide media={item.media} width={width} height={height} isActive={isActive} />;
  };

  const cardHeight = Math.min(width * 1.618, height * 0.78);

  const handleOpenLocation = () => {
    const loc = composition.location;
    if (!loc) return;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${loc.latitude},${loc.longitude}&q=${encodeURIComponent(loc.name || 'Location')}`,
      android: `geo:${loc.latitude},${loc.longitude}?q=${loc.latitude},${loc.longitude}(${encodeURIComponent(loc.name || 'Location')})`
    }) || `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    
    Linking.openURL(url).catch(err => console.error("Couldn't open map", err));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hidden card for capturing as image */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, width, height: cardHeight }}>
        <View 
          ref={hiddenCardRef} 
          collapsable={false} 
          style={{ width: width - 42, height: cardHeight, alignSelf: 'center', justifyContent: 'center' }}
        >
          <MemoryCard 
            item={composition} 
            height={cardHeight} 
            onUpdatePositions={async () => {}} 
            isExporting={true}
          />
        </View>
      </View>

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

      {/* Top Action Bar */}
      <View style={[styles.topActionBar, { top: insets.top + 16 }]}>
        <View style={styles.leftActions}>
          <Pressable 
            style={({ pressed }) => [
              styles.actionBtn, 
              { 
                borderColor: theme.border,
                backgroundColor: theme.background,
                opacity: pressed ? 0.5 : 1 
              }
            ]} 
            onPress={() => router.back()}
          >
            <X size={16} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.rightActions}>
          <Pressable 
            style={({ pressed }) => [
              styles.actionBtn, 
              { 
                borderColor: (composition?.storyIds?.length ?? 0) > 0 ? theme.text : theme.border,
                backgroundColor: theme.background,
                opacity: pressed ? 0.5 : 1 
              }
            ]} 
            onPress={() => setIsStoryPickerVisible(true)}
          >
            {(composition?.storyIds?.length ?? 0) > 0 ? (
              <Book size={16} color={theme.text} />
            ) : (
              <BookPlus size={16} color={theme.text} />
            )}
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.actionBtn, 
              { 
                borderColor: theme.border,
                backgroundColor: theme.background,
                opacity: pressed ? 0.5 : 1 
              }
            ]} 
            onPress={() => setIsShareMenuVisible(true)}
          >
            <ShareIcon size={16} color={theme.text} />
          </Pressable>

          {slides[currentIndex]?.type === 'media' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  opacity: pressed ? 0.5 : 1,
                }
              ]}
              onPress={() => handleSaveMedia((slides[currentIndex] as Extract<SlideData, { type: 'media' }>).media.uri)}
            >
              <Download size={16} color={theme.text} />
            </Pressable>
          )}

          <Pressable 
            style={({ pressed }) => [
              styles.actionBtn, 
              { 
                borderColor: 'rgba(255,59,48,0.3)',
                backgroundColor: 'rgba(255,59,48,0.1)',
                opacity: pressed ? 0.5 : 1 
              }
            ]} 
            onPress={handleDelete}
          >
            <Trash2 size={16} color="#FF3B30" />
          </Pressable>
        </View>
      </View>

      {/* Bottom Bar: Location, Story & Slide Indicator */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 24, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }]}>
        <View style={{ gap: 8, flex: 1, alignItems: 'flex-start' }}>
          {(composition?.storyIds?.length ?? 0) > 0 && (
            <Pressable 
              style={({ pressed }) => [styles.locationBadge, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => {
                if (composition.storyIds.length === 1) {
                  router.push(`/stories/${composition.storyIds[0]}`);
                } else {
                  setIsStoryPickerVisible(true);
                }
              }}
            >
              <Book size={12} color={theme.textMuted} />
              <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                {composition.storyIds.length === 1 
                  ? stories.find(s => s.id === composition.storyIds[0])?.title.toUpperCase() 
                  : `${composition.storyIds.length} STORIES`}
              </Text>
            </Pressable>
          )}

          {composition.location?.name && (
            <Pressable 
              style={({ pressed }) => [styles.locationBadge, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleOpenLocation}
            >
              <MapPin size={12} color={theme.textMuted} />
              <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                {composition.location.name.toUpperCase()}
              </Text>
            </Pressable>
          )}
        </View>
        
        {slides.length > 1 && (
          <View style={styles.indicatorContainer}>
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

      {/* Custom Share Menu */}
      <Modal visible={isShareMenuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsShareMenuVisible(false)} />
          
          <View style={[styles.shareMenu, { backgroundColor: theme.backgroundElement, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.shareMenuHeader}>
              <View style={[styles.shareMenuHandle, { backgroundColor: theme.border }]} />
              <Text style={[styles.shareMenuTitle, { color: theme.text }]}>Share options</Text>
            </View>
            
            <Pressable 
              style={({ pressed }) => [styles.shareOption, { backgroundColor: pressed ? theme.background : 'transparent' }]} 
              onPress={captureAndShareCard}
            >
              <View style={[styles.shareIconBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <ImageIcon size={18} color={theme.text} />
              </View>
              <View style={styles.shareOptionText}>
                <Text style={[styles.shareOptionTitle, { color: theme.text }]}>Export as Canvas</Text>
                <Text style={[styles.shareOptionDesc, { color: theme.textMuted }]}>A beautifully framed canvas, ready to share</Text>
              </View>
            </Pressable>
            
            <Pressable 
              style={({ pressed }) => [styles.shareOption, { backgroundColor: pressed ? theme.background : 'transparent' }]} 
              onPress={() => shareRawContent(slides)}
            >
              <View style={[styles.shareIconBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                {slides[currentIndex]?.type === 'media' ? (
                  <Download size={18} color={theme.text} />
                ) : (
                  <FileText size={18} color={theme.text} />
                )}
              </View>
              <View style={styles.shareOptionText}>
                <Text style={[styles.shareOptionTitle, { color: theme.text }]}>Share Original</Text>
                <Text style={[styles.shareOptionDesc, { color: theme.textMuted }]}>The raw, untouched source media</Text>
              </View>
            </Pressable>

          </View>
        </View>
      </Modal>

      <StoryPicker
        mode="multi"
        visible={isStoryPickerVisible}
        onClose={() => setIsStoryPickerVisible(false)}
        selectedStoryIds={composition?.storyIds ?? []}
        onToggle={async (storyId) => {
          if (!composition) return;
          await toggleStoryId(composition.id, storyId);
        }}
      />
      {isDeleting && <DigitalAshOverlay color={theme.background} onComplete={finalizeDelete} />}
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
  topActionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    alignItems: 'center',
    gap: 12,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  locationText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 16, // Fixed height to align properly with text
    justifyContent: 'center',
  },
  bead: {
    height: 4,
    borderWidth: 1,
    borderRadius: 2,
  },
  beadActive: {
    width: 16, // Sleeker dash
  },
  beadInactive: {
    width: 4, // Small square
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  shareMenu: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  shareMenuHeader: {
    padding: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  shareMenuHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.5,
  },
  shareMenuTitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  shareIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconBoxStack: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSticker: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 15,
  },
  shareOptionDesc: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
});
