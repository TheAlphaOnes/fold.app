/**
 * MemoryActionsHost — mounted once at the root; renders the hold menu for
 * whichever memory useMemoryActions has open, and carries out each action:
 * share the card as an image, open, edit, file in a story, save the photo
 * or video to the gallery, delete (to Recently Deleted, after confirming).
 */

import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { MemoryActionsTray } from '@/components/memory-actions-tray';
import { MemoryCard } from '@/components/memory-card';
import { StoryPicker } from '@/components/story-picker';
import { useJournalStore } from '@/hooks/use-journal';
import { useMemoryActions } from '@/hooks/use-memory-actions';
import { useSettingsStore } from '@/hooks/use-settings';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { saveToGallery } from '@/services/media-save.service';
import type { Composition } from '@/types/journal';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function subtitleFor(memory: Composition): string {
  const d = new Date(memory.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MemoryActionsHost() {
  const { width } = useWindowDimensions();
  const memory = useMemoryActions((state) => state.memory);
  const options = useMemoryActions((state) => state.options);
  const close = useMemoryActions((state) => state.close);
  const removeComposition = useJournalStore((state) => state.removeComposition);
  const toggleStoryId = useJournalStore((state) => state.toggleStoryId);
  const completeGuideStep = useSettingsStore((state) => state.completeGuideStep);

  // The memory an action is working on, kept after the menu closes.
  const [target, setTarget] = useState<Composition | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pickingStory, setPickingStory] = useState(false);
  const cardRef = useRef<View>(null);

  // Keep the menu's contents while it animates out.
  const [shown, setShown] = useState<Composition | null>(null);
  if (memory && memory !== shown) setShown(memory);
  const current = memory ?? shown;
  const live = useJournalStore((state) => state.compositions.find((c) => c.id === target?.id)) ?? target;

  if (!current) return null;

  const firstMedia = current.mediaElements.find((m) => m.type === 'image' || m.type === 'video');
  const cardHeight = options?.cardHeight ?? 560;
  const onShared = options?.onShared;

  const shareCard = async () => {
    const item = current;
    setTarget(item);
    setCapturing(true);
    try {
      // Let the offscreen card render before capturing it.
      await new Promise((resolve) => setTimeout(resolve, 80));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share Memory Card', mimeType: 'image/png' });
        completeGuideStep('share');
        track('memory_shared', { method: 'card' });
        onShared?.();
      }
    } catch (error) {
      console.error('Failed to share memory card', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const confirmDelete = () => {
    const id = current.id;
    Alert.alert('Delete memory', 'It moves to Recently Deleted, where you can restore it for 30 days.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeComposition(id);
            haptic.success();
          } catch {
            Alert.alert('Couldn’t delete', 'This memory is still saved. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <>
      <MemoryActionsTray
        visible={memory !== null}
        subtitle={subtitleFor(current)}
        canSave={!!firstMedia}
        onClose={close}
        onShare={shareCard}
        onOpen={() => router.push(`/memory/${current.id}`)}
        onEdit={() => router.push({ pathname: '/compose', params: { editId: String(current.id) } })}
        onAddToStory={() => {
          setTarget(current);
          setPickingStory(true);
        }}
        onSave={() => firstMedia && saveToGallery(firstMedia.uri)}
        onDelete={confirmDelete}
      />

      <StoryPicker
        mode="multi"
        visible={pickingStory}
        onClose={() => setPickingStory(false)}
        selectedStoryIds={live?.storyIds ?? []}
        onToggle={async (storyId) => {
          if (live) await toggleStoryId(live.id, storyId);
        }}
      />

      {/* Offscreen copy of the card, captured as the shared image. */}
      {capturing && target && (
        <View style={styles.offscreen} pointerEvents="none">
          <View ref={cardRef} collapsable={false} style={{ width: width - 42, height: cardHeight }}>
            <MemoryCard item={target} height={cardHeight} onUpdatePositions={() => {}} isExporting />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    opacity: 0,
    zIndex: -100,
  },
});
