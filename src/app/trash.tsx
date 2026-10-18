/**
 * Recently Deleted — deleted memories wait here for 30 days before they are
 * removed for good. Each can be restored exactly (story links included) or
 * deleted now; the whole bin can be emptied. Anything permanent asks first.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic, Trash2 } from 'lucide-react-native';

import { AsciiArt } from '@/components/ascii-art';
import { GrainBackground } from '@/components/grain-background';
import { HeaderIconButton, ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BIN_ART } from '@/constants/ascii-art';
import { fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { BALANCED_TEXT } from '@/constants/theme';
import { getTrashedCompositions } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import { TRASH_DAYS, daysLeftInTrash, emptyTrash, purgeMemories } from '@/services/trash.service';
import { getHighResArtwork } from '@/utils/media-attach';
import { isGifMedia } from '@/utils/media-kind';
import { memoryTextMetrics } from '@/utils/memory-text';
import type { Composition } from '@/types/journal';

const THUMB = 56;
const DAY_MS = 24 * 60 * 60 * 1000;

function titleOf(memory: Composition): string {
  const firstLine = memory.textContent.trim().split('\n')[0];
  if (firstLine) return firstLine;
  const music = memory.mediaElements.find((m) => m.type === 'audio' && m.metadata);
  if (music?.metadata) return music.metadata.title;
  if (memory.mediaElements.some((m) => m.type === 'video')) return 'Video';
  if (memory.mediaElements.some((m) => m.type === 'image')) return 'Photo';
  return 'Voice note';
}

function deletedAgo(deletedAt: number, now: number): string {
  const days = Math.floor((now - deletedAt) / DAY_MS);
  if (days <= 0) return 'today';
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function Thumb({ memory }: { memory: Composition }) {
  const theme = useTheme();
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const music = memory.mediaElements.find((m) => m.type === 'audio' && m.metadata);
  const uri = visual ? (visual.type === 'video' ? videoThumb : visual.uri) : getHighResArtwork(music?.metadata?.artwork);
  const words = memory.textContent.trim();

  return (
    <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      ) : words ? (
        <ThemedText
          numberOfLines={3}
          style={{
            ...memoryTextMetrics(memory.fontFamily, 8),
            fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
            color: memory.textColor ?? theme.text,
            textAlign: 'center',
            paddingHorizontal: 4,
          }}
        >
          {words}
        </ThemedText>
      ) : (
        <Mic size={18} color={theme.accentWarm} />
      )}
    </View>
  );
}

function TrashRow({
  memory,
  now,
  onRestore,
  onDelete,
}: {
  memory: Composition;
  /** One timestamp per load, so every row counts days from the same moment. */
  now: number;
  onRestore: (memory: Composition) => void;
  onDelete: (memory: Composition) => void;
}) {
  const theme = useTheme();
  const deletedAt = memory.deletedAt ?? now;
  const left = daysLeftInTrash(deletedAt, now);
  const urgent = left <= 3;

  return (
    <Animated.View
      entering={fadeIn(220)}
      exiting={fadeOut()}
      layout={LinearTransition.duration(220)}
      style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
    >
      <Thumb memory={memory} />
      <View style={styles.rowBody}>
        <ThemedText style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {titleOf(memory)}
        </ThemedText>
        <ThemedText style={[styles.rowMeta, { color: urgent ? theme.accentWarm : theme.textMuted }]} numberOfLines={1}>
          {`${deletedAgo(deletedAt, now)} · ${left === 1 ? '1 day left' : `${left} days left`}`}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => onRestore(memory)}
        accessibilityRole="button"
        accessibilityLabel={`Restore ${titleOf(memory)}`}
        style={({ pressed }) => [
          styles.restore,
          { borderColor: theme.text, transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText style={[styles.restoreText, { color: theme.text }]}>RESTORE</ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onDelete(memory)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${titleOf(memory)} now`}
        style={({ pressed }) => [styles.deleteNow, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Trash2 size={16} color={theme.destructive} />
      </Pressable>
    </Animated.View>
  );
}

export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const restoreComposition = useJournalStore((state) => state.restoreComposition);
  const [items, setItems] = useState<Composition[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    try {
      const trashed = await getTrashedCompositions();
      setNow(Date.now());
      setItems(trashed);
    } catch (error) {
      console.error('Failed to load Recently Deleted', error);
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const restore = async (memory: Composition) => {
    setItems((current) => current?.filter((m) => m.id !== memory.id) ?? null);
    try {
      await restoreComposition(memory.id);
      haptic.success();
    } catch (error) {
      console.error('Failed to restore memory', error);
      haptic.error();
      Alert.alert("COULDN'T RESTORE", 'Please try again.');
      reload();
    }
  };

  const deleteNow = (memory: Composition) => {
    haptic.warning();
    Alert.alert('DELETE FOREVER?', "This memory and its photos and audio will be gone. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setItems((current) => current?.filter((m) => m.id !== memory.id) ?? null);
          try {
            await purgeMemories([memory]);
          } catch (error) {
            console.error('Failed to delete memory permanently', error);
            Alert.alert("COULDN'T DELETE", 'Please try again.');
            reload();
          }
        },
      },
    ]);
  };

  const confirmEmpty = () => {
    haptic.warning();
    Alert.alert('EMPTY RECENTLY DELETED?', `All ${items?.length ?? 0} memories here will be gone for good. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Empty',
        style: 'destructive',
        onPress: async () => {
          setItems([]);
          try {
            await emptyTrash();
          } catch (error) {
            console.error('Failed to empty Recently Deleted', error);
            Alert.alert("COULDN'T EMPTY", 'Please try again.');
            reload();
          }
        },
      },
    ]);
  };

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      <ScreenHeader
        title="Recently Deleted"
        actions={
          hasItems
            ? [<HeaderIconButton key="empty" icon={Trash2} tone="danger" onPress={confirmEmpty} accessibilityLabel="Empty Recently Deleted" />]
            : []
        }
      />

      {items === null ? null : hasItems ? (
        <Animated.FlatList
          data={items}
          keyExtractor={(memory) => String(memory.id)}
          renderItem={({ item }) => <TrashRow memory={item} now={now} onRestore={restore} onDelete={deleteNow} />}
          itemLayoutAnimation={LinearTransition.duration(220)}
          ListHeaderComponent={
            <ThemedText {...BALANCED_TEXT} style={[styles.note, { color: theme.textMuted }]}>
              {`memories wait here for ${TRASH_DAYS} days, then they're deleted for good.`}
            </ThemedText>
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.empty}>
          <Animated.View entering={fadeIn(400)} style={styles.emptyArt}>
            <AsciiArt art={BIN_ART} color={theme.textMuted} fontSize={12} />
          </Animated.View>
          <Animated.View entering={riseIn(300, 80)}>
            <ThemedText {...BALANCED_TEXT} style={[styles.note, { color: theme.textSecondary }]}>
              {`nothing here.\nwhat you delete waits ${TRASH_DAYS} days.`}
            </ThemedText>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  note: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  restore: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  deleteNow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyArt: {
    opacity: 0.6,
  },
});
