/**
 * StoryBoardCard — the profile's row of stories, each shown by a photo
 * from inside it (or its cover), up to five, reshuffled as stories change.
 *
 * Photos go through expo-image, which decodes them at the 100×140 they are
 * drawn at; React Native's Image decoded full camera photos here.
 */

import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Book, ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import type { Story } from '@/types/journal';

const MAX_TILES = 5;

interface StoryTile {
  storyId: number;
  title: string;
  uri: string | null;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => 0.5 - Math.random());
}

/** Up to five tiles: photos from stories first, then stories with none. */
function pickTiles(stories: Story[]): StoryTile[] {
  const withMedia: StoryTile[] = [];
  const empty: StoryTile[] = [];
  for (const story of stories) {
    // Only photos can fill a tile; voice notes and videos have no frame to show here.
    const uris = new Set<string>();
    if (story.coverImageUri) uris.add(story.coverImageUri);
    for (const media of story.sampleMedia ?? []) if (media.type === 'image') uris.add(media.uri);
    if (uris.size === 0) empty.push({ storyId: story.id, title: story.title, uri: null });
    for (const uri of uris) withMedia.push({ storyId: story.id, title: story.title, uri });
  }
  return [...shuffle(withMedia), ...shuffle(empty)].slice(0, MAX_TILES);
}

export function StoryBoardCard() {
  const theme = useTheme();
  const stories = useStoriesStore((state) => state.stories);
  const refreshStories = useStoriesStore((state) => state.refreshStories);
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);

  // On focus, and again whenever the journal changes while focused.
  useFocusEffect(
    useCallback(() => {
      refreshStories().catch((error) => console.error('Failed to load stories', error));
    }, [refreshStories, hydrationVersion]),
  );

  const tiles = useMemo(() => pickTiles(stories), [stories]);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={() => {
          haptic.tap();
          router.push('/stories');
        }}
        accessibilityRole="button"
        accessibilityLabel="Story board"
      >
        <View style={styles.headerLead}>
          <Book size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STORY BOARD</ThemedText>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      {tiles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {tiles.map((tile, index) => (
            <Pressable
              key={`${tile.storyId}-${index}`}
              onPress={() => {
                haptic.tap();
                router.push(`/stories/${tile.storyId}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Story ${tile.title}`}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {tile.uri ? (
                <Image source={{ uri: tile.uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={styles.emptyTile}>
                  <ThemedText style={[styles.emptyMark, { color: theme.textMuted }]}>///</ThemedText>
                </View>
              )}
              <View style={[StyleSheet.absoluteFill, styles.scrim]} />
              <ThemedText style={styles.tileTitle} numberOfLines={1}>
                {tile.title}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  tile: {
    width: 100,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  emptyTile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMark: {
    fontFamily: 'JetBrainsMono-Bold',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tileTitle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: '#fff',
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
