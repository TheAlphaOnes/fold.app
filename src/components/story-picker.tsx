import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, FlatList, TextInput, Platform, Keyboard, Animated } from 'react-native';
import { X, Plus, Book, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { useStoriesStore } from '@/hooks/use-stories';
import type { Story } from '@/types/journal';

// ─── Single-select mode (compose screen: one story per entry) ───────────────
interface SingleSelectProps {
  mode: 'single';
  visible: boolean;
  onClose: () => void;
  onSelect: (storyId: number | null) => void;
  selectedStoryId?: number | null;
}

// ─── Multi-select mode (memory detail: a memory can belong to many stories) ──
interface MultiSelectProps {
  mode: 'multi';
  visible: boolean;
  onClose: () => void;
  onToggle: (storyId: number) => void;
  selectedStoryIds: number[];
}

type StoryPickerProps = SingleSelectProps | MultiSelectProps;

function StoryThumbnail({ media, style }: { media: { uri: string; type: string }; style: object }) {
  if (media.type === 'image' || media.type === 'photo') {
    return <Image source={{ uri: media.uri }} style={[styles.thumbImg, style]} contentFit="cover" />;
  }
  return null;
}

export function StoryPicker(props: StoryPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stories, refreshStories, addStory } = useStoriesStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (props.visible) {
      refreshStories();
      setIsCreating(false);
      setNewTitle('');
    }
  }, [props.visible]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const story = await addStory({ title: newTitle.trim() });

    if (props.mode === 'single') {
      props.onSelect(story.id);
      props.onClose();
    } else {
      props.onToggle(story.id);
      setIsCreating(false);
      setNewTitle('');
    }
  };

  const handleStoryPress = (story: Story) => {
    Haptics.selectionAsync();
    if (props.mode === 'single') {
      const isSelected = story.id === (props as SingleSelectProps).selectedStoryId;
      props.onSelect(isSelected ? null : story.id);
      props.onClose();
    } else {
      (props as MultiSelectProps).onToggle(story.id);
      // Stay open in multi mode so user can toggle multiple stories.
    }
  };

  const isActive = (storyId: number): boolean => {
    if (props.mode === 'single') return storyId === (props as SingleSelectProps).selectedStoryId;
    return (props as MultiSelectProps).selectedStoryIds.includes(storyId);
  };

  const renderStory = ({ item }: { item: Story }) => {
    const active = isActive(item.id);
    const sampleMedia = (item as any).sampleMedia as { uri: string; type: string }[] | undefined;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.storyItem,
          { opacity: pressed ? 0.6 : 1 }
        ]}
        onPress={() => handleStoryPress(item)}
      >
        {/* Thumbnail fan */}
        <View style={styles.thumbStack}>
          {/* Matrix radio button floating at top-right of the thumbnails */}
          <View style={[
            styles.matrixRadio,
            { 
              position: 'absolute', 
              top: -8, 
              right: -8,
              zIndex: 10,
              borderColor: active ? theme.text : theme.border 
            },
          ]}>
            {active && (
              <View style={[styles.matrixRadioFill, { backgroundColor: theme.text }]} />
            )}
          </View>

          {sampleMedia && sampleMedia.length > 0 ? (
            sampleMedia.slice(0, 3).map((m, i) => (
              <StoryThumbnail
                key={`${m.uri}-${i}`}
                media={m}
                style={{
                  position: 'absolute',
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  borderColor: theme.border,
                  borderWidth: 1,
                  transform: [
                    { rotate: `${(i - 1) * 8}deg` },
                    { translateX: (i - 1) * 6 },
                  ],
                  zIndex: 3 - i,
                }}
              />
            ))
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <View
                  key={`fallback-${i}`}
                  style={[
                    styles.thumbFallback,
                    {
                      position: 'absolute',
                      backgroundColor: theme.backgroundSurface,
                      borderColor: theme.border,
                      borderWidth: 1,
                      transform: [
                        { rotate: `${(i - 1) * 8}deg` },
                        { translateX: (i - 1) * 6 },
                      ],
                      zIndex: 3 - i,
                      overflow: 'hidden',
                    }
                  ]}
                >
                  {i === 0 && (
                    <>
                      <ThemedText style={{ position: 'absolute', fontSize: 64, fontFamily: 'JetBrainsMono-Bold', opacity: 0.05, color: theme.text, top: -12, left: -6 }}>
                        {item.title.charAt(0).toUpperCase()}
                      </ThemedText>
                      <Book size={20} color={theme.textMuted} style={{ opacity: 0.6 }} />
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        <ThemedText 
          style={[styles.storyTitle, { color: active ? theme.text : theme.textMuted }]}
          numberOfLines={1}
        >
          {item.title}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <Modal visible={props.visible} animationType="slide" transparent>
      <Animated.View style={[styles.modalOverlay, { paddingBottom: keyboardHeight }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.headerTitle}>Add to Canvas</ThemedText>
            <View style={styles.headerActions}>
              {isCreating ? (
                <>
                  {/* Circular Check Create button */}
                  <Pressable
                    onPress={handleCreate}
                    disabled={!newTitle.trim()}
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      {
                        borderColor: newTitle.trim() ? theme.text : theme.border,
                        backgroundColor: pressed && newTitle.trim() ? theme.backgroundElement : 'transparent',
                        opacity: newTitle.trim() ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Check size={16} color={newTitle.trim() ? theme.text : theme.textMuted} />
                  </Pressable>
                  {/* Circular X cancel create button */}
                  <Pressable
                    onPress={() => setIsCreating(false)}
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                      },
                    ]}
                  >
                    <X size={16} color={theme.text} />
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Circular + New Canvas button */}
                  <Pressable
                    onPress={() => setIsCreating(true)}
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                      },
                    ]}
                  >
                    <Plus size={16} color={theme.text} />
                  </Pressable>
                  {/* Circular X close modal button */}
                  <Pressable
                    onPress={props.onClose}
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                      },
                    ]}
                  >
                    <X size={16} color={theme.text} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {isCreating ? (
            // ── Create form ──────────────────────────────────────────────
            <View style={[styles.createContainer, { minHeight: 240 }]}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="Canvas title..."
                placeholderTextColor={theme.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                cursorColor={theme.text}
                selectionColor={theme.text}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />

              {/* ASCII art — cyber-minimalist canvas init terminal */}
              <View style={{ marginTop: 'auto', alignItems: 'center', opacity: 0.5 }}>
                <ThemedText style={styles.ascii}>
                  {[
                    '█║▌│█│║▌║││█║▌║▌',
                    ' c a n v a s _  ',
                  ].join('\n')}
                </ThemedText>
              </View>
            </View>
          ) : (
            // ── Story list + inline "New Canvas" row ─────────────────────
            <>
              <FlatList
                data={stories}
                keyExtractor={s => s.id.toString()}
                renderItem={renderStory}
                contentContainerStyle={styles.listContent}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
                      No canvases yet.
                    </ThemedText>
                  </View>
                }
              />
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    // Content drives the height now, so it hugs the bottom tightly
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // ── Circular X close button ──────────────────────────────────────────────
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Story list ───────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24, // spacing between floating items
  },
  storyItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, // tight width so they pack closely horizontally
    gap: 16,
  },
  thumbStack: {
    width: 64,
    height: 64,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  thumbImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  thumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },
  emptyContainer: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    height: 160,
  },
  // ── Matrix radio button (cyber-minimalist selection indicator) ───────────
  // Sharp square outer bracket — zero border-radius = terminal aesthetic
  matrixRadio: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 0,          // sharp corners — no softness, no circles
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Solid filled inner square — sits 3pt inside the bracket
  matrixRadioFill: {
    width: 8,
    height: 8,
    borderRadius: 0,          // keep it sharp
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  // ── Inline "New Canvas" footer row ──────────────────────────────────────
  newCanvasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  newCanvasText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
  },
  // ── Create form ─────────────────────────────────────────────────────────
  createContainer: {
    padding: 24,
    paddingTop: 28,
    gap: 32,
  },
  ascii: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
  input: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 22,
    lineHeight: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  cancelBtnText: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  // Pill-shaped confirm button — matches compose Save button exactly
  confirmBtn: {
    paddingHorizontal: 21,
    paddingVertical: 8,
    borderRadius: 34,
  },
  confirmBtnText: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
