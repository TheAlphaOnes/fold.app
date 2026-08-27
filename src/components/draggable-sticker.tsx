import React, { useEffect } from "react";
import { StyleSheet, View, Text, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { Play, Music, Pause } from "lucide-react-native";
import { VinylRecord } from "@/components/vinyl-record";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";
import type { MediaElement } from "@/types/journal";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import { useTheme } from "@/hooks/use-theme";

interface DraggableStickerProps {
  media: MediaElement;
  onDragEnd: (id: string, x: number, y: number, scale?: number) => void;
  cardWidth: number;
  cardHeight: number;
  compositionId: number;
  isFirstAudio?: boolean;
}

import { useJournalStore } from "@/hooks/use-journal";
import { useSettingsStore } from "@/hooks/use-settings";

function CanvasAudioSticker({
  media,
  composedGesture,
  animatedStyle,
  compositionId,
  isFirstAudio = true,
}: {
  media: MediaElement;
  composedGesture: any;
  animatedStyle: any;
  compositionId: number;
  isFirstAudio?: boolean;
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

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      if (isPlaying) {
        try {
          player.pause();
        } catch (e) {}
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
  cardWidth,
  cardHeight,
  compositionId,
  isFirstAudio,
}: DraggableStickerProps) {
  const theme = useTheme();
  const videoThumbnailUri = useVideoThumbnail(
    media.type === "video" ? media.uri : undefined,
  );

  const isHorizontal = media.width && media.height ? media.width > media.height : false;
  const STICKER_WIDTH = isHorizontal ? 120 : 90;
  const STICKER_HEIGHT = isHorizontal ? 90 : 120;
  // Clamp initial positions just in case they spawned out of bounds
  const clampedStartX = Math.max(
    0,
    Math.min(media.x_pos, cardWidth - STICKER_WIDTH),
  );
  const clampedStartY = Math.max(
    0,
    Math.min(media.y_pos, cardHeight - STICKER_HEIGHT),
  );

  const translateX = useSharedValue(clampedStartX);
  const translateY = useSharedValue(clampedStartY);
  const isDragging = useSharedValue(false);

  // Scale for pinch
  const baseScale = useSharedValue(media.scale ?? 1);
  const savedBaseScale = useSharedValue(media.scale ?? 1);

  // Scale for drag pop
  const activeScale = useSharedValue(1);

  // Keep track of where the drag started so we can calculate relative movement
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .hitSlop(10)
    .minDistance(15) // Requires 15px of movement before claiming, allowing FlatList scroll to win
    .onStart(() => {
      isDragging.value = true;
      activeScale.value = withTiming(1.02, { duration: 150 });
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = cardWidth - STICKER_WIDTH;
      const maxY = cardHeight - STICKER_HEIGHT;

      let nextX = contextX.value + event.translationX;
      let nextY = contextY.value + event.translationY;

      translateX.value = Math.max(0, Math.min(nextX, maxX));
      translateY.value = Math.max(0, Math.min(nextY, maxY));
    })
    .onEnd(() => {
      isDragging.value = false;
      activeScale.value = withTiming(1, { duration: 200 });
      runOnJS(onDragEnd)(
        media.id,
        translateX.value,
        translateY.value,
        baseScale.value,
      );
    });

  const pinchGesture = Gesture.Pinch()
    .hitSlop(10) 
    .onUpdate((event) => {
      baseScale.value = Math.max(
        0.5,
        Math.min(savedBaseScale.value * event.scale, 3),
      );
    })
    .onEnd(() => {
      savedBaseScale.value = baseScale.value;
      runOnJS(onDragEnd)(
        media.id,
        translateX.value,
        translateY.value,
        baseScale.value,
      );
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: 0,
      top: 0,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: baseScale.value * activeScale.value },
      ],
      zIndex: isDragging.value ? 10 : 1,
      shadowOpacity: isDragging.value ? 0.2 : 0.05,
      shadowRadius: isDragging.value ? 12 : 4,
      shadowOffset: { width: 0, height: isDragging.value ? 8 : 2 },
    };
  });

  if (media.type === "audio" && media.metadata) {
    return (
      <CanvasAudioSticker
        media={media}
        composedGesture={composed}
        animatedStyle={animatedStyle}
        compositionId={compositionId}
        isFirstAudio={isFirstAudio}
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
