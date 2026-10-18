/**
 * Story Board — every chapter, led by the user's own photos.
 *
 * A two-column grid of chapter cards — photo mosaic cover, caption below.
 * Search and a visible, labelled sort sit under the header.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { AsciiArt } from '@/components/ascii-art';
import { CreateStoryTray } from '@/components/create-story-tray';
import { GrainBackground } from '@/components/grain-background';
import { HeaderIconButton, ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { StoryBoardControls } from '@/components/stories/story-board-controls';
import { StoryGridCard } from '@/components/stories/story-cards';
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
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - GUTTER * 2 - GAP) / 2;
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

  const totalMemories = useMemo(
    () => stories.reduce((sum, story) => sum + (story.memoryCount ?? 0), 0),
    [stories],
  );

  const openStory = useCallback((story: Story) => router.push(`/stories/${story.id}`), [router]);
  const startCreating = () => setIsCreating(true);

  const summary =
    stories.length === 0
      ? 'no chapters yet'
      : `${stories.length} ${stories.length === 1 ? 'chapter' : 'chapters'}  ·  ${totalMemories} ${totalMemories === 1 ? 'memory' : 'memories'}`;

  const header = (
    <View style={styles.listHeader}>
      {stories.length > 0 && (
        <StoryBoardControls query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} />
      )}
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
    ) : (
      <View style={styles.empty}>
        <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textSecondary }]}>
          {`no chapters match "${query.trim()}".`}
        </ThemedText>
        <ActionLink text="CLEAR SEARCH" onPress={() => setQuery('')} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <ScreenHeader
        title="Story Board"
        subtitle={summary}
        divider
        actions={<HeaderIconButton icon={Plus} tone="primary" onPress={startCreating} accessibilityLabel="New chapter" />}
      />

      <FlatList
        data={visible}
        keyExtractor={(story) => String(story.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <StoryGridCard story={item} index={index} width={columnWidth} onPress={openStory} />
        )}
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
  list: {
    paddingHorizontal: GUTTER,
    paddingTop: GUTTER,
  },
  listHeader: {
    marginBottom: GAP + 8,
  },
  row: {
    gap: GAP,
    marginBottom: 20,
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
