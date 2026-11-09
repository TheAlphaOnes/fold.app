import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert, Share, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share as ShareIcon, Download, Trash2, MapPin, Book, BookPlus, Pencil } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/hooks/use-theme';
import { StoryPicker } from '@/components/story-picker';
import { ageInDays, track } from '@/services/analytics';
import { CloseButton, RoundButton } from '@/components/round-button';
import { haptic } from '@/services/haptics';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { CanvasView } from '@/canvas/render/canvas-view';
import { ExportCanvas, captureExport } from '@/canvas/render/export-canvas';
import { useCanvasOf } from '@/canvas/use-canvas-of';
import { fitCanvas } from '@/canvas/geometry';
import { ShareTray } from '@/components/share-tray';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { DigitalAshOverlay } from '@/components/digital-ash-overlay';
import { goBack } from '@/utils/navigation';
import { saveToGallery } from '@/services/media-save.service';

/**
 * A memory, full screen: its canvas edge to edge, playing (video and
 * audio), with close, edit, story, share, save and delete on top.
 */
export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Search allCompositions (full timeline) first, then fall back to compositions (On-This-Day).
  // This ensures memories from any date resolve, not just today's.
  const numericId = Number(id);
  const composition = useJournalStore(state =>
    state.hydratedById[numericId] ??
    state.allCompositions.find(c => c.id === numericId) ??
    state.compositions.find(c => c.id === numericId) ??
    null
  );
  const ensureComposition = useJournalStore(state => state.ensureComposition);
  const pinComposition = useJournalStore(state => state.pinComposition);
  const unpinComposition = useJournalStore(state => state.unpinComposition);

  React.useEffect(() => {
    if (!Number.isFinite(numericId)) return;
    pinComposition(numericId);
    ensureComposition(numericId);
    return () => unpinComposition(numericId);
  }, [numericId, ensureComposition, pinComposition, unpinComposition]);

  // Once per memory opened: how far back people go when they revisit.
  const openedCreatedAt = composition?.createdAt;
  const trackedOpenRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (openedCreatedAt === undefined || trackedOpenRef.current === numericId) return;
    trackedOpenRef.current = numericId;
    track('memory_opened', { age_days: ageInDays(openedCreatedAt) });
  }, [numericId, openedCreatedAt]);

  useFocusEffect(
    React.useCallback(() => {
      if (!Number.isFinite(numericId)) return;
      ensureComposition(numericId);
      // This memory is the one playing while it's open (its song, its
      // video); the card behind it falls quiet. Restored on the way out.
      const { activeCompositionId: previous, setActiveCompositionId } = useJournalStore.getState();
      setActiveCompositionId(numericId);
      return () => useJournalStore.getState().setActiveCompositionId(previous);
    }, [numericId, ensureComposition])
  );

  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isShareMenuVisible, setIsShareMenuVisible] = useState(false);
  const [isStoryPickerVisible, setIsStoryPickerVisible] = useState(false);

  const { removeComposition, toggleStoryId } = useJournalStore();
  const { stories } = useStoriesStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'It moves to Recently Deleted, where you can restore it for 30 days.',
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
    try {
      await removeComposition(Number(id));
    } catch {
      setIsDeleting(false);
      Alert.alert("COULDN'T DELETE", 'This memory is still saved. Please try again.');
      return;
    }
    goBack();
  };

  const handleSaveMedia = (uri: string) => saveToGallery(uri);

  const hiddenCardRef = useRef<View>(null);
  const [flightKey, setFlightKey] = useState(0);
  const doc = useCanvasOf(composition);
  // The canvas keeps its 9:16 shape (as designed and exported), as wide as the screen allows.
  const fullCanvas = fitCanvas({ width, height });
  // The photo/video "Save" and "Original" act on: the memory's main visual.
  const primaryMedia = composition?.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !m.isGif);

  const captureAndShareCard = async () => {
    try {
      setIsShareMenuVisible(false);
      // The bird carries the card off (700ms hang + 1000ms flight);
      // capturing freezes JS, so wait it out.
      haptic.thud();
      setFlightKey((key) => key + 1);
      await new Promise(resolve => setTimeout(resolve, 1750));
      const uri = await captureExport(hiddenCardRef);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share Memory Card',
          mimeType: 'image/png',
        });
        track('memory_shared', { method: 'card' });
      }
    } catch (e) {
      console.error('Failed to capture memory card:', e);
      Alert.alert('Error', 'Failed to generate image.');
    }
  };

  const shareRawContent = async () => {
    try {
      setIsShareMenuVisible(false);
      if (primaryMedia) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(primaryMedia.uri);
          track('memory_shared', { method: 'raw_media' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      } else if (composition?.textContent.trim()) {
        await Share.share({ message: composition.textContent });
        track('memory_shared', { method: 'raw_text' });
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
      {/* Offscreen 1080×1920 copy, captured when sharing as a card. */}
      <ExportCanvas ref={hiddenCardRef} memory={composition} />

      {/* The memory itself: its canvas, full screen, playing. */}
      {doc && (
        <View style={[styles.stage, { paddingTop: Math.max(0, (height - fullCanvas.height) / 2) }]}>
          <CanvasView doc={doc} memory={composition} width={fullCanvas.width} height={fullCanvas.height} live muted={false} />
        </View>
      )}

      {/* Top Action Bar */}
      <View style={[styles.topActionBar, { top: insets.top + 16 }]}>
        <View style={styles.leftActions}>
          <CloseButton />
        </View>

        <View style={styles.rightActions}>
          <RoundButton
            icon={Pencil}
            accessibilityLabel="Edit memory"
            onPress={() => router.push({ pathname: '/compose', params: { editId: id } })}
          />
          <RoundButton
            icon={(composition?.storyIds?.length ?? 0) > 0 ? Book : BookPlus}
            accessibilityLabel="File in a story"
            onPress={() => setIsStoryPickerVisible(true)}
          />
          <RoundButton icon={ShareIcon} accessibilityLabel="Share memory" onPress={() => setIsShareMenuVisible(true)} />
          {primaryMedia && (
            <RoundButton icon={Download} accessibilityLabel="Save to photos" onPress={() => handleSaveMedia(primaryMedia.uri)} />
          )}
          <RoundButton
            icon={Trash2}
            iconColor={theme.destructive}
            accessibilityLabel="Delete memory"
            onPress={() => {
              haptic.warning();
              handleDelete();
            }}
          />
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
        
      </View>

      {/* Share Tray */}
      <ShareTray
        visible={isShareMenuVisible}
        currentSlideIsMedia={!!primaryMedia}
        onClose={() => setIsShareMenuVisible(false)}
        onExportCanvas={captureAndShareCard}
        onShareOriginal={shareRawContent}
      />

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
      {flightKey > 0 && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9000, justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
          <LogoUploadFlight key={flightKey} />
        </View>
      )}
      {isDeleting && <DigitalAshOverlay color={theme.background} onComplete={finalizeDelete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
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
});
