/**
 * Story board cards.
 *
 * StoryHeroCard — the chapter you touched last, full width, inviting you back.
 * StoryGridCard — every other chapter, photo-led, in a two-column grid.
 *
 * Both lead with the user's own photos, with the title and memory count on a
 * scrim. Entrances are split: the card rises on its own stagger while the
 * image settles from a slight zoom more slowly, so the board feels like
 * prints being laid out rather than a list appearing.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { StoryCover, storyVisuals } from '@/components/stories/story-cover';
import { EASE_OUT, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import { memoryCountLabel, storySpanLabel } from '@/utils/story-meta';
import type { Story } from '@/types/journal';

const MAX_STAGGER_INDEX = 8;

const imageSettle = new Keyframe({
  0: { transform: [{ scale: 1.08 }] },
  100: { transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(800);

interface CardProps {
  story: Story;
  index: number;
  onPress: (story: Story) => void;
}

function MiniPrint({ visual, rotate }: { visual: { uri: string; type: 'image' | 'video' }; rotate: number }) {
  const thumb = useVideoThumbnail(visual.type === 'video' ? visual.uri : undefined);
  const uri = visual.type === 'video' ? thumb : visual.uri;
  if (!uri) return null;
  return (
    <View style={[styles.miniPrint, { transform: [{ rotate: `${rotate}deg` }] }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
    </View>
  );
}

function CardShell({ story, index, onPress, style, children }: CardProps & { style: object; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View entering={riseIn(320, Math.min(index, MAX_STAGGER_INDEX) * 40, 14)} style={style}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress(story);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${story.title}, ${memoryCountLabel(story).toLowerCase()}`}
        style={({ pressed }) => [
          styles.shell,
          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Animated.View entering={imageSettle} style={StyleSheet.absoluteFill}>
          <StoryCover story={story} />
        </Animated.View>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function StoryHeroCard(props: CardProps) {
  const { story } = props;
  const extras = storyVisuals(story).slice(1, 3);
  const span = storySpanLabel(story);

  return (
    <CardShell {...props} style={styles.heroWrap}>
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.heroCaption} pointerEvents="none">
        <ThemedText style={styles.eyebrow}>CONTINUE YOUR STORY</ThemedText>
        <ThemedText style={styles.heroTitle} numberOfLines={2}>
          {story.title.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {span ? `${memoryCountLabel(story)}  ·  ${span}` : memoryCountLabel(story)}
        </ThemedText>
      </View>
      {extras.length > 0 && (
        <View style={styles.heroPrints} pointerEvents="none">
          {extras.map((visual, i) => (
            <MiniPrint key={visual.uri} visual={visual} rotate={i === 0 ? -6 : 7} />
          ))}
        </View>
      )}
    </CardShell>
  );
}

export function StoryGridCard(props: CardProps) {
  const { story } = props;
  return (
    <CardShell {...props} style={styles.gridWrap}>
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.gridCaption} pointerEvents="none">
        <ThemedText style={styles.gridTitle} numberOfLines={2}>
          {story.title.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {memoryCountLabel(story)}
        </ThemedText>
      </View>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    width: '100%',
  },
  gridWrap: {
    flex: 1,
  },
  shell: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroCaption: {
    aspectRatio: 1.25,
    justifyContent: 'flex-end',
    padding: 18,
    paddingRight: 120,
    gap: 6,
  },
  heroPrints: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    flexDirection: 'row',
  },
  miniPrint: {
    width: 56,
    height: 72,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#222',
    marginLeft: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  gridCaption: {
    aspectRatio: 0.8,
    justifyContent: 'flex-end',
    padding: 12,
    gap: 4,
  },
  eyebrow: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 2,
    color: '#FF8A4C',
  },
  heroTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  gridTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  meta: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.8)',
  },
});
