import * as Device from 'expo-device';
import React, { memo, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions, Text, Alert, Platform } from 'react-native';
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
import { AmbientBackdrop } from '@/components/ambient-backdrop';
import { AddButton } from '@/components/add-button';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';
import { router, useFocusEffect, Redirect } from 'expo-router';
import { EmptyState } from '@/components/empty-state';
import { User, Book } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSettingsStore } from '@/hooks/use-settings';
import * as FileSystem from 'expo-file-system/legacy';
import { setPendingCameraMedia, type PendingMedia } from '@/utils/pending-camera-media';
import { copyWithinFileSize, alertFileTooLarge, alertElementCap, sliceToElementCap } from '@/utils/media-attach';
import type { MediaKind } from '@/constants/media';
import { useShareIntent } from 'expo-share-intent';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { RecordingOverlay } from '@/components/recording-overlay';
import { useQuickCapture } from '@/hooks/use-quick-capture';
import { useFulfilPhotoRequest } from '@/hooks/use-capture-request';
import { FieldGuideTab } from '@/components/field-guide-tab';
import { EdgeTab } from '@/components/edge-tab';
import { InkGain } from '@/components/ink-gain';

const CARD_GAP = 21; // Fibonacci sequence
/** A drag must cover this share of a card to move to the next one… */
const SNAP_MIN_DRAG = 0.2;
/** …unless it ends in a deliberate flick (points per millisecond, as both platforms report it). */
const SNAP_FLICK_VELOCITY = 1.2;

import { CarouselItem } from '@/components/carousel-item';
import { DateSeparator, DATE_SEPARATOR_HEIGHT } from '@/components/date-separator';
import { TimelinePlaceholder } from '@/components/timeline-placeholder';
import { buildTimelineRows, memoryIndexNearOffset, type TimelineRow } from '@/utils/timeline';
import { haptic } from '@/services/haptics';

export default function HomeScreen() {
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    timelineSpine,
    timelineKey,
    hydratedById,
    hydrationVersion,
    refresh,
    loadTimeline,
    hydrateAround,
    updatePositions,
    setTargetDate,
    setActiveCompositionId,
  } = useJournalStore();
  const hydratedRef = useRef(hydratedById);
  hydratedRef.current = hydratedById;
  const timelineError = useJournalStore((state) => state.error);
  
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  const quickCapture = useQuickCapture();
  // A tapped moment reminder lands here and goes straight to the camera.
  useFulfilPhotoRequest(quickCapture.capturePhoto);
  
  const { settings, updateSetting } = useSettingsStore();
  
  // The user wants the active card perfectly physically centered in the absolute screen
  // so that the previous card and next card peek by the exact same number of pixels.
  // We calculate card height strictly based on golden ratio, capped safely.
  const cardHeight = Math.min(width * 1.618, height * 0.78);
  const snapInterval = cardHeight + CARD_GAP;
  const symmetricPadding = (height - snapInterval) / 2;

  const timelineData = useMemo(() => {
    return buildTimelineRows(
      timelineSpine,
      settings.timelineMode,
      snapInterval,
      DATE_SEPARATOR_HEIGHT,
    );
  }, [timelineSpine, settings.timelineMode, snapInterval]);

  
  // Handle incoming shared media (e.g. from Photos app, Chrome, Files, etc.)
  useEffect(() => {
    if (error) {
      console.error('Share Intent Error:', error);
      return;
    }
    
    if (!hasShareIntent) return;

    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Receiving shared media from other apps requires a development build. It works seamlessly in your final built app.',
        [{ text: 'OK', onPress: () => resetShareIntent() }]
      );
      return;
    }

    // Handle shared files (images, videos, audio, docs)
    if (shareIntent.files && shareIntent.files.length > 0) {
      // Every shared file becomes a sticker on one new memory, up to the
      // card's element cap; files over the size limit are skipped and
      // reported together.
      const { accepted: files, capped } = sliceToElementCap(0, shareIntent.files);
      const oversized: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 };

      Promise.all(
        files.map(async (file, i): Promise<PendingMedia | null> => {
          const mime = file.mimeType || '';
          const kind: MediaKind =
            mime.startsWith('video/') || file.path?.endsWith('.mp4') || file.path?.endsWith('.mov')
              ? 'video'
              : mime.startsWith('audio/')
                ? 'audio'
                : 'image';
          const ext = kind === 'video' ? 'mp4' : kind === 'audio' ? 'm4a' : 'jpg';
          const dest = `${FileSystem.documentDirectory}shared_${Date.now()}_${i}.${ext}`;
          const copied = await copyWithinFileSize({ from: file.path, to: dest, kind });
          if (!copied) {
            oversized[kind] += 1;
            return null;
          }
          return { uri: dest, type: kind, width: file.width ?? undefined, height: file.height ?? undefined };
        }),
      )
        .then((results) => {
          const media = results.filter((m): m is PendingMedia => m !== null);
          resetShareIntent();
          if (capped) alertElementCap();
          for (const kind of ['image', 'video', 'audio'] as MediaKind[]) {
            if (oversized[kind] > 0) alertFileTooLarge(kind, oversized[kind]);
          }
          if (media.length === 0) return;
          setPendingCameraMedia(media);
          router.push('/compose');
        })
        .catch((err) => {
          console.error('Failed to copy shared files', err);
          resetShareIntent();
        });
      return;
    }

    // Handle shared text / URL — open compose with the text pre-filled
    if (shareIntent.text || shareIntent.webUrl) {
      const sharedText = shareIntent.webUrl || shareIntent.text || '';
      resetShareIntent();
      router.push({ pathname: '/compose', params: { sharedText } });
    }
  }, [hasShareIntent, shareIntent, error]);

  // Ensure we are viewing today's data on the home screen
  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setTargetDate(today);
      loadTimeline(settings.timelineMode, today);
    }, [setTargetDate, loadTimeline, settings.timelineMode])
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAdd = () => {
    
    router.push('/compose');
  };

  const listRef = useRef<Animated.FlatList<TimelineRow>>(null);
  const prevCount = useRef(timelineData.items.length);
  const offsetsRef = useRef(timelineData.offsets);
  offsetsRef.current = timelineData.offsets;
  const spineRef = useRef(timelineSpine);
  spineRef.current = timelineSpine;
  const hydrateAroundRef = useRef(hydrateAround);
  hydrateAroundRef.current = hydrateAround;

  // Auto-scroll to the bottom when a new item is added
  const [activeDate, setActiveDate] = useState(() => new Date());

  // Compute the date string to display. Use activeDate if valid, else today.
  // This is a plain function, not useMemo, to guarantee it always produces output.
  const getDateString = (): string => {
    let date = activeDate;
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    }
    const yyyy = String(date.getFullYear());
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}  ${dd}.${mm}.${yyyy}`;
  };

  const dateDisplayString = getDateString();

  const lastActiveIdRef = useRef<number | null>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      // If the absolute newest item in the timeline (index 0) is viewable, 
      // we consider the user physically anchored in the "Present" time.
      const isAtBottom = viewableItems.some((v: any) => v.index === 0 && v.isViewable);

      // Find the first viewable memory card (ignore separators for active date calculation)
      const centerView = viewableItems.find((v: any) => v.isViewable && v.item.type === 'memory') || 
                         viewableItems.find((v: any) => v.item.type === 'memory');
                         
      if (centerView && centerView.item && centerView.item.type === 'memory') {
        const createdAt = centerView.item.createdAt as number;
        const compositionId = centerView.item.compositionId as number;
        const spineIndex = spineRef.current.findIndex((entry) => entry.id === compositionId);
        if (spineIndex >= 0) {
          hydrateAroundRef.current(spineIndex);
        }
        if (isAtBottom) {
          setActiveDate(new Date());
        } else if (createdAt) {
          const parsed = new Date(createdAt);
          if (!isNaN(parsed.getTime())) {
            setActiveDate(parsed);
          }
        }
      }
    }
  }).current;

  useEffect(() => {
    if (timelineData.items.length > prevCount.current) {
      setTimeout(() => {
        // Since the list is inverted and data is reversed, index 0 (the newest item) is at offset 0 (the bottom).
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 300); // Snappier wait for screen transition
    }
    prevCount.current = timelineData.items.length;
  }, [timelineData.items.length]);
  
  // The user wants the active card perfectly physically centered in the absolute screen
  // so that the previous card and next card peek by the exact same number of pixels.

  const scrollY = useSharedValue(0);
  const lastSyncOffset = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);

  /**
   * Native snapping with disableIntervalMomentum moves to the neighbouring
   * card whenever a drag ends with any velocity at all, so a slight push
   * flipped the card. A drag that is both short and slow is sent back to
   * the card it started on instead; real swipes keep the native snap.
   */
  const returnToCard = useCallback((fromOffset: number) => {
    const offsets = timelineData.offsets;
    if (offsets.length === 0) return;
    let nearest = offsets[0];
    for (const offset of offsets) {
      if (Math.abs(offset - fromOffset) < Math.abs(nearest - fromOffset)) nearest = offset;
    }
    listRef.current?.scrollToOffset({ offset: nearest, animated: true });
  }, [timelineData.offsets]);
  const syncWindow = useCallback((offsetY: number) => {
    const index = memoryIndexNearOffset(offsetsRef.current, offsetY);
    hydrateAround(index);
  }, [hydrateAround]);

  /**
   * The centred card is derived from the scroll offset — the same offsets the
   * feed snaps to — and written to the store as the active memory (which the
   * ambient backdrop and audio auto-play follow). Viewability callbacks only
   * fire when the visible set changes, so they left a stale active memory
   * after other screens (time machine, stories) had set their own.
   */
  const settleActive = useCallback((offsetY: number) => {
    const spine = spineRef.current;
    if (spine.length === 0) return;
    const id = spine[memoryIndexNearOffset(offsetsRef.current, offsetY)]?.id;
    if (id === undefined) return;
    if (lastActiveIdRef.current !== null && lastActiveIdRef.current !== id) {
      haptic.select();
    }
    lastActiveIdRef.current = id;
    setActiveCompositionId(id);
  }, [setActiveCompositionId]);

  // Re-assert the centred card whenever home is shown again or the feed changes.
  useFocusEffect(
    useCallback(() => {
      settleActive(scrollY.get());
    }, [settleActive, scrollY]),
  );
  useEffect(() => {
    settleActive(scrollY.get());
  }, [timelineData.offsets, settleActive, scrollY]);

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      dragStartOffset.value = event.contentOffset.y;
    },
    onEndDrag: (event) => {
      const distance = Math.abs(event.contentOffset.y - dragStartOffset.value);
      const speed = Math.abs(event.velocity?.y ?? 0);
      if (distance < snapInterval * SNAP_MIN_DRAG && speed < SNAP_FLICK_VELOCITY) {
        runOnJS(returnToCard)(dragStartOffset.value);
      }
    },
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
      if (Math.abs(event.contentOffset.y - lastSyncOffset.value) > snapInterval * 0.85) {
        lastSyncOffset.value = event.contentOffset.y;
        runOnJS(syncWindow)(event.contentOffset.y);
      }
    },
    // Snapping always ends in momentum, so this is where a card has settled.
    onMomentumEnd: (event) => {
      runOnJS(settleActive)(event.contentOffset.y);
    },
  });

  const renderItem = useCallback(({ item }: { item: TimelineRow }) => {
    if (item.type === 'separator') {
      return <DateSeparator date={item.date} timelineMode={item.mode} />;
    }
    const composition = hydratedRef.current[item.compositionId];
    if (!composition) {
      return <TimelinePlaceholder height={snapInterval} cardHeight={cardHeight} />;
    }
    return (
      <CarouselItem
        item={composition}
        itemOffset={item.offset}
        snapInterval={snapInterval}
        cardHeight={cardHeight}
        scrollY={scrollY}
        updatePositions={updatePositions}
      />
    );
  }, [snapInterval, cardHeight, scrollY, updatePositions]);

  return (
    // Clean background
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AmbientBackdrop />
      <GrainBackground />

      <EdgeTab slot={0} onPress={() => router.push('/profile')} accessibilityLabel="Profile">
        <User size={16} color={theme.text} strokeWidth={2.5} />
        <View style={[styles.notchIndicator, { backgroundColor: theme.accentWarm }]} />
      </EdgeTab>
      <InkGain />

      <FieldGuideTab />

      {(timelineKey !== null || timelineError) && timelineData.items.length === 0 ? (
        <EmptyState />
      ) : timelineData.items.length > 0 ? (
        <Animated.FlatList
          ref={listRef}
          key={settings.timelineMode}
          data={timelineData.items}
          extraData={hydrationVersion}
          inverted={true}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          snapToOffsets={timelineData.offsets}
          decelerationRate="fast"
          disableIntervalMomentum
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
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
      ) : null}

      {/* Floating bottom bar with Date and Add Button */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'android' ? 14 : 0),
          },
        ]}
      >
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
          onSwipeUp={quickCapture.capturePhoto}
          onHold={quickCapture.startRecording}
        />
      </View>

      {/* Quick Record Overlay — shared with the compose record chip */}
      <RecordingOverlay
        visible={quickCapture.isRecording}
        durationMillis={quickCapture.durationMillis}
        onStop={quickCapture.stopRecording}
      />
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
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16, // Space between date and Add Button
  },
  dateText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    color: '#878787',
    minWidth: 200,
    textAlign: 'center',
  },
  notchIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 6,
  },
  carouselItem: {
    justifyContent: 'center',
    paddingHorizontal: 21,
  },
});
