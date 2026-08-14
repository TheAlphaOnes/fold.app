import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Search, X, Music } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

import { useAudioPlayer } from 'expo-audio';
import * as Localization from 'expo-localization';

export interface MusicTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

function TrackPreviewPlayer({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  useEffect(() => {
    player.play();
    return () => {
      try {
        player.pause();
      } catch (e) {
        // Ignored: The native shared object might have already been released
      }
    };
  }, [player]);
  return null;
}

interface MusicPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (localUri: string, track: MusicTrack) => Promise<void>;
}

export function MusicPicker({ visible, onClose, onSelect }: MusicPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [previewingTrack, setPreviewingTrack] = useState<MusicTrack | null>(null);

  // Debounced search
  useEffect(() => {
    if (!visible) {
      setPreviewingTrack(null);
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const country = Localization.getLocales()[0]?.regionCode || 'US';
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15&country=${country}`);
        const data = await response.json();
        setResults(data.results.filter((t: any) => t.previewUrl)); // Only tracks with previews
      } catch (e) {
        console.error('Failed to search music', e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = async (track: MusicTrack) => {
    if (downloading) return;
    setDownloading(track.trackId);
    try {
      const ext = track.previewUrl.split('?')[0].split('.').pop() || 'm4a';
      const dest = `${FileSystem.documentDirectory}music_${track.trackId}_${Date.now()}.${ext}`;
      
      const { uri } = await FileSystem.downloadAsync(track.previewUrl, dest);
      await onSelect(uri, track);
      onClose(); // Automatically close after selection
    } catch (e) {
      console.error('Failed to download preview', e);
    } finally {
      setDownloading(null);
    }
  };

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
          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.border }]}>
            <X size={18} color={theme.text} />
          </Pressable>
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

        {loading && results.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.text} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.trackId.toString()}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isPreviewing = previewingTrack?.trackId === item.trackId;
              const isDownloading = downloading === item.trackId;

              return (
                <Pressable 
                  style={({ pressed }) => [styles.trackItem, { backgroundColor: pressed || isPreviewing ? 'rgba(0,0,0,0.03)' : 'transparent' }]}
                  onPress={() => handleRowPress(item)}
                >
                  <View style={styles.artworkContainer}>
                    <Image source={{ uri: item.artworkUrl100 }} style={styles.artwork} />
                    {isPreviewing && !isDownloading && (
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
                  
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={theme.textMuted} style={styles.actionSlot} />
                  ) : isPreviewing ? (
                    <Pressable 
                      style={[styles.chooseButton, { backgroundColor: theme.text }]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[styles.chooseButtonText, { color: theme.background }]}>Choose</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={() => (
              query.length > 2 && !loading ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No songs found</Text>
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
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});
