import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Image, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, ArrowLeft, ChevronRight, ArrowUpDown, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';

function StoryThumbnail({ media, style }: { media: { uri: string; type: string }; style: any }) {
  const isVideo = media.type === 'video';
  const videoThumb = useVideoThumbnail(isVideo ? media.uri : undefined);
  const sourceUri = isVideo && videoThumb ? videoThumb : media.uri;

  return (
    <Image 
      source={{ uri: sourceUri }} 
      style={style} 
      resizeMode="cover"
    />
  );
}

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { GrainBackground } from '@/components/grain-background';
import { useStoriesStore } from '@/hooks/use-stories';
import type { Story } from '@/types/journal';

export default function StoryBoardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { stories, refreshStories, addStory } = useStoriesStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  type SortOption = 'updated_desc' | 'updated_asc' | 'alpha_asc' | 'alpha_desc';
  type FilterOption = 'all' | 'month' | 'year';
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const filteredStories = React.useMemo(() => {
    let filtered = [...stories];
    
    if (filterBy === 'month') {
       const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
       filtered = filtered.filter(s => s.updatedAt > monthAgo);
    } else if (filterBy === 'year') {
       const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
       filtered = filtered.filter(s => s.updatedAt > yearAgo);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'updated_desc') return b.updatedAt - a.updatedAt;
      if (sortBy === 'updated_asc') return a.updatedAt - b.updatedAt;
      if (sortBy === 'alpha_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'alpha_desc') return b.title.localeCompare(a.title);
      return 0;
    });

    return filtered;
  }, [stories, sortBy, filterBy]);

  useEffect(() => {
    refreshStories();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setIsCreating(false);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const story = await addStory({ title: newTitle.trim() });
    setNewTitle('');
    setIsCreating(false);
    Keyboard.dismiss();
    
    // Jump straight into the new story
    router.push(`/stories/${story.id}`);
  };

  const renderItem = ({ item }: { item: Story }) => {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(item.updatedAt));

    return (
      <Pressable 
        style={({pressed}) => [
          styles.storyCard,
          { 
            backgroundColor: pressed ? theme.backgroundElement : theme.backgroundElement, // Keep subtle bg
            borderColor: theme.border,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/stories/${item.id}`);
        }}
      >
        <View style={styles.coverPlaceholder}>
          {item.coverImageUri ? (
            <Image source={{ uri: item.coverImageUri }} style={styles.coverImage} />
          ) : item.sampleMedia && item.sampleMedia.length > 0 ? (
            item.sampleMedia.slice(0, 3).reverse().map((media, i, arr) => {
              const origIdx = arr.length - 1 - i;
              
              const rotations = ['-2deg', '-12deg', '10deg'];
              const scales = [1, 0.95, 0.9];
              const topOffsets = [0, -4, 4];
              const leftOffsets = [0, -8, 8];
              
              return (
                <StoryThumbnail 
                  key={media.uri + i} 
                  media={media} 
                  style={[
                    styles.sampleSticker, 
                    { 
                      transform: [
                        { translateX: leftOffsets[origIdx] },
                        { translateY: topOffsets[origIdx] },
                        { rotate: rotations[origIdx] },
                        { scale: scales[origIdx] }
                      ], 
                      borderColor: theme.border,
                      borderWidth: 1.5,
                      zIndex: i
                    }
                  ]} 
                />
              );
            })
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
              <ThemedText style={{ color: theme.textMuted, fontFamily: 'JetBrainsMono-Bold' }}>///</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <ThemedText style={[styles.storyTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <View style={styles.cardMeta}>
            <ThemedText style={[styles.storyDate, { color: theme.textMuted }]}>
              {formattedDate}
            </ThemedText>
          </View>
        </View>
        
        <ChevronRight size={20} color={theme.textMuted} style={styles.chevron} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Pressable 
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconBtn, 
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <ArrowLeft size={16} color={theme.text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            STORY BOARD
          </ThemedText>
        </View>

        {!isCreating && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {(filterBy !== 'all' || sortBy !== 'updated_desc') && (
              <ThemedText style={{ fontSize: 10, color: theme.accentWarm, fontFamily: 'JetBrainsMono-Bold', marginRight: 4 }}>
                {filterBy !== 'all' ? (filterBy === 'month' ? '30D' : '1Y') : ''}
                {filterBy !== 'all' && sortBy !== 'updated_desc' ? ' • ' : ''}
                {sortBy !== 'updated_desc' ? (
                  sortBy === 'updated_asc' ? 'OLD' :
                  sortBy === 'alpha_asc' ? 'A-Z' :
                  'Z-A'
                ) : ''}
              </ThemedText>
            )}

            <Pressable 
              onPress={() => {
                Haptics.selectionAsync();
                setFilterBy(prev => prev === 'all' ? 'month' : prev === 'month' ? 'year' : 'all');
              }}
              style={({ pressed }) => [
                { opacity: pressed ? 0.5 : 1 }
              ]}
            >
              <Filter size={20} color={filterBy !== 'all' ? theme.accentWarm : theme.text} strokeWidth={2.5} />
            </Pressable>

            <Pressable 
              onPress={() => {
                Haptics.selectionAsync();
                setSortBy(prev => {
                  if (prev === 'updated_desc') return 'updated_asc';
                  if (prev === 'updated_asc') return 'alpha_asc';
                  if (prev === 'alpha_asc') return 'alpha_desc';
                  return 'updated_desc';
                });
              }}
              style={({ pressed }) => [
                { opacity: pressed ? 0.5 : 1 }
              ]}
            >
              <ArrowUpDown size={20} color={sortBy !== 'updated_desc' ? theme.accentWarm : theme.text} strokeWidth={2.5} />
            </Pressable>

            <Pressable 
              onPress={() => setIsCreating(true)}
              style={({ pressed }) => [
                styles.iconBtn, 
                { borderColor: theme.border, opacity: pressed ? 0.5 : 1, backgroundColor: theme.text }
              ]}
            >
              <Plus size={16} color={theme.background} strokeWidth={3} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Create Mode Inline */}
      {isCreating && (
        <View style={[styles.createSection, { borderBottomColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="STORY.TITLE..."
            placeholderTextColor={theme.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Pressable onPress={() => setIsCreating(false)} style={styles.cancelBtn}>
            <X size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Empty State */}
      {stories.length === 0 && !isCreating ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            NO STORIES FOUND.
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: theme.textMuted, opacity: 0.5 }]}>
            Create a story to group memories.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 18,
    letterSpacing: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  coverImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sampleSticker: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#333',
  },
  cardContent: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  storyTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    marginBottom: 4,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyDate: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 16,
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
  }
});
