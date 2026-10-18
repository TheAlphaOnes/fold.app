/**
 * FromYourPastCard — today's moments from the past.
 *
 * Same visual language as the profile's Story Board strip: a horizontal row
 * of 100x140 tiles, the user's photo filling each one under a soft scrim,
 * with one white label saying when it is from. Text memories show their
 * words in their own font and ink on the card surface. Tap opens the memory.
 *
 * Tiles rise in 40ms apart while each image settles from a slight zoom on a
 * slower curve.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { EASE_OUT, riseIn } from '@/constants/motion';
import { usePastMoments } from '@/hooks/use-past-moments';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import type { ResurfacedMemory } from '@/services/resurface.service';
import { getHighResArtwork } from '@/utils/media-attach';
import { isGifMedia } from '@/utils/media-kind';
import { memoryTextMetrics } from '@/utils/memory-text';
import type { Composition } from '@/types/journal';

const TILE_WIDTH = 100;
const TILE_HEIGHT = 140;
const MAX_STAGGER = 6;

const settleIn = new Keyframe({
  0: { transform: [{ scale: 1.08 }] },
  100: { transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(700);

/** The image a tile shows: photo, video thumbnail, or song artwork. */
function useTileImage(memory: Composition): string | null {
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  if (visual) return visual.type === 'video' ? videoThumb : visual.uri;
  const audio = memory.mediaElements.find((m) => m.type === 'audio');
  return getHighResArtwork(audio?.metadata?.artwork) ?? null;
}

function Tile({ moment, index }: { moment: ResurfacedMemory; index: number }) {
  const theme = useTheme();
  const { memory } = moment;
  const image = useTileImage(memory);
  const words = memory.textContent.trim();

  return (
    <Animated.View entering={riseIn(300, Math.min(index, MAX_STAGGER) * 40, 12)}>
      <Pressable
        onPress={() => {
          haptic.press();
          router.push(`/memory/${memory.id}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open memory, ${moment.label.toLowerCase()}`}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: theme.backgroundSelected,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        {image ? (
          <>
            <Animated.View entering={settleIn} style={StyleSheet.absoluteFill}>
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            </Animated.View>
            <View style={styles.scrim} pointerEvents="none" />
          </>
        ) : words ? (
          <View style={styles.wordsFace} pointerEvents="none">
            <ThemedText
              numberOfLines={4}
              style={{
                ...memoryTextMetrics(memory.fontFamily, 11),
                fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
                color: memory.textColor ?? theme.text,
              }}
            >
              {words}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.wordsFace} pointerEvents="none">
            <Mic size={18} color={theme.accentWarm} />
          </View>
        )}

        <View style={styles.label} pointerEvents="none">
          <ThemedText style={[styles.labelText, { color: image ? '#FFFFFF' : theme.text }]} numberOfLines={2}>
            {moment.label}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FromYourPastCard() {
  const theme = useTheme();
  const { moments, loaded } = usePastMoments();

  if (!loaded) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.rail}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>FROM YOUR PAST</ThemedText>
      </View>

      {moments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {moments.map((moment, index) => (
            <Tile key={moment.memory.id} moment={moment} index={index} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            your past starts today. moments return here after a week.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rail: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  strip: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  wordsFace: {
    ...StyleSheet.absoluteFill,
    padding: 10,
    paddingBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  labelText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  empty: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
