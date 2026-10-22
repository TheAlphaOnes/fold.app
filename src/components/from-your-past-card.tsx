/**
 * FromYourPastCard — a waterfall of random memories from the user's past.
 *
 * Three columns of memory tiles drift downward without end, each at its own
 * speed, so the wall reads like falling water rather than a carousel. Photos
 * keep their natural shape; text memories appear in their own font and ink.
 * The edges fade into the card. Touching the wall pauses the flow so a tile
 * can be tapped to open; SHUFFLE draws a fresh random set.
 *
 * Motion: the flow is linear on purpose — it represents continuous movement,
 * like a progress bar, so easing would read as stutter at each loop. The
 * entrance is segmented: columns rise in 80ms apart and the wall fades up.
 * With reduced motion the wall is shown still.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { Shuffle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { useRandomPastMemories } from '@/hooks/use-random-past-memories';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import { getHighResArtwork } from '@/utils/media-attach';
import { isGifMedia } from '@/utils/media-kind';
import { memoryTextMetrics } from '@/utils/memory-text';
import type { Composition } from '@/types/journal';

const VIEWPORT_HEIGHT = 380;
const COLUMNS = 3;
const GAP = 6;
const SIDE_PADDING = 6;
const PROFILE_GUTTER = 16; // profile screen's horizontal padding; the wall bleeds past it
const FADE_TOP = 64;
const FADE_BOTTOM = 110;
/** Pixels per second for each column — different rates make it feel like water. */
const SPEEDS = [13, 9, 11];
const ASPECTS = [0.75, 1, 1.3, 0.85, 1.15];

interface Tile {
  key: string;
  memory: Composition;
  height: number;
}

function visualOf(memory: Composition) {
  return memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
}

/** Natural aspect when known, otherwise a stable pseudo-random one per memory. */
function tileHeight(memory: Composition, width: number): number {
  const visual = visualOf(memory);
  if (visual?.width && visual?.height) {
    const aspect = Math.min(1.6, Math.max(0.65, visual.width / visual.height));
    return Math.round(width / aspect);
  }
  if (!visual && memory.textContent.trim()) return Math.round(width * 0.95);
  return Math.round(width / ASPECTS[memory.id % ASPECTS.length]);
}

/**
 * Deal memories round-robin into columns, then repeat each column's list
 * until one cycle is taller than the viewport — the loop needs that much
 * content to never show a gap.
 */
function buildColumns(memories: Composition[], width: number): { tiles: Tile[]; cycle: number }[] {
  const dealt: Composition[][] = Array.from({ length: COLUMNS }, () => []);
  memories.forEach((memory, index) => dealt[index % COLUMNS].push(memory));

  return dealt.map((column, c) => {
    const source = column.length > 0 ? column : memories;
    const tiles: Tile[] = [];
    let cycle = 0;
    let round = 0;
    while (source.length > 0 && cycle < VIEWPORT_HEIGHT + 120) {
      for (const memory of source) {
        const height = tileHeight(memory, width);
        tiles.push({ key: `${c}-${round}-${memory.id}`, memory, height });
        cycle += height + GAP;
      }
      round += 1;
    }
    return { tiles, cycle };
  });
}

function shortDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()];
  return `${month} ${d.getDate()} '${String(d.getFullYear()).slice(2)}`;
}

function MemoryTile({ tile, width }: { tile: Tile; width: number }) {
  const theme = useTheme();
  const { memory } = tile;
  const visual = visualOf(memory);
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const audio = memory.mediaElements.find((m) => m.type === 'audio');
  const image = visual ? (visual.type === 'video' ? videoThumb : visual.uri) : getHighResArtwork(audio?.metadata?.artwork);

  return (
    <Pressable
      onPress={() => {
        haptic.press();
        router.push(`/memory/${memory.id}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open memory from ${shortDate(memory.createdAt)}`}
      style={({ pressed }) => [
        styles.tile,
        {
          width,
          height: tile.height,
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={styles.wordsFace}>
          <ThemedText
            numberOfLines={5}
            style={{
              ...memoryTextMetrics(memory.fontFamily, 10),
              fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
              color: memory.textColor ?? theme.text,
              textAlign: 'center',
            }}
          >
            {memory.textContent.trim()}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function FallingColumn({
  tiles,
  cycle,
  speed,
  width,
  paused,
  still,
}: {
  tiles: Tile[];
  cycle: number;
  speed: number;
  width: number;
  paused: boolean;
  still: boolean;
}) {
  const offset = useSharedValue(-cycle);
  const fullDuration = (cycle / speed) * 1000;

  useEffect(() => {
    if (still) {
      cancelAnimation(offset);
      offset.value = -cycle / 2;
      return;
    }
    if (paused) {
      cancelAnimation(offset);
      return;
    }
    // Resume from wherever the column is, finish this cycle, then loop forever.
    const remaining = Math.max(0, (-offset.value / cycle) * fullDuration);
    offset.value = withTiming(0, { duration: remaining, easing: Easing.linear }, (finished) => {
      if (!finished) return;
      offset.value = -cycle;
      offset.value = withRepeat(withTiming(0, { duration: fullDuration, easing: Easing.linear }), -1, false);
    });
    return () => cancelAnimation(offset);
  }, [paused, still, cycle, fullDuration, offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  // Two copies of the cycle stacked: while one scrolls out the bottom, the
  // other is already in place above it, so the loop has no seam.
  return (
    <Animated.View style={[{ width, gap: GAP }, style]}>
      {[0, 1].map((copy) => (
        <View key={copy} style={{ gap: GAP }}>
          {tiles.map((tile) => (
            <MemoryTile key={`${copy}-${tile.key}`} tile={tile} width={width} />
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * Eased, uneven fade: opacity falls off along an ease-out curve rather than
 * a straight line, so tiles dissolve gradually instead of hitting a hard
 * band. The bottom fade is deeper than the top so memories sink away.
 */
const FADE_STOPS: readonly [number, number][] = [
  [0, 1],
  [0.18, 0.92],
  [0.4, 0.68],
  [0.62, 0.38],
  [0.82, 0.14],
  [1, 0],
];

function EdgeFade({ color, edge }: { color: string; edge: 'top' | 'bottom' }) {
  const id = `fade-${edge}`;
  const height = edge === 'top' ? FADE_TOP : FADE_BOTTOM;
  return (
    <Svg style={[styles.fade, { height }, edge === 'top' ? { top: 0 } : { bottom: 0 }]} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1={edge === 'top' ? '0' : '1'} x2="0" y2={edge === 'top' ? '1' : '0'}>
          {FADE_STOPS.map(([offset, opacity]) => (
            <Stop key={offset} offset={String(offset)} stopColor={color} stopOpacity={opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Round icon button; the icon turns a full spin on each shuffle. */
function ShuffleButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const spin = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));

  return (
    <Pressable
      onPress={() => {
        // The spin runs on the UI thread; the reshuffle waits a frame so the
        // button's release paints first and the tap never feels stuck.
        spin.set(withTiming(spin.get() + 360, { duration: 420, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }));
        requestAnimationFrame(onPress);
      }}
      accessibilityRole="button"
      accessibilityLabel="Shuffle memories"
      style={({ pressed }) => [
        styles.shuffle,
        {
          borderColor: theme.border,
          backgroundColor: theme.background + 'D9',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Animated.View style={iconStyle}>
        <Shuffle size={14} color={theme.text} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

export function FromYourPastCard() {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion() ?? false;
  const { memories, loaded, sampleId, reshuffle } = useRandomPastMemories();
  const [paused, setPaused] = useState(false);

  const columnWidth = (screenWidth - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const columns = useMemo(() => buildColumns(memories, columnWidth), [memories, columnWidth]);

  if (!loaded) return null;

  return (
    <View style={styles.section}>
      {memories.length > 0 ? (
        <View style={styles.stage}>
          <Animated.View
            key={sampleId}
            entering={fadeIn(400)}
            style={styles.viewport}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            onTouchCancel={() => setPaused(false)}
          >
            <View style={styles.columns}>
              {columns.map((column, index) => (
                <Animated.View key={index} entering={riseIn(420, index * 80, 24)}>
                  <FallingColumn
                    tiles={column.tiles}
                    cycle={column.cycle}
                    speed={SPEEDS[index % SPEEDS.length]}
                    width={columnWidth}
                    paused={paused}
                    still={reduceMotion}
                  />
                </Animated.View>
              ))}
            </View>
            <EdgeFade color={theme.background} edge="top" />
            <EdgeFade color={theme.background} edge="bottom" />
          </Animated.View>
          {/* Floats over the wall's top-right corner. */}
          {memories.length > 1 && (
            <View style={styles.shuffleSlot} pointerEvents="box-none">
              <ShuffleButton
                onPress={() => {
                  haptic.select();
                  reshuffle();
                }}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.empty}>
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            your past starts tomorrow. memories flow in here once you have a few.
          </ThemedText>
        </View>
      )}

      <ThemedText style={[styles.title, { color: theme.textMuted }]} accessibilityRole="header">
        FROM YOUR PAST
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-bleed section: no card chrome; the wall runs edge to edge and fades
  // into the screen itself.
  section: {
    marginHorizontal: -PROFILE_GUTTER,
    marginBottom: 24,
  },
  stage: {
    position: 'relative',
  },
  shuffleSlot: {
    position: 'absolute',
    top: 10,
    right: PROFILE_GUTTER,
  },
  title: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
  },
  // Sits over photos, so it carries its own backing to stay legible.
  shuffle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewport: {
    height: VIEWPORT_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: SIDE_PADDING,
  },
  columns: {
    flexDirection: 'row',
    gap: GAP,
  },
  tile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  wordsFace: {
    ...StyleSheet.absoluteFill,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  empty: {
    paddingHorizontal: PROFILE_GUTTER,
    paddingTop: 8,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
