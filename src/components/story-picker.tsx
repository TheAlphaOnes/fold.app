/**
 * StoryPicker — files a memory into stories.
 *
 * A floating card in the same family as the share tray: inset from the
 * screen edges with the memory card's 34pt corners, a rail title, and the
 * shared round buttons (new story, confirm, close). Stories sit in one
 * swipeable row as covers: the newest photo on top of a second card edge,
 * so a story reads as a small stack. A chosen story gets an ink ring and a
 * check badge drawn inside the cover, so nothing pokes past its corners.
 *
 * Two modes: `single` (pick one and close) and `multi` (toggle many and
 * stay open). Motion: the card springs in, then the header and each cover
 * rise on their own short delays.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Plus, Book, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { haptic } from '@/services/haptics';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { useStoriesStore } from '@/hooks/use-stories';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import { CloseButton, RoundButton } from '@/components/round-button';
import { Type } from '@/constants/theme';
import type { Story } from '@/types/journal';

// ─── Props ──────────────────────────────────────────────────────────────────

/** Compose screen: one story per entry. */
interface SingleSelectProps {
  mode: 'single';
  visible: boolean;
  onClose: () => void;
  onSelect: (storyId: number | null) => void;
  selectedStoryId?: number | null;
}

/** Memory detail: a memory can belong to many stories. */
interface MultiSelectProps {
  mode: 'multi';
  visible: boolean;
  onClose: () => void;
  onToggle: (storyId: number) => void;
  selectedStoryIds: number[];
}

type StoryPickerProps = SingleSelectProps | MultiSelectProps;

// ─── Constants ──────────────────────────────────────────────────────────────

const COVER = 76;
const ITEM_WIDTH = 92;
/** Gap between the floating card and the screen edges. */
const INSET = 10;
/** Covers past this index appear together, so a long list doesn't trickle in. */
const MAX_STAGGER = 5;

/** Maya spring — snappy, slight overshoot for user-triggered entrance. */
const SPRING_IN = { damping: 22, stiffness: 280, mass: 0.8 };
/** Maya ease-in — exits faster than entrance (150ms feel). */
const TIMING_OUT = { duration: 180 };

const rise = (delay: number) =>
  FadeInDown.delay(delay).duration(320).withInitialValues({ transform: [{ translateY: 10 }] });

// ─── Story cover ────────────────────────────────────────────────────────────

function StoryCover({ story, active }: { story: Story; active: boolean }) {
  const theme = useTheme();
  const cover = story.coverImageUri ?? story.sampleMedia?.find((m) => m.type === 'image')?.uri;

  return (
    <View style={styles.coverWrap}>
      {/* The edge of a second card behind, so a story reads as a stack. */}
      <View style={[styles.cover, styles.coverBehind, { backgroundColor: theme.backgroundSurface, borderColor: theme.border }]} />

      <View
        style={[
          styles.cover,
          { backgroundColor: theme.backgroundSurface, borderColor: active ? theme.text : theme.border },
          active && styles.coverActive,
        ]}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <>
            <DiagonalStripes color={theme.border} opacity={0.35} />
            <Book size={18} color={theme.textMuted} />
          </>
        )}

        {active && (
          <View style={[styles.check, { backgroundColor: theme.text, borderColor: theme.background }]}>
            <Check size={11} color={theme.background} strokeWidth={3} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── StoryPicker ────────────────────────────────────────────────────────────

export function StoryPicker(props: StoryPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stories, refreshStories, addStory } = useStoriesStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (props.visible) {
      setMounted(true);
      progress.value = withSpring(1, SPRING_IN);
    } else if (mounted) {
      progress.value = withTiming(0, TIMING_OUT, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [props.visible]);

  useEffect(() => {
    if (props.visible) {
      refreshStories();
      setIsCreating(false);
      setNewTitle('');
    }
  }, [props.visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const trayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [500, 0], Extrapolation.CLAMP) }],
  }));

  const canCreate = newTitle.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    haptic.press();
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
    haptic.select();
    if (props.mode === 'single') {
      props.onSelect(story.id === props.selectedStoryId ? null : story.id);
      props.onClose();
    } else {
      // Multi mode stays open so several stories can be toggled.
      props.onToggle(story.id);
    }
  };

  const isActive = (storyId: number): boolean =>
    props.mode === 'single' ? storyId === props.selectedStoryId : props.selectedStoryIds.includes(storyId);

  const renderStory = ({ item, index }: { item: Story; index: number }) => {
    const active = isActive(item.id);
    const count = item.memoryCount ?? 0;

    return (
      <Animated.View entering={rise(120 + Math.min(index, MAX_STAGGER) * 45)}>
        <Pressable
          onPress={() => handleStoryPress(item)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: active }}
          accessibilityLabel={`${item.title}, ${count} ${count === 1 ? 'memory' : 'memories'}`}
          style={({ pressed }) => [styles.storyItem, pressed && styles.pressed]}
        >
          <StoryCover story={item} active={active} />
          <View style={styles.storyText}>
            <ThemedText style={[styles.storyTitle, { color: active ? theme.text : theme.textMuted }]} numberOfLines={1}>
              {item.title.toUpperCase()}
            </ThemedText>
            <ThemedText style={[styles.storyCount, { color: theme.textMuted }]}>
              {String(count).padStart(2, '0')}
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10000, elevation: 1000 }]}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} accessibilityLabel="Close stories" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.tray,
            trayStyle,
            {
              marginBottom: Math.max(insets.bottom - 14, INSET),
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <Animated.View entering={rise(60)} style={styles.header}>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>
              {isCreating ? 'NEW STORY' : 'ADD TO STORY'}
            </ThemedText>
            <View style={styles.headerActions}>
              {isCreating ? (
                <>
                  <RoundButton
                    icon={Check}
                    onPress={handleCreate}
                    accessibilityLabel="Create story"
                    iconColor={canCreate ? theme.text : theme.textMuted}
                    style={!canCreate && styles.disabled}
                    hitSlop={8}
                  />
                  <CloseButton onPress={() => setIsCreating(false)} accessibilityLabel="Cancel new story" hitSlop={8} />
                </>
              ) : (
                <>
                  <RoundButton icon={Plus} onPress={() => setIsCreating(true)} accessibilityLabel="New story" hitSlop={8} />
                  <CloseButton onPress={props.onClose} accessibilityLabel="Close stories" hitSlop={8} />
                </>
              )}
            </View>
          </Animated.View>

          {isCreating ? (
            <Animated.View entering={rise(40)} style={[styles.inputRow, { borderColor: theme.border }]}>
              <ThemedText style={[styles.prompt, { color: theme.accentWarm }]}>{'>'}</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="NAME YOUR STORY"
                autoCapitalize="characters"
                placeholderTextColor={theme.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                cursorColor={theme.accentWarm}
                selectionColor={theme.accentWarm}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </Animated.View>
          ) : (
            <FlatList
              data={stories}
              keyExtractor={(s) => s.id.toString()}
              renderItem={renderStory}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Pressable onPress={() => setIsCreating(true)} style={styles.empty}>
                  <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
                    No stories yet. Tap + to start one.
                  </ThemedText>
                </Pressable>
              }
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tray: {
    marginHorizontal: INSET,
    borderRadius: 34,
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 21,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 21,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  // ── Story row ────────────────────────────────────────────────────────────
  list: {
    // The row bleeds to the card's edges; the content inset keeps it aligned.
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 21,
    gap: 14,
  },
  storyItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.75,
  },
  coverWrap: {
    width: COVER + 8,
    height: COVER + 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBehind: {
    position: 'absolute',
    top: 0,
    transform: [{ scale: 0.9 }, { translateY: -4 }],
  },
  coverActive: {
    borderWidth: 2,
  },
  check: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyText: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
  },
  storyTitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',
  },
  storyCount: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1,
  },
  empty: {
    height: COVER + 40,
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
  },
  // ── Create form ──────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 21,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  prompt: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 40,
    padding: 0,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 18,
  },
});
