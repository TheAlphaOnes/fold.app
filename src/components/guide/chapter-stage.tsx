/**
 * ChapterStage — STORIES chapter, step 1 (start a chapter).
 *
 * Explains stories by showing one: three memories glide in from scattered
 * positions and settle into a stack, each on its own duration, delay and
 * rotation. A blank chapter label waits under the stack; naming the chapter
 * in the real story tray fills it in and the stack settles with a small bounce.
 */

import React, { useEffect } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Book } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { ThemedText } from '@/components/themed-text';
import { EASE_IN_OUT, EASE_OUT, SPRING_BOUNCE, fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import type { GuideStatus } from '@/hooks/use-guide-flow';
import type { Story } from '@/types/journal';

const TILE_WIDTH = 104;
const TILE_HEIGHT = 132;

interface TilePose {
  x: number;
  y: number;
  rotate: number;
}

/** Scattered start → stacked rest. Durations differ so no two tiles land together. */
const TILES: { from: TilePose; to: TilePose; duration: number; delay: number }[] = [
  { from: { x: -120, y: -40, rotate: -20 }, to: { x: -14, y: 8, rotate: -8 }, duration: 560, delay: 0 },
  { from: { x: 0, y: -90, rotate: 10 }, to: { x: 2, y: 0, rotate: 2 }, duration: 640, delay: 40 },
  { from: { x: 120, y: -30, rotate: 18 }, to: { x: 14, y: -6, rotate: 7 }, duration: 720, delay: 80 },
];

function lerp(from: number, to: number, p: number) {
  'worklet';
  return from + (to - from) * p;
}

interface StackTileProps {
  index: number;
  children: React.ReactNode;
}

function StackTile({ index, children }: StackTileProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { from, to, duration, delay } = TILES[index];
  const travel = useSharedValue(reduceMotion ? 1 : 0);
  const presence = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // Opacity resolves in a third of the travel time, so tiles are solid
    // well before they finish gliding into place.
    presence.value = withDelay(delay, withTiming(1, { duration: Math.round(duration / 3), easing: EASE_OUT }));
    travel.value = withDelay(delay, withTiming(1, { duration, easing: EASE_OUT }));
  }, [reduceMotion, delay, duration, presence, travel]);

  const style = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [
      { translateX: lerp(from.x, to.x, travel.value) },
      { translateY: lerp(from.y, to.y, travel.value) },
      { rotate: `${lerp(from.rotate, to.rotate, travel.value)}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.tile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.borderStrong, zIndex: index },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function PaperLines() {
  const theme = useTheme();
  return (
    <View style={styles.paper}>
      {[0.9, 0.75, 0.85, 0.5].map((widthFraction, line) => (
        <View
          key={line}
          style={[styles.paperLine, { width: `${widthFraction * 100}%`, backgroundColor: theme.textMuted }]}
        />
      ))}
    </View>
  );
}

const SAMPLE_A = RNImage.resolveAssetSource(require('../../../assets/images/guide-sample-1.jpg'))?.uri;
const SAMPLE_B = RNImage.resolveAssetSource(require('../../../assets/images/guide-sample-2.jpg'))?.uri;

interface ChapterStageProps {
  status: GuideStatus;
  chapter: Story | null;
  onNameChapter: () => void;
}

export function ChapterStage({ status, chapter, onNameChapter }: ChapterStageProps) {
  const theme = useTheme();
  const settle = useSharedValue(1);

  // Success beat: the stack swells slightly and settles once it has a name.
  useEffect(() => {
    if (!chapter) return;
    settle.value = withSequence(
      withTiming(1.05, { duration: 140, easing: EASE_IN_OUT }),
      withTiming(1, { duration: 320, easing: SPRING_BOUNCE }),
    );
  }, [chapter, settle]);

  const stackStyle = useAnimatedStyle(() => ({ transform: [{ scale: settle.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.stack, stackStyle]}>
        <StackTile index={0}>
          <Image source={{ uri: SAMPLE_A }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </StackTile>
        <StackTile index={1}>
          <PaperLines />
        </StackTile>
        <StackTile index={2}>
          <Image source={{ uri: SAMPLE_B }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </StackTile>
      </Animated.View>

      <Animated.View
        entering={riseIn(280, 620)}
        style={[styles.spine, { borderColor: chapter ? theme.text : theme.border }]}
      >
        <Book size={12} color={chapter ? theme.accentWarm : theme.textMuted} />
        <Animated.View key={chapter?.id ?? 'untitled'} entering={fadeIn(220)} exiting={fadeOut(120)}>
          <ThemedText
            style={[styles.spineText, { color: chapter ? theme.text : theme.textMuted }]}
            numberOfLines={1}
          >
            {chapter ? chapter.title.toUpperCase() : 'UNTITLED CHAPTER'}
          </ThemedText>
        </Animated.View>
      </Animated.View>

      <View style={styles.action}>
        {status === 'active' && (
          <Animated.View entering={riseIn(260, 760)} exiting={fadeOut()}>
            <ActionLink text={chapter ? 'START ANOTHER' : 'NAME YOUR CHAPTER'} onPress={onNameChapter} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  stack: {
    width: TILE_WIDTH + 60,
    height: TILE_HEIGHT + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  paper: {
    flex: 1,
    padding: 14,
    paddingTop: 20,
    gap: 9,
  },
  paperLine: {
    height: 3,
    borderRadius: 1.5,
    opacity: 0.45,
  },
  spine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 260,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  spineText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  action: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
