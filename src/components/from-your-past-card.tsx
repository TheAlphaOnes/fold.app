/**
 * FromYourPastCard — "memory lane": today's moments from the past, hung from
 * a time ruler.
 *
 * A hairline ruler runs under a horizontal strip; each moment is a photo (or
 * a paper square of its words) on a short stem, with a tick on the ruler and
 * a compact time mark beneath ("15 DAYS", "3 WK", "1 YR"). Moments run from
 * the most recent back, so scrolling right is scrolling back in time.
 * Anniversaries — this exact day in an earlier year — get an orange tick.
 *
 * The entrance is segmented: the ruler draws in from the left first, then
 * each moment drops onto it 40ms apart, its tick popping slightly later and
 * its label fading in last.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { EASE_OUT, SPRING_BOUNCE, fadeIn, riseIn } from '@/constants/motion';
import { usePastMoments } from '@/hooks/use-past-moments';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import type { ResurfacedMemory } from '@/services/resurface.service';
import { getHighResArtwork } from '@/utils/media-attach';
import { isGifMedia } from '@/utils/media-kind';
import { memoryTextMetrics } from '@/utils/memory-text';
import type { Composition } from '@/types/journal';

const FRAME = 88;
const STEM = 14;
const TICK = 7;
const COLUMN_GAP = 18;
const STAGGER = 40;
const MAX_STAGGER = 6;

const rulerDraw = new Keyframe({
  0: { transform: [{ scaleX: 0 }] },
  100: { transform: [{ scaleX: 1 }], easing: EASE_OUT },
}).duration(520);

const tickPop = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.3 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: SPRING_BOUNCE },
  })
    .duration(240)
    .delay(delay);

function dateMark(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: '2-digit' })
    .format(new Date(timestamp))
    .toUpperCase();
}

function useFrameImage(memory: Composition): string | null {
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  if (visual) return visual.type === 'video' ? videoThumb : visual.uri;
  const audio = memory.mediaElements.find((m) => m.type === 'audio');
  return getHighResArtwork(audio?.metadata?.artwork) ?? null;
}

function Moment({ moment, index }: { moment: ResurfacedMemory; index: number }) {
  const theme = useTheme();
  const { memory } = moment;
  const image = useFrameImage(memory);
  const words = memory.textContent.trim();
  const delay = 200 + Math.min(index, MAX_STAGGER) * STAGGER;
  const tickColor = moment.isAnniversary ? theme.accentWarm : theme.textMuted;

  return (
    <Pressable
      onPress={() => {
        haptic.press();
        router.push(`/memory/${memory.id}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open memory from ${moment.label}`}
      style={({ pressed }) => [styles.column, { opacity: pressed ? 0.8 : 1 }]}
    >
      {({ pressed }) => (
        <>
          <Animated.View entering={riseIn(320, delay, 14)}>
            <View
              style={[
                styles.frame,
                {
                  borderColor: moment.isAnniversary ? theme.accentWarm : theme.border,
                  backgroundColor: theme.backgroundSelected,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              {image ? (
                <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              ) : words ? (
                <View style={styles.wordsFace}>
                  <ThemedText
                    numberOfLines={4}
                    style={{
                      ...memoryTextMetrics(memory.fontFamily, 10),
                      fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
                      color: memory.textColor ?? theme.text,
                      textAlign: 'center',
                    }}
                  >
                    {words}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.wordsFace}>
                  <Mic size={18} color={theme.accentWarm} />
                </View>
              )}
            </View>
          </Animated.View>

          <View style={[styles.stem, { backgroundColor: theme.border }]} />
          <Animated.View entering={tickPop(delay + 120)} style={[styles.tick, { backgroundColor: tickColor }]} />

          <Animated.View entering={fadeIn(260, delay + 180)} style={styles.marks}>
            <ThemedText style={[styles.tickLabel, { color: moment.isAnniversary ? theme.accentWarm : theme.text }]}>
              {moment.tick}
            </ThemedText>
            <ThemedText style={[styles.dateLabel, { color: theme.textMuted }]}>{dateMark(memory.createdAt)}</ThemedText>
          </Animated.View>
        </>
      )}
    </Pressable>
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
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{'NOW  ->  THEN'}</ThemedText>
        )}
      </View>

      {moments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lane}>
          {/* The ruler spans every moment; ticks sit on it. */}
          <Animated.View
            entering={rulerDraw}
            style={[styles.ruler, { backgroundColor: theme.border }]}
            pointerEvents="none"
          />
          {moments.map((moment, index) => (
            <Moment key={moment.memory.id} moment={moment} index={index} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  lane: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: COLUMN_GAP,
  },
  ruler: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: FRAME + STEM + TICK / 2,
    height: StyleSheet.hairlineWidth,
    transformOrigin: 'left',
  },
  column: {
    width: FRAME,
    alignItems: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wordsFace: {
    ...StyleSheet.absoluteFill,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stem: {
    width: StyleSheet.hairlineWidth,
    height: STEM,
  },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
  },
  marks: {
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  tickLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  dateLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
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
