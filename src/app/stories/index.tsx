/**
 * Story Board — every chapter, led by the user's own photos.
 *
 * The chapter touched most recently opens the board as a wide "continue"
 * hero; the rest follow in a two-column grid of photo cards. Search and a
 * visible sort sit under the header. The hero only appears for the default
 * view (recent, no search) so the order on screen always matches the sort.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ArrowLeft, Plus } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { AsciiArt } from '@/components/ascii-art';
import { CreateStoryTray } from '@/components/create-story-tray';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { StoryBoardControls } from '@/components/stories/story-board-controls';
import { StoryGridCard, StoryHeroCard } from '@/components/stories/story-cards';
import { BOOK_ART } from '@/constants/ascii-art';
import { fadeIn, riseIn } from '@/constants/motion';
import { BALANCED_TEXT } from '@/constants/theme';
import { useStoriesStore } from '@/hooks/use-stories';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { searchStories, sortStories, type StorySort } from '@/utils/story-meta';
import type { Story } from '@/types/journal';

const GUTTER = 16;
const GAP = 12;

export default function StoryBoardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stories, refreshStories } = useStoriesStore();

  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StorySort>('recent');

  useFocusEffect(
    useCallback(() => {
      refreshStories();
    }, [refreshStories]),
  );

  const visible = useMemo(() => sortStories(searchStories(stories, query), sort), [stories, query, sort]);
  const showHero = sort === 'recent' && query.trim() === '' && visible.length > 0;
  const hero = showHero ? visible[0] : null;
  const grid = showHero ? visible.slice(1) : visible;

  const totalMemories = useMemo(
    () => stories.reduce((sum, story) => sum + (story.memoryCount ?? 0), 0),
    [stories],
  );

  const openStory = useCallback((story: Story) => router.push(`/stories/${story.id}`), [router]);
  const startCreating = () => {
    haptic.press();
    setIsCreating(true);
  };

  const summary =
    stories.length === 0
      ? 'no chapters yet'
      : `${stories.length} ${stories.length === 1 ? 'chapter' : 'chapters'}  ·  ${totalMemories} ${totalMemories === 1 ? 'memory' : 'memories'}`;

  const header = (
    <View style={styles.listHeader}>
      {stories.length > 0 && (
        <StoryBoardControls query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} />
      )}
      {hero && <StoryHeroCard story={hero} index={0} onPress={openStory} />}
    </View>
  );

  const empty =
    stories.length === 0 ? (
      <View style={styles.empty}>
        <Animated.View entering={fadeIn(400)} style={styles.emptyArt}>
          <AsciiArt art={BOOK_ART} color={theme.textMuted} fontSize={9} />
        </Animated.View>
        <Animated.View entering={riseIn(300, 80)}>
          <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textSecondary }]}>
            chapters gather your memories. a trip, a season, a person.
          </ThemedText>
        </Animated.View>
        <Animated.View entering={riseIn(280, 140)}>
          <ActionLink text="START A CHAPTER" onPress={() => setIsCreating(true)} />
        </Animated.View>
      </View>
    ) : !hero ? (
      <View style={styles.empty}>
        <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textSecondary }]}>
          {`no chapters match "${query.trim()}".`}
        </ThemedText>
        <ActionLink text="CLEAR SEARCH" onPress={() => setQuery('')} />
      </View>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <View style={[styles.header, { paddingTop: insets.top + 12, borderColor: theme.border }]}>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.iconBtn, { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }]}
        >
          <ArrowLeft size={16} color={theme.text} />
        </Pressable>

        <View style={styles.titleBlock}>
          <ThemedText style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            STORY BOARD
          </ThemedText>
          <ThemedText style={[styles.summary, { color: theme.textMuted }]} numberOfLines={1}>
            {summary}
          </ThemedText>
        </View>

        <Pressable
          onPress={startCreating}
          accessibilityRole="button"
          accessibilityLabel="New chapter"
          style={({ pressed }) => [
            styles.iconBtn,
            { borderColor: theme.text, backgroundColor: theme.text, transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Plus size={16} color={theme.background} strokeWidth={3} />
        </Pressable>
      </View>

      <FlatList
        data={grid}
        keyExtractor={(story) => String(story.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => <StoryGridCard story={item} index={index + (hero ? 1 : 0)} onPress={openStory} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />

      {isCreating && <CreateStoryTray onClose={() => setIsCreating(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: GUTTER,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 2,
  },
  summary: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: GUTTER,
    paddingTop: GUTTER,
    gap: GAP,
  },
  listHeader: {
    gap: GAP + 4,
    marginBottom: GAP,
  },
  row: {
    gap: GAP,
  },
  empty: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 72,
    paddingHorizontal: 24,
  },
  emptyArt: {
    opacity: 0.6,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
