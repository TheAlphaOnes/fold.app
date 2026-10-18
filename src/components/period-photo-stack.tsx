/**
 * PeriodPhotoStack — up to three of the user's photos from one year, month
 * or day, fanned like prints on a desk. Sits beside a timeline divider so
 * scrolling into the past feels like opening an album.
 *
 * Each print lands on its own delay, duration and tilt. Results are cached
 * per period so a recycled divider never re-queries.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { getPeriodCovers, type DayCover, type PeriodGranularity } from '@/db/journal-repository';
import { SPRING_BOUNCE } from '@/constants/motion';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';

const PRINT_WIDTH = 30;
const PRINT_HEIGHT = 38;
const MAX_PRINTS = 3;

const POSES = [
  { rotate: -8, x: -12, delay: 160, duration: 300 },
  { rotate: 4, x: 0, delay: 200, duration: 340 },
  { rotate: 10, x: 12, delay: 240, duration: 380 },
];

const cache = new Map<string, DayCover[]>();

function printIn(index: number) {
  const pose = POSES[index];
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: 0 }, { translateY: 6 }, { rotate: '0deg' }, { scale: 0.7 }] },
    100: {
      opacity: 1,
      transform: [{ translateX: pose.x }, { translateY: 0 }, { rotate: `${pose.rotate}deg` }, { scale: 1 }],
      easing: SPRING_BOUNCE,
    },
  })
    .duration(pose.duration)
    .delay(pose.delay);
}

function Print({ cover, index }: { cover: DayCover; index: number }) {
  const theme = useTheme();
  const thumb = useVideoThumbnail(cover.type === 'video' ? cover.uri : undefined);
  const uri = cover.type === 'video' ? thumb : cover.uri;
  const pose = POSES[index];
  if (!uri) return null;
  return (
    <Animated.View
      entering={printIn(index)}
      style={[
        styles.print,
        {
          borderColor: theme.backgroundElement,
          zIndex: index,
          transform: [{ translateX: pose.x }, { rotate: `${pose.rotate}deg` }],
        },
      ]}
    >
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
    </Animated.View>
  );
}

export function PeriodPhotoStack({ granularity, period }: { granularity: PeriodGranularity; period: string }) {
  const key = `${granularity}:${period}`;
  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const [covers, setCovers] = useState<{ key: string; list: DayCover[] } | null>(() => {
    const cached = cache.get(key);
    return cached ? { key, list: cached } : null;
  });

  useEffect(() => {
    let cancelled = false;
    getPeriodCovers(granularity, period, MAX_PRINTS)
      .then((list) => {
        cache.set(key, list);
        if (!cancelled) setCovers({ key, list });
      })
      .catch((error) => console.error('Failed to load period photos', error));
    return () => {
      cancelled = true;
    };
  }, [granularity, period, key, hydrationVersion]);

  const list = covers?.key === key ? covers.list : [];
  if (list.length === 0) return null;

  return (
    <View style={styles.stack} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {list.map((cover, index) => (
        <Print key={`${key}-${index}`} cover={cover} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: PRINT_WIDTH + 28,
    height: PRINT_HEIGHT + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    position: 'absolute',
    width: PRINT_WIDTH,
    height: PRINT_HEIGHT,
    borderRadius: 3,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
});
