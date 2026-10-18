/**
 * Recently Deleted — deleted memories wait here for 30 days before they are
 * removed for good.
 *
 * Layout: a count summary, then a two-column grid of the deleted memories in
 * the Story Board card style (cover, countdown badge, caption below), and a
 * fixed action bar with RESTORE ALL and EMPTY BIN. Tapping a card offers
 * Restore or Delete forever. Anything permanent asks first.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic, RotateCcw, Trash2 } from 'lucide-react-native';

import { AsciiArt } from '@/components/ascii-art';
import { GrainBackground } from '@/components/grain-background';
import { ScreenHeader } from '@/components/screen-header';
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

const GUTTER = 16;
const GAP = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STAGGER = 8;

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
  if (days <= 0) return 'deleted today';
  return days === 1 ? 'deleted yesterday' : `deleted ${days} days ago`;
}

function Cover({ memory }: { memory: Composition }) {
  const theme = useTheme();
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const music = memory.mediaElements.find((m) => m.type === 'audio' && m.metadata);
  const uri = visual ? (visual.type === 'video' ? videoThumb : visual.uri) : getHighResArtwork(music?.metadata?.artwork);
  const words = memory.textContent.trim();

  if (uri) {
    return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />;
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.coverFace, { backgroundColor: theme.backgroundElement }]}>
      {words ? (
        <ThemedText
          {...BALANCED_TEXT}
          numberOfLines={6}
          style={{
            ...memoryTextMetrics(memory.fontFamily, 13),
            fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
            color: memory.textColor ?? theme.text,
            textAlign: 'center',
          }}
        >
          {words}
        </ThemedText>
      ) : (
        <Mic size={22} color={theme.accentWarm} />
      )}
    </View>
  );
}

interface CardProps {
  memory: Composition;
  index: number;
  width: number;
  now: number;
  onPress: (memory: Composition) => void;
}

function DeletedCard({ memory, index, width, now, onPress }: CardProps) {
  const theme = useTheme();
  const deletedAt = memory.deletedAt ?? now;
  const left = daysLeftInTrash(deletedAt, now);
  const urgent = left <= 3;

  return (
    <Animated.View
      entering={riseIn(300, Math.min(index, MAX_STAGGER) * 40, 12)}
      exiting={fadeOut()}
      layout={LinearTransition.duration(240)}
      style={{ width }}
    >
      <Pressable
        onPress={() => onPress(memory)}
        accessibilityRole="button"
        accessibilityLabel={`${titleOf(memory)}, ${left} days left. Restore or delete.`}
        style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.cover, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
          <Cover memory={memory} />
          <View
            style={[styles.badge, { backgroundColor: urgent ? theme.accentWarm : 'rgba(0,0,0,0.55)' }]}
            pointerEvents="none"
          >
            <ThemedText style={styles.badgeText}>{left === 1 ? '1 DAY' : `${left} DAYS`}</ThemedText>
          </View>
        </View>
        <View style={styles.caption}>
          <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {titleOf(memory)}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {deletedAgo(deletedAt, now)}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - GUTTER * 2 - GAP) / 2;
  const restoreComposition = useJournalStore((state) => state.restoreComposition);
  const restoreAll = useJournalStore((state) => state.restoreAllCompositions);
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

  const without = (id: number) => setItems((current) => current?.filter((m) => m.id !== id) ?? null);

  const restore = async (memory: Composition) => {
    without(memory.id);
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

  const deleteForever = (memory: Composition) => {
    haptic.warning();
    Alert.alert('DELETE FOREVER?', "This memory and its photos and audio will be gone. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          without(memory.id);
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

  const openActions = (memory: Composition) => {
    haptic.tap();
    Alert.alert(titleOf(memory).toUpperCase(), `${daysLeftInTrash(memory.deletedAt ?? now, now)} days until it's deleted for good.`, [
      { text: 'Restore', onPress: () => restore(memory) },
      { text: 'Delete forever', style: 'destructive', onPress: () => deleteForever(memory) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmRestoreAll = async () => {
    haptic.press();
    setItems([]);
    try {
      await restoreAll();
      haptic.success();
    } catch (error) {
      console.error('Failed to restore all memories', error);
      Alert.alert("COULDN'T RESTORE", 'Please try again.');
      reload();
    }
  };

  const confirmEmpty = () => {
    haptic.warning();
    const count = items?.length ?? 0;
    Alert.alert(
      'EMPTY RECENTLY DELETED?',
      `${count === 1 ? 'This memory' : `All ${count} memories`} and their photos and audio will be gone for good. This can't be undone.`,
      [
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
      ],
    );
  };

  const count = items?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      <ScreenHeader title="Recently Deleted" />

      {items === null ? null : count > 0 ? (
        <>
          <Animated.FlatList
            data={items}
            keyExtractor={(memory) => String(memory.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={({ item, index }) => (
              <DeletedCard memory={item} index={index} width={columnWidth} now={now} onPress={openActions} />
            )}
            itemLayoutAnimation={LinearTransition.duration(240)}
            ListHeaderComponent={
              <Animated.View entering={fadeIn(260)} style={[styles.summary, { borderColor: theme.border }]}>
                <View style={styles.summaryCount}>
                  <ThemedText style={[styles.countNumber, { color: theme.text }]}>
                    {String(count).padStart(2, '0')}
                  </ThemedText>
                  <ThemedText style={[styles.countLabel, { color: theme.textMuted }]}>
                    {count === 1 ? 'memory waiting' : 'memories waiting'}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.summaryNote, { color: theme.textMuted }]} numberOfLines={1}>
                  {`auto-deletes in ${TRASH_DAYS} days`}
                </ThemedText>
              </Animated.View>
            }
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
          />

          <Animated.View
            entering={riseIn(300, 160, 16)}
            style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.background }]}
          >
            {/* Same chip language as the rest of the app (compose story chip,
                header buttons): card surface, hairline border, mono caps. */}
            <Pressable
              onPress={confirmRestoreAll}
              accessibilityRole="button"
              accessibilityLabel="Restore all memories"
              style={({ pressed }) => [
                styles.barButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <RotateCcw size={14} color={theme.text} />
              <ThemedText style={[styles.barText, { color: theme.text }]}>RESTORE ALL</ThemedText>
            </Pressable>
            <Pressable
              onPress={confirmEmpty}
              accessibilityRole="button"
              accessibilityLabel="Empty Recently Deleted"
              style={({ pressed }) => [
                styles.barButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Trash2 size={14} color={theme.destructive} />
              <ThemedText style={[styles.barText, { color: theme.destructive }]}>EMPTY BIN</ThemedText>
            </Pressable>
          </Animated.View>
        </>
      ) : (
        <View style={styles.empty}>
          <Animated.View entering={fadeIn(400)} style={styles.emptyArt}>
            <AsciiArt art={BIN_ART} color={theme.textMuted} fontSize={12} />
          </Animated.View>
          <Animated.View entering={riseIn(300, 80)}>
            <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textSecondary }]}>
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
    paddingHorizontal: GUTTER,
    paddingTop: 8,
  },
  row: {
    gap: GAP,
    marginBottom: 20,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  countNumber: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  countLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  summaryNote: {
    flexShrink: 1,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
  },
  card: {
    gap: 10,
  },
  cover: {
    aspectRatio: 0.8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverFace: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  caption: {
    gap: 3,
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
  },
  barButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
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
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
