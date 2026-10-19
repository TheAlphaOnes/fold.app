/**
 * CalendarDayPhoto — the photo that fills a calendar day which has one.
 * Videos show their generated thumbnail. A soft scrim keeps the day number
 * legible over any image. Each photo fades in natively as it finishes
 * decoding, so a month fills up as its photos arrive — without a layout
 * animation per day, which made the profile slow to open.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { DayCover } from '@/db/journal-repository';

export function CalendarDayPhoto({ cover, pressed }: { cover: DayCover; pressed: boolean }) {
  const thumb = useVideoThumbnail(cover.type === 'video' ? cover.uri : undefined);
  const uri = cover.type === 'video' ? thumb : cover.uri;
  if (!uri) return null;

  return (
    <View style={styles.fill} pointerEvents="none">
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={260} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: pressed ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]} />
    </View>
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
