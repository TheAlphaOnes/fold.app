import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, FlatList, Dimensions, KeyboardAvoidingView, Platform, Keyboard, Text } from 'react-native';
import { Image } from 'expo-image';
import { X, Search, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { GrainBackground } from './grain-background';
import { useGifStore } from '@/hooks/use-gif-store';

const KLIPY_API_KEY = 'kiVN0StBmo7SHZgF1HBo5urhdRyAOIswH6H8jpwPbgk349YTxwl9is90oelcNTXE';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

interface KlipyGif {
  id: string | number;
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
  
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { savedGifs, saveGif, removeGif } = useGifStore();

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
      setGifs(json.result?.data || []);
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
    if (!visible || activeTab === 'saved') return;
    const timer = setTimeout(() => {
      fetchGifs(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, visible, fetchGifs, activeTab]);

  const handleSelect = (url: string) => {
    if (url) {
      onSelect(url);
    }
  };

  const toggleSave = (gif: KlipyGif) => {
    const format = gif.file?.hd?.gif || gif.file?.sm?.gif;
    if (!format || !format.url) return;
    
    const id = gif.id.toString();
    const isSaved = savedGifs.some(g => g.id === id);
    if (isSaved) {
      removeGif(id);
    } else {
      saveGif({
        id,
        url: format.url,
        width: format.width || 1,
        height: format.height || 1,
        title: gif.title || "GIF"
      });
    }
  };

  const renderDiscoverItem = ({ item }: { item: KlipyGif }) => {
    const format = item.file?.sm?.gif || item.file?.hd?.gif;
    if (!format || !format.url) return null;
    
    // Calculate aspect ratio height
    const w = format.width || 1;
    const h = format.height || 1;
    const itemHeight = (ITEM_WIDTH * h) / w;
    const id = item.id.toString();
    const isSaved = savedGifs.some(g => g.id === id);

    return (
      <View style={[styles.gifContainer, { width: ITEM_WIDTH, height: Math.max(100, Math.min(itemHeight, 250)), backgroundColor: theme.border }]}>
        <Pressable 
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => handleSelect(item.file?.hd?.gif?.url || format.url)}
        >
          <Image 
            source={format.url} 
            style={StyleSheet.absoluteFill} 
            contentFit="cover" 
            transition={200}
          />
        </Pressable>
        <Pressable
          style={styles.saveBtn}
          onPress={() => toggleSave(item)}
          hitSlop={15}
        >
          <Heart size={20} color="#FFFFFF" fill={isSaved ? "#FF4B00" : "rgba(0,0,0,0.5)"} />
        </Pressable>
      </View>
    );
  };

  const renderSavedItem = ({ item }: { item: any }) => {
    const itemHeight = (ITEM_WIDTH * item.height) / item.width;
    
    return (
      <View style={[styles.gifContainer, { width: ITEM_WIDTH, height: Math.max(100, Math.min(itemHeight, 250)), backgroundColor: theme.border }]}>
        <Pressable 
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => handleSelect(item.url)}
        >
          <Image 
            source={item.url} 
            style={StyleSheet.absoluteFill} 
            contentFit="cover" 
            transition={200}
          />
        </Pressable>
        <Pressable
          style={styles.saveBtn}
          onPress={() => removeGif(item.id)}
          hitSlop={15}
        >
          <Heart size={20} color="#FFFFFF" fill="#FF4B00" />
        </Pressable>
      </View>
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
        
        {/* Header (Matches music picker) */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>SYS.GIF_SEARCH</Text>
          <Pressable onPress={onClose} style={[styles.closeBtnHeader, { borderColor: theme.border }]} hitSlop={20}>
            <X size={18} color={theme.text} />
          </Pressable>
        </View>

        {/* Search Bar */}
        {activeTab === 'discover' && (
          <View style={styles.searchWrap}>
            <View style={[styles.searchBox, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
              <Search size={16} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search KLIPY..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                cursorColor={theme.text}
                selectionColor={theme.text}
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          <Pressable style={[styles.tab, activeTab === 'discover' && { borderBottomColor: theme.text }]} onPress={() => setActiveTab('discover')}>
            <Text style={[styles.tabText, { color: activeTab === 'discover' ? theme.text : theme.textMuted }]}>Discover</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'saved' && { borderBottomColor: theme.text }]} onPress={() => setActiveTab('saved')}>
            <Text style={[styles.tabText, { color: activeTab === 'saved' ? theme.text : theme.textMuted }]}>Saved</Text>
          </Pressable>
        </View>

        {/* Content */}
        {activeTab === 'discover' ? (
          loading && gifs.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.text} style={{ marginTop: 40 }} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <ThemedText style={{ color: '#FF4B00', marginTop: 40 }}>{error}</ThemedText>
            </View>
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={item => item.id.toString()}
              renderItem={renderDiscoverItem}
              numColumns={COLUMN_COUNT}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              columnWrapperStyle={styles.columnWrapper}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              ListEmptyComponent={() => (
                searchQuery.length > 0 && !loading ? (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>No GIFs found</Text>
                ) : null
              )}
              ListFooterComponent={() => (
                <View style={styles.footerContainer}>
                  <Text style={[styles.attributionText, { color: theme.textMuted }]}>POWERED BY KLIPY</Text>
                </View>
              )}
            />
          )
        ) : (
          <FlatList
            data={savedGifs}
            keyExtractor={item => item.id}
            renderItem={renderSavedItem}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            columnWrapperStyle={styles.columnWrapper}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No saved GIFs yet{'\n'}Tap the heart on any GIF</Text>
            )}
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
  closeBtnHeader: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
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
  listContent: {
    padding: SPACING,
    paddingTop: 8,
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
  saveBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  attributionText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.5,
  },
});
