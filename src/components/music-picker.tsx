import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Search, Music, Heart } from 'lucide-react-native';

import { useAudioPlayer } from 'expo-audio';

import { useMusicStore, type MusicTrack } from '@/hooks/use-music-store';
import { searchSongs } from '@/music/itunes';
import type { CanvasContext } from '@/music/recommend';
import { useRecommendations } from '@/music/use-recommendations';
import { getHighResArtwork } from '@/utils/media-attach';
import { useAudioFocus } from '@/hooks/use-audio-focus';
import { CloseButton } from '@/components/round-button';


function TrackPreviewPlayer({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  const claimAudio = useAudioFocus(() => player.pause());
  useEffect(() => {
    // Previewing a song silences anything else, like a card on the timeline.
    claimAudio();
    player.play();
    return () => {
      try {
        player.pause();
      } catch (e) {
        // Ignored: The native shared object might have already been released
      }
    };
  }, [player, claimAudio]);
  return null;
}

interface MusicPickerProps {
  visible: boolean;
  onClose: () => void;
  /** Called as soon as a track is chosen; the caller downloads it in the background. */
  onSelect: (track: MusicTrack) => void;
  /** What the memory says about itself, so the opening list fits it. */
  context: CanvasContext;
}

const PAGE_SIZE = 25;

export function MusicPicker({ visible, onClose, onSelect, context }: MusicPickerProps) {
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [previewingTrack, setPreviewingTrack] = useState<MusicTrack | null>(null);

  // Guards the search against stale responses: a slow fetch for an old term
  // must not overwrite the results of a newer one.
  const searchRequestRef = useRef(0);

  const { savedTracks, initialized, init, saveTrack, removeTrack, addRecentSearch, recordPick } = useMusicStore();
  const recommended = useRecommendations(visible, context);
  const searching = query.trim().length >= 2;

  useEffect(() => {
    void init();
  }, [init]);

  // A closed picker starts fresh next time (adjusted while rendering, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setPreviewingTrack(null);
      setQuery('');
      setResults([]);
      setHasMore(true);
      setActiveTab('search');
    }
  }

  // Typing searches, a beat after the last key.
  useEffect(() => {
    if (!visible || !searching) return undefined;
    const requestId = ++searchRequestRef.current;
    const term = query.trim();
    const timeout = setTimeout(async () => {
      setLoading(true);
      const tracks = await searchSongs(term, { limit: PAGE_SIZE });
      if (searchRequestRef.current !== requestId) return;
      setResults(tracks);
      setHasMore(tracks.length > 0);
      setLoading(false);
    }, 450);
    return () => clearTimeout(timeout);
  }, [query, visible, searching]);

  const loadMore = async () => {
    // Only a typed search pages; the Saved tab and the opening mix are whole.
    if (activeTab !== 'search' || !searching || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const more = await searchSongs(query.trim(), { limit: PAGE_SIZE, offset: results.length });
    setResults((prev) => Array.from(new Map([...prev, ...more].map((t) => [t.trackId, t])).values()));
    setHasMore(more.length > 0);
    setLoadingMore(false);
  };

  // Choosing hands the track straight back and closes: the download happens
  // in the compose screen, in the background, so the choice feels instant.
  const handleSelect = (track: MusicTrack) => {
    if (searching) void addRecentSearch(query.trim());
    void recordPick(track);
    setPreviewingTrack(null);
    onSelect(track);
    onClose();
  };

  const list = activeTab === 'saved' ? savedTracks : searching ? results : recommended.tracks;
  const busy = activeTab === 'search' && (searching ? loading : recommended.loading) && list.length === 0;

  const handleRowPress = (track: MusicTrack) => {
    if (previewingTrack?.trackId === track.trackId) {
      setPreviewingTrack(null); // Stop preview
    } else {
      setPreviewingTrack(track); // Start preview
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Music</Text>
          <CloseButton onPress={onClose} />
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search artists, songs..."
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          <Pressable style={[styles.tab, activeTab === 'search' && { borderBottomColor: theme.text }]} onPress={() => setActiveTab('search')}>
            <Text style={[styles.tabText, { color: activeTab === 'search' ? theme.text : theme.textMuted }]}>Discover</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'saved' && { borderBottomColor: theme.text }]} onPress={() => setActiveTab('saved')}>
            <Text style={[styles.tabText, { color: activeTab === 'saved' ? theme.text : theme.textMuted }]}>Saved</Text>
          </Pressable>
        </View>

        {busy ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.text} />
        ) : activeTab === 'saved' && !initialized ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.text} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={item => item.trackId.toString()}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              activeTab === 'search' && !searching && list.length > 0 ? (
                <Text style={[styles.forYou, { color: theme.textMuted }]}>{`FOR THIS MEMORY · ${recommended.mood.toUpperCase()}`}</Text>
              ) : undefined
            }
            renderItem={({ item }) => {
              const isPreviewing = previewingTrack?.trackId === item.trackId;

              return (
                <Pressable 
                  style={({ pressed }) => [styles.trackItem, { backgroundColor: pressed || isPreviewing ? 'rgba(0,0,0,0.03)' : 'transparent' }]}
                  onPress={() => handleRowPress(item)}
                >
                  <View style={styles.artworkContainer}>
                    <Image source={{ uri: getHighResArtwork(item.artworkUrl100) }} style={styles.artwork} />
                    {isPreviewing && (
                      <View style={styles.playingOverlay}>
                        <Music size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackName, { color: theme.text }]} numberOfLines={1}>
                      {item.trackName}
                    </Text>
                    <Text style={[styles.artistName, { color: theme.textMuted }]} numberOfLines={1}>
                      {item.artistName}
                    </Text>
                  </View>
                  
                  <View style={styles.actionContainer}>
                    {!isPreviewing && (
                      <Pressable 
                        style={styles.saveBtn}
                        onPress={() => savedTracks.some(t => t.trackId === item.trackId) ? removeTrack(item.trackId) : saveTrack(item)}
                        hitSlop={15}
                      >
                        <Heart 
                          size={20} 
                          color={theme.text} 
                          fill={savedTracks.some(t => t.trackId === item.trackId) ? theme.text : 'transparent'} 
                        />
                      </Pressable>
                    )}
                    {isPreviewing ? (
                      <Pressable 
                        style={[styles.chooseButton, { backgroundColor: theme.text }]}
                        onPress={() => handleSelect(item)}
                      >
                        <Text style={[styles.chooseButtonText, { color: theme.background }]}>Choose</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={() => {
              if (activeTab === 'saved') {
                return <Text style={[styles.emptyText, { color: theme.textMuted }]}>No saved music yet{'\n'}Tap the heart on any song</Text>;
              }
              return query.length > 2 && !loading ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No songs found</Text>
              ) : null;
            }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              loadingMore ? (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator color={theme.text} />
                </View>
              ) : null
            )}
          />
        )}

        {previewingTrack && <TrackPreviewPlayer url={previewingTrack.previewUrl} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  forYou: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    height: '100%',
  },
  list: {
    paddingTop: 0,
    paddingBottom: 40,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  artworkContainer: {
    width: 56,
    height: 56,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  trackName: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
  },
  artistName: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
  },
  actionSlot: {
    width: 70,
    alignItems: 'flex-end',
  },
  chooseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
  },
  chooseButtonText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
