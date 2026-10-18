/**
 * FromYourPastCard — today's moments from the past, laid out as prints.
 *
 * A horizontal strip of polaroid-style prints, each slightly tilted, each
 * labelled on its white margin with when it is from ("2 YEARS AGO TODAY",
 * "ONE WEEK AGO"). Photos and video thumbnails lead; a text memory becomes a
 * paper print in its own font and ink; songs show their artwork and voice
 * notes a quiet mark. Tapping a print opens that memory.
 *
 * Prints land one after another (45ms apart) while each image settles from
 * a slight zoom on a slower curve, like photos being dealt onto a table.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { BALANCED_TEXT, Type } from '@/constants/theme';
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

const PRINT_WIDTH = 132;
const PHOTO_HEIGHT = 150;
const PRINT_PAPER = '#FAFAF7';
const PRINT_INK = '#1A1A1A';
const TILTS = [-2.4, 1.8, -1.2, 2.6, -2, 1.2];
const MAX_STAGGER = 6;

const settleIn = new Keyframe({
  0: { transform: [{ scale: 1.08 }] },
  100: { transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(800);

function shortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(timestamp))
    .toUpperCase();
}

function PhotoFace({ memory }: { memory: Composition }) {
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const audio = memory.mediaElements.find((m) => m.type === 'audio');
  const artwork = getHighResArtwork(audio?.metadata?.artwork);
  const uri = visual ? (visual.type === 'video' ? videoThumb : visual.uri) : artwork;

  if (uri) {
    return (
      <Animated.View entering={settleIn} style={StyleSheet.absoluteFill}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      </Animated.View>
    );
  }

  if (memory.textContent.trim()) {
    return (
      <View style={styles.paperFace}>
        <ThemedText
          {...BALANCED_TEXT}
          numberOfLines={5}
          style={{
            ...memoryTextMetrics(memory.fontFamily, 13),
            fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
            color: memory.textColor ?? PRINT_INK,
            textAlign: 'center',
          }}
        >
          {memory.textContent.trim()}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.paperFace}>
      <Mic size={22} color="#FF4B00" />
    </View>
  );
}

function Print({ moment, index }: { moment: ResurfacedMemory; index: number }) {
  const tilt = TILTS[index % TILTS.length];
  return (
    <Animated.View entering={riseIn(320, Math.min(index, MAX_STAGGER) * 45, 16)}>
      <Pressable
        onPress={() => {
          haptic.press();
          router.push(`/memory/${moment.memory.id}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open memory from ${moment.label.toLowerCase()}`}
        style={({ pressed }) => [
          styles.print,
          { transform: [{ rotate: `${pressed ? 0 : tilt}deg` }, { scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        <View style={styles.photo}>
          <PhotoFace memory={moment.memory} />
        </View>
        <View style={styles.caption}>
          <ThemedText style={styles.captionLabel} numberOfLines={1}>
            {moment.label}
          </ThemedText>
          <ThemedText style={styles.captionDate} numberOfLines={1}>
            {shortDate(moment.memory.createdAt)}
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
        {moments.length > 0 && (
          <ThemedText style={[Type.rail, { color: theme.accentWarm }]}>
            {moments.length === 1 ? '1 MOMENT' : `${moments.length} MOMENTS`}
          </ThemedText>
        )}
      </View>

      {moments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          decelerationRate="fast"
          snapToInterval={PRINT_WIDTH + 16}
          snapToAlignment="start"
        >
          {moments.map((moment, index) => (
            <Print key={moment.memory.id} moment={moment} index={index} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textMuted }]}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  strip: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 16,
  },
  print: {
    width: PRINT_WIDTH,
    padding: 6,
    paddingBottom: 0,
    borderRadius: 4,
    backgroundColor: PRINT_PAPER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  photo: {
    height: PHOTO_HEIGHT,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#E9E6DE',
  },
  paperFace: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F2F0EA',
  },
  caption: {
    paddingVertical: 8,
    gap: 2,
  },
  captionLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: '#E5480C',
  },
  captionDate: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
    color: '#6B6B6B',
  },
  empty: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
