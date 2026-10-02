import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Image } from "expo-image";
import { Play, Music, Pause } from "lucide-react-native";
import { VinylRecord } from "@/components/vinyl-record";
import { Gesture, GestureDetector, type ComposedGesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  Easing,
  type AnimatedStyle,
} from "react-native-reanimated";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";
import type { MediaElement } from "@/types/journal";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import { useTheme } from "@/hooks/use-theme";
import { useHaptics } from "@/hooks/use-haptics";

interface DraggableStickerProps {
  media: MediaElement;
  onDragEnd: (id: string, x: number, y: number, scale?: number) => void;
  /** Fired on a quick tap to raise this sticker above its siblings. */
  onFront?: (id: string) => void;
  cardWidth: number;
  cardHeight: number;
  compositionId: number;
  isFirstAudio?: boolean;
}

/** How long a touch must rest on a sticker before the drag lifts it. */
const LIFT_HOLD_MS = 220;
/** zIndex while dragging — above every resting sticker and the badge row. */
const DRAG_Z_INDEX = 100;

/**
 * Clamp a sticker's translation so its scaled footprint stays inside the
 * card. The transform scales around the sticker's center, so a scale of `s`
 * grows the visual box to w*s x h*s while shifting its edges by w*(s-1)/2.
 * When a dimension cannot fit at all, the sticker is centered on that axis.
 */
function clampStickerBox(
  x: number,
  y: number,
  s: number,
  boxWidth: number,
  boxHeight: number,
  w: number,
  h: number,
): { x: number; y: number } {
  'worklet';
  const minX = (w * (s - 1)) / 2;
  const maxX = boxWidth - (w * (s + 1)) / 2;
  const minY = (h * (s - 1)) / 2;
  const maxY = boxHeight - (h * (s + 1)) / 2;
  return {
    x: maxX < minX ? (boxWidth - w) / 2 : Math.max(minX, Math.min(x, maxX)),
    y: maxY < minY ? (boxHeight - h) / 2 : Math.max(minY, Math.min(y, maxY)),
  };
}

/** The exact shape produced by the sticker's useAnimatedStyle worklet. */
type StickerAnimatedStyle = {
  position: "absolute";
  left: number;
  top: number;
  transform: ({ translateX: number } | { translateY: number } | { scale: number })[];
  zIndex: number;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
};

import { useJournalStore } from "@/hooks/use-journal";
import { useSettingsStore } from "@/hooks/use-settings";

function CanvasAudioSticker({
  media,
  composedGesture,
  animatedStyle,
  compositionId,
  isFirstAudio = true,
  onFront,
}: {
  media: MediaElement;
  composedGesture: ComposedGesture;
  animatedStyle: AnimatedStyle<StickerAnimatedStyle>;
  compositionId: number;
  isFirstAudio?: boolean;
  onFront?: (id: string) => void;
}) {
  const theme = useTheme();
  const player = useAudioPlayer(media.uri);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  // Guard: only attempt play when player has fully loaded the source
  const isLoaded = status.isLoaded;
  const activeCompositionId = useJournalStore((s) => s.activeCompositionId);
  const isAppVisible = useJournalStore((s) => s.isAppVisible);
  const autoPlayMusic = useSettingsStore((s) => s.settings.autoPlayMusic);
  const autoPlayMusicRef = React.useRef(autoPlayMusic);
  const hasAutoPlayed = React.useRef(false);
  const pathname = usePathname();
  const isHomeScreen = pathname === "/";
  const posthog = usePostHog();
  const hasTrackedPlay = React.useRef(false);

  // Safe play — seek to start if track ended naturally, then play
  const safeTryPlay = React.useCallback(() => {
    if (!isLoaded) return;
    try {
      const dur = player.duration ?? 0;
      const cur = player.currentTime ?? 0;
      if (dur > 0 && cur >= dur - 0.5) {
        player.seekTo(0);
      }
      player.play();
    } catch (e) {}
  }, [isLoaded, player]);

  useEffect(() => {
    autoPlayMusicRef.current = autoPlayMusic;
  }, [autoPlayMusic]);

  useEffect(() => {
    if (activeCompositionId === compositionId && isHomeScreen) {
      if (
        isAppVisible &&
        autoPlayMusicRef.current &&
        isFirstAudio &&
        !hasAutoPlayed.current &&
        !isPlaying &&
        isLoaded
      ) {
        hasAutoPlayed.current = true;
        safeTryPlay();
        if (!hasTrackedPlay.current) {
          posthog?.capture("Audio Played", {
            context: "canvas_sticker",
            auto_play: true,
          });
          hasTrackedPlay.current = true;
        }
      }
    } else {
      if (!isHomeScreen) {
        hasAutoPlayed.current = false;
      } else {
        hasAutoPlayed.current = false; // Reset when scrolled away
      }

      if (isPlaying) {
        try {
          player.pause();
        } catch (e) {}
      }
    }
  }, [
    activeCompositionId,
    compositionId,
    isPlaying,
    isLoaded,
    player,
    isFirstAudio,
    isHomeScreen,
    safeTryPlay,
  ]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (e) {}
    };
  }, [player]);

  // GestureDetector hot-swaps callbacks onto the same native handlers when
  // the gesture object is rebuilt (same shape), so reading state directly in
  // these closures is safe and always current.
  const tapGesture = Gesture.Tap()
    // Only a tap shorter than the drag-lift hold counts, so hold-to-drag
    // never toggles playback.
    .maxDuration(LIFT_HOLD_MS)
    // eslint-disable-next-line react-hooks/refs -- RNGH invokes this from a native tap event after render (.runOnJS(true)); the compiler cannot see that. The refs must persist across renders without re-rendering.
    .onEnd(() => {
      if (isPlaying) {
        try {
          player.pause();
        } catch {}
      } else {
        // If track ended naturally, allow it to restart
        const dur = player.duration ?? 0;
        const cur = player.currentTime ?? 0;
        if (dur > 0 && cur >= dur - 0.5) {
          hasAutoPlayed.current = false;
        }
        safeTryPlay();
        if (!hasTrackedPlay.current) {
          posthog?.capture("Audio Played", {
            context: "canvas_sticker",
            auto_play: false,
          });
          hasTrackedPlay.current = true;
        }
      }
      onFront?.(media.id);
    })
    .runOnJS(true);

  const finalGesture = Gesture.Simultaneous(composedGesture, tapGesture);

  return (
    <GestureDetector gesture={finalGesture}>
      <Animated.View
        style={[
          styles.musicVerticalCard,
          animatedStyle,
          { width: 140, height: 180 },
        ]}
      >
        <View style={styles.musicVerticalArtContainer}>
          <Image source={{ uri: media.metadata?.artwork?.replace('100x100', '300x300') }} style={styles.musicVerticalArt} contentFit="cover" />
          {isPlaying && (
            <View style={styles.musicVerticalIcon}>
              <Pause size={36} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.musicVerticalTextContainer}>
          <Text
            style={[
              styles.musicVerticalTitle,
              {
                color: theme.text,
                textShadowColor:
                  theme.background === "#0F0F0F"
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(255,255,255,0.8)",
              },
            ]}
            numberOfLines={1}
          >
            {media.metadata?.title}
          </Text>
          <Text
            style={[
              styles.musicVerticalArtist,
              {
                color: theme.textSecondary,
                textShadowColor:
                  theme.background === "#0F0F0F"
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(255,255,255,0.8)",
              },
            ]}
            numberOfLines={1}
          >
            {media.metadata?.artist}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function DraggableSticker({
  media,
  onDragEnd,
  onFront,
  cardWidth,
  cardHeight,
  compositionId,
  isFirstAudio,
}: DraggableStickerProps) {
  const theme = useTheme();
  const { selection, impact } = useHaptics();
  const videoThumbnailUri = useVideoThumbnail(
    media.type === "video" ? media.uri : undefined,
  );

  // The music sticker renders a fixed 140x180 card; everything else is
  // 90x120 (portrait) or 120x90 (landscape). Clamping must use the real
  // footprint or the sticker can be dragged visually out of bounds.
  const isMusicSticker = media.type === "audio" && Boolean(media.metadata);
  const isHorizontal = media.width && media.height ? media.width > media.height : false;
  const STICKER_WIDTH = isMusicSticker ? 140 : isHorizontal ? 120 : 90;
  const STICKER_HEIGHT = isMusicSticker ? 180 : isHorizontal ? 90 : 120;
  // Clamp initial positions just in case they spawned out of bounds
  const start = clampStickerBox(
    media.x_pos,
    media.y_pos,
    media.scale ?? 1,
    cardWidth,
    cardHeight,
    STICKER_WIDTH,
    STICKER_HEIGHT,
  );

  const translateX = useSharedValue(start.x);
  const translateY = useSharedValue(start.y);
  const isDragging = useSharedValue(false);
  const pinchActive = useSharedValue(false);

  // Scale for pinch
  const baseScale = useSharedValue(media.scale ?? 1);
  const savedBaseScale = useSharedValue(media.scale ?? 1);

  // Lift choreography: two segments that finish at different rates — the
  // scale pops quickly while the shadow ramps in slower, so lifting a
  // sticker reads as a physical event instead of one uniform fade.
  const dragScale = useSharedValue(1);
  const liftLevel = useSharedValue(0);
  const restingZ = useDerivedValue(() => media.zIndex ?? 1, [media.zIndex]);

  // Keep track of where the drag started so we can calculate relative movement
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .hitSlop(10)
    // Lift-to-drag: activating after a short hold instead of after 15px
    // of movement means the vertical timeline scroll can never win the
    // race for a sticker drag. Moving before the hold completes fails the
    // gesture and the list scrolls normally.
    .activateAfterLongPress(LIFT_HOLD_MS)
    .onStart(() => {
      isDragging.value = true;
      dragScale.value = withTiming(1.05, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
      liftLevel.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      runOnJS(selection)();
    })
    .onUpdate((event) => {
      // Clamp against the scaled footprint so dragging a zoomed sticker
      // keeps all of it on the card.
      const next = clampStickerBox(
        contextX.value + event.translationX,
        contextY.value + event.translationY,
        baseScale.value,
        cardWidth,
        cardHeight,
        STICKER_WIDTH,
        STICKER_HEIGHT,
      );
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      runOnJS(impact)("light");
    })
    // onFinalize runs on both success and cancellation — committing here
    // means a cancelled drag no longer strands the sticker between its
    // on-screen position and its stored one.
    .onFinalize(() => {
      if (!isDragging.value) return;
      isDragging.value = false;
      dragScale.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
      liftLevel.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      runOnJS(onDragEnd)(
        media.id,
        translateX.value,
        translateY.value,
        baseScale.value,
      );
    });

  const pinchGesture = Gesture.Pinch()
    .hitSlop(10)
    .onStart(() => {
      pinchActive.value = true;
      // Same elevation cue as a drag lift, but without the scale pop so
      // the size feedback stays pure while resizing.
      liftLevel.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      runOnJS(selection)();
    })
    .onUpdate((event) => {
      baseScale.value = Math.max(
        0.5,
        Math.min(savedBaseScale.value * event.scale, 3),
      );
      // While the pan is active (drag and resize at once) the pan owns
      // the position; during a pure pinch, keep the scaled footprint
      // inside the card as it grows so nothing drifts under the clip.
      if (isDragging.value) return;
      const clamped = clampStickerBox(
        translateX.value,
        translateY.value,
        baseScale.value,
        cardWidth,
        cardHeight,
        STICKER_WIDTH,
        STICKER_HEIGHT,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      runOnJS(impact)("light");
    })
    .onFinalize(() => {
      if (!pinchActive.value) return;
      pinchActive.value = false;
      savedBaseScale.value = baseScale.value;
      if (!isDragging.value) {
        const clamped = clampStickerBox(
          translateX.value,
          translateY.value,
          baseScale.value,
          cardWidth,
          cardHeight,
          STICKER_WIDTH,
          STICKER_HEIGHT,
        );
        translateX.value = clamped.x;
        translateY.value = clamped.y;
        liftLevel.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      }
      runOnJS(onDragEnd)(
        media.id,
        translateX.value,
        translateY.value,
        baseScale.value,
      );
    });

  const frontTap = onFront
    ? Gesture.Tap()
        // Short taps only — a touch held long enough to lift the sticker for
        // dragging must not count as a tap.
        .maxDuration(LIFT_HOLD_MS)
        .onEnd(() => {
          selection();
          onFront(media.id);
        })
        .runOnJS(true)
    : null;

  const dragGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const composed = frontTap
    ? Gesture.Simultaneous(panGesture, pinchGesture, frontTap)
    : dragGesture;

  const animatedStyle = useAnimatedStyle((): StickerAnimatedStyle => {
    return {
      position: "absolute",
      left: 0,
      top: 0,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: baseScale.value * dragScale.value },
      ],
      zIndex: isDragging.value ? DRAG_Z_INDEX : restingZ.value,
      shadowOpacity: 0.05 + liftLevel.value * 0.15,
      shadowRadius: 4 + liftLevel.value * 8,
      shadowOffset: { width: 0, height: 2 + liftLevel.value * 6 },
    };
  });

  if (isMusicSticker) {
    return (
      <CanvasAudioSticker
        media={media}
        composedGesture={dragGesture}
        animatedStyle={animatedStyle}
        compositionId={compositionId}
        isFirstAudio={isFirstAudio}
        onFront={onFront}
      />
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.sticker,
          { width: STICKER_WIDTH, height: STICKER_HEIGHT },
          media.type !== "audio" && {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.borderStrong,
            borderWidth: 3,
          },
          media.type === "audio" && {
            backgroundColor: "transparent",
            borderWidth: 0,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.innerFrame}>
          {media.type === "audio" ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "transparent",
                },
              ]}
            >
              <VinylRecord
                size={90}
                isPlaying={false}
                isRecording={false}
                imageUrl={media.metadata?.artwork}
              />
            </View>
          ) : (
            <Image
              source={{
                uri:
                  media.type === "video" && videoThumbnailUri
                    ? videoThumbnailUri
                    : media.uri,
              }}
              style={styles.image}
              contentFit="cover"
            />
          )}

          {media.type === "video" && (
            <View style={styles.videoOverlay}>
              <Play size={24} color="#FFF" fill="#FFF" />
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  sticker: {
    width: 90, // Reverted to default small size
    height: 120,
    shadowColor: "#000",
  },
  innerFrame: {
    flex: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  musicVerticalCard: {
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  musicVerticalArtContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  musicVerticalArt: {
    width: "100%",
    height: "100%",
  },
  musicVerticalIcon: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  musicVerticalTextContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  musicVerticalTitle: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicVerticalArtist: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    marginTop: 2,
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
