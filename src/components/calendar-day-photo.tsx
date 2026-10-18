/**
 * CalendarDayPhoto — the photo that fills a calendar day which has one.
 * Videos show their generated thumbnail. A soft scrim keeps the day number
 * legible over any image. Fades in with a small per-day delay so a month
 * visibly fills up when it appears.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';

import { fadeIn } from '@/constants/motion';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { DayCover } from '@/db/journal-repository';

const STAGGER_MS = 20;

export function CalendarDayPhoto({ cover, dayNumber, pressed }: { cover: DayCover; dayNumber: number; pressed: boolean }) {
  const thumb = useVideoThumbnail(cover.type === 'video' ? cover.uri : undefined);
  const uri = cover.type === 'video' ? thumb : cover.uri;
  if (!uri) return null;

  return (
    <Animated.View entering={fadeIn(260, dayNumber * STAGGER_MS)} style={styles.fill} pointerEvents="none">
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: pressed ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    bottom: 1.5,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
