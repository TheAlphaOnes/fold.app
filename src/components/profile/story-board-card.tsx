/**
 * StoryBoardCard — the profile's row of stories, each shown by a photo
 * from inside it (or its cover), up to five, picked afresh each day.
 *
 * Photos go through expo-image, which decodes them at the 100×140 they are
 * drawn at; React Native's Image decoded full camera photos here.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';
import { Book, ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStoriesStore } from '@/hooks/use-stories';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { pickTiles } from '@/utils/story-tiles';
import { navigate } from '@/utils/navigation';

export function StoryBoardCard() {
  const theme = useTheme();
  const stories = useStoriesStore((state) => state.stories);
  // Kept fresh by the profile cache (useProfileDataSync), so the card
  // never queries on open.

  const tiles = useMemo(() => pickTiles(stories), [stories]);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {tiles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {tiles.map((tile, index) => (
            <Pressable
              key={`${tile.storyId}-${index}`}
              onPress={() => {
                haptic.tap();
                navigate.push(`/stories/${tile.storyId}`);
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

      {/* The name signs the card off, so the card reads as one surface. */}
      <Pressable
        style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
        onPress={() => {
          haptic.tap();
          navigate.push('/stories');
        }}
        accessibilityRole="button"
        accessibilityLabel="Story board"
      >
        <View style={styles.footerLead}>
          <Book size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STORY BOARD</ThemedText>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  footerPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
