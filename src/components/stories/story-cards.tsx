/**
 * StoryGridCard — one chapter on the Story Board.
 *
 * Cover on top (an album mosaic of the user's photos), caption below it —
 * title, then memory count and date span. Keeping text off the photo means
 * it is always readable, whatever the image holds.
 *
 * The card rises on a stagger while its cover settles from a slight zoom on
 * a slower curve.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { StoryCover } from '@/components/stories/story-cover';
import { EASE_OUT, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { memoryCountLabel, storySpanLabel } from '@/utils/story-meta';
import type { Story } from '@/types/journal';

const MAX_STAGGER_INDEX = 8;

const coverSettle = new Keyframe({
  0: { transform: [{ scale: 1.06 }] },
  100: { transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(700);

interface StoryGridCardProps {
  story: Story;
  index: number;
  /** Fixed column width, so a lone card in the last row keeps its size. */
  width: number;
  onPress: (story: Story) => void;
}

export function StoryGridCard({ story, index, width, onPress }: StoryGridCardProps) {
  const theme = useTheme();
  const span = storySpanLabel(story);

  return (
    <Animated.View entering={riseIn(300, Math.min(index, MAX_STAGGER_INDEX) * 40, 12)} style={{ width }}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress(story);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${story.title}, ${memoryCountLabel(story).toLowerCase()}`}
        style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.cover, { borderColor: theme.border }]}>
          <Animated.View entering={coverSettle} style={StyleSheet.absoluteFill}>
            <StoryCover story={story} />
          </Animated.View>
        </View>

        <View style={styles.caption}>
          <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {story.title.toUpperCase()}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {span ? `${memoryCountLabel(story)} · ${span}` : memoryCountLabel(story)}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  cover: {
    aspectRatio: 0.8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  caption: {
    gap: 3,
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  meta: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
});
