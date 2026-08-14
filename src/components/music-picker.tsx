import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Search, X, Music } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

export interface MusicTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
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

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.searchContainer}>
            <Search size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search music..."
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={theme.text} />
          </Pressable>
        </View>

        {loading && results.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.text} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.trackId.toString()}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable 
                style={({ pressed }) => [styles.trackItem, { backgroundColor: pressed ? theme.border : 'transparent' }]}
                onPress={() => handleSelect(item)}
              >
                <Image source={{ uri: item.artworkUrl100 }} style={styles.artwork} />
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackName, { color: theme.text }]} numberOfLines={1}>
                    {item.trackName}
                  </Text>
                  <Text style={[styles.artistName, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.artistName}
                  </Text>
                </View>
                {downloading === item.trackId ? (
                  <ActivityIndicator size="small" color={theme.textMuted} />
                ) : (
                  <Music size={16} color={theme.textMuted} style={{ opacity: 0.5 }} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={() => (
              query.length > 2 && !loading ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No songs found</Text>
              ) : null
            )}
          />
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    height: '100%',
  },
  closeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  trackName: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 15,
  },
  artistName: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
  }
});
