/**
 * AmbientBackdrop — the centred memory's own colour, washed behind the feed.
 *
 * Takes the active memory's first photo (or video thumbnail; GIFs skipped),
 * blurs it and lays it under the cards. Text-only and voice memories leave
 * the plain background, so the colour only ever comes from what the user
 * captured. Strength follows the Background Glow setting.
 *
 * Transitions are deliberately unhurried in both directions: presence eases
 * in over 900ms and out over 1100ms, and photo-to-photo swaps cross-dissolve
 * over 900ms. The last photo is kept while fading out, so moving onto a text
 * memory no longer drops the image in a single frame.
 *
 * Performance: the photo is drawn into a box 1/8 of the screen and scaled
 * up on the GPU. expo-image decodes to the size it is drawn at, so a 12MP
 * camera photo becomes a ~135×300 bitmap and the blur runs over 1/64 of
 * the pixels — decoding and blurring at full size on every swap is what
 * made the feed stutter on Android. Upscaling a tiny image is itself a
 * soft blur, so the look is unchanged. Crossfades are native to expo-image.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { useThemeContext } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { isGifMedia } from '@/utils/media-kind';

/** The photo is decoded and blurred at 1/DOWNSCALE of the screen, then scaled back up. */
const DOWNSCALE = 8;
/** In downscaled pixels; the upscale adds the rest of the softness. */
const BLUR_RADIUS = 2;
/** Slight overscan hides the soft, darkened edge a blur leaves at the frame. */
const OVERSCAN = 1.15;
const FADE_IN_MS = 900;
const FADE_OUT_MS = 1100;
const CROSSFADE_MS = 900;

/**
 * Opacity at full intensity. Light mode needs more: a photo over a white
 * page washes out far faster than over near-black.
 */
const MAX_OPACITY_DARK = 0.7;
const MAX_OPACITY_LIGHT = 0.75;

export function AmbientBackdrop() {
  const { isDark } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const intensity = useSettingsStore((state) => state.settings.backdropIntensity);
  const activeId = useJournalStore((state) => state.activeCompositionId);
  const memory = useJournalStore((state) => (activeId !== null ? state.hydratedById[activeId] : undefined));

  const visual = memory?.mediaElements.find(
    (m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m),
  );
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const uri = intensity > 0 ? (visual?.type === 'video' ? videoThumb : visual?.uri) ?? null : null;

  // Keep showing the last photo while the layer fades out; it is cleared
  // only once the fade has finished.
  const [shownUri, setShownUri] = useState<string | null>(uri);
  if (uri && uri !== shownUri) setShownUri(uri);
  const presence = useSharedValue(0);

  useEffect(() => {
    if (uri) {
      presence.set(withTiming(1, { duration: FADE_IN_MS, easing: Easing.inOut(Easing.cubic) }));
    } else {
      presence.set(
        withTiming(0, { duration: FADE_OUT_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setShownUri)(null);
        }),
      );
    }
  }, [uri, presence]);

  const maxOpacity = (isDark ? MAX_OPACITY_DARK : MAX_OPACITY_LIGHT) * intensity;
  const style = useAnimatedStyle(() => ({ opacity: presence.get() * maxOpacity }));

  const small = { width: Math.ceil(width / DOWNSCALE), height: Math.ceil(height / DOWNSCALE) };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.center, style]} pointerEvents="none">
      {shownUri ? (
        <View style={[small, { transform: [{ scale: DOWNSCALE * OVERSCAN }] }]}>
          <Image
            source={{ uri: shownUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={BLUR_RADIUS}
            cachePolicy="memory-disk"
            transition={{ duration: CROSSFADE_MS, effect: 'cross-dissolve' }}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
