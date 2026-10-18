/**
 * AmbientBackdrop — the centred memory's own colour, washed behind the feed.
 *
 * Takes the active memory's first photo (or video thumbnail; GIFs skipped),
 * blurs it and lays it under the cards at low opacity. Text-only and voice
 * memories leave the plain background, so the colour only ever comes from
 * what the user captured.
 *
 * Performance: one image layer, blur capped at 8px (the project's GPU budget
 * for blur), crossfades handled natively by expo-image. Presence (whether
 * there is any colour) eases separately from the image swap, so moving from
 * a photo to a text memory fades out more slowly than photos crossfade.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { EASE_OUT } from '@/constants/motion';
import { useJournalStore } from '@/hooks/use-journal';
import { useThemeContext } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { isGifMedia } from '@/utils/media-kind';

const BLUR_RADIUS = 8;
const OPACITY_DARK = 0.28;
const OPACITY_LIGHT = 0.18;

export function AmbientBackdrop() {
  const { isDark } = useThemeContext();
  const activeId = useJournalStore((state) => state.activeCompositionId);
  const memory = useJournalStore((state) => (activeId !== null ? state.hydratedById[activeId] : undefined));

  const visual = memory?.mediaElements.find(
    (m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m),
  );
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const uri = visual?.type === 'video' ? videoThumb : visual?.uri;

  const presence = useSharedValue(0);
  useEffect(() => {
    presence.value = withTiming(uri ? 1 : 0, { duration: uri ? 500 : 700, easing: EASE_OUT });
  }, [uri, presence]);

  const style = useAnimatedStyle(() => ({
    opacity: presence.value * (isDark ? OPACITY_DARK : OPACITY_LIGHT),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, styles.image]}
          contentFit="cover"
          blurRadius={BLUR_RADIUS}
          cachePolicy="memory-disk"
          transition={{ duration: 450, effect: 'cross-dissolve' }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Slight overscan hides the soft, darkened edge a blur leaves at the frame.
  image: {
    transform: [{ scale: 1.15 }],
  },
});
