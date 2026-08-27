import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, FlatList, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { X, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { GrainBackground } from './grain-background';

const KLIPY_API_KEY = 'kiVN0StBmo7SHZgF1HBo5urhdRyAOIswH6H8jpwPbgk349YTxwl9is90oelcNTXE';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

interface KlipyGif {
  id: string;
  title: string;
  file: {
    hd: {
      gif: { url: string; width: number; height: number };
    };
    sm: {
      gif: { url: string; width: number; height: number };
    };
  };
}

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const SPACING = 8;
const ITEM_WIDTH = (screenWidth - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

export function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGifs = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = query.trim() 
        ? `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/search?q=${encodeURIComponent(query)}`
        : `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/trending`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch GIFs');
      const json = await res.json();
      setGifs(json.data || []);
    } catch (err) {
      console.error('Klipy API Error:', err);
      setError('Failed to load GIFs.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trending on mount
  useEffect(() => {
    if (visible && gifs.length === 0) {
      fetchGifs('');
    }
  }, [visible, fetchGifs, gifs.length]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      fetchGifs(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, visible, fetchGifs]);

  const handleSelect = (gif: KlipyGif) => {
    const url = gif.file?.hd?.gif?.url || gif.file?.sm?.gif?.url;
    if (url) {
      onSelect(url);
    }
  };

  const renderItem = ({ item }: { item: KlipyGif }) => {
    const format = item.file?.sm?.gif || item.file?.hd?.gif;
    if (!format || !format.url) return null;
    
    // Calculate aspect ratio height
    const w = format.width || 1;
    const h = format.height || 1;
    const itemHeight = (ITEM_WIDTH * h) / w;

    return (
      <Pressable 
        style={({ pressed }) => [
          styles.gifContainer, 
          { 
            width: ITEM_WIDTH, 
            height: Math.max(100, Math.min(itemHeight, 250)),
            backgroundColor: theme.border,
            opacity: pressed ? 0.7 : 1 
          }
        ]}
        onPress={() => handleSelect(item)}
      >
        <Image 
          source={format.url} 
          style={StyleSheet.absoluteFill} 
          contentFit="cover" 
          transition={200}
        />
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <GrainBackground />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.title, { color: theme.text }]}>SYS.GIF_SEARCH</ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={20}>
            <X size={24} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Search size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="SEARCH MEMES..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <X size={16} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        {loading && gifs.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.text} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText style={{ color: '#FF4B00' }}>{error}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            columnWrapperStyle={styles.columnWrapper}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    height: '100%',
  },
  listContent: {
    padding: SPACING,
  },
  columnWrapper: {
    gap: SPACING,
    marginBottom: SPACING,
  },
  gifContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
