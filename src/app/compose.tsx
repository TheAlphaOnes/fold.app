/**
 * Compose Screen — full-page memory editor.
 *
 * Inspired by Google Journal's layout hierarchy:
 *   toolbar → date metadata → body text
 *
 * Adapted into Fold's Teenage Engineering aesthetic:
 *   monospace metadata, flat industrial UI, golden ratio spacing.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions,
  LayoutAnimation,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";
import { useJournalStore } from "@/hooks/use-journal";
import { consumePendingCameraMedia } from "@/utils/pending-camera-media";
import { useSettings } from "@/hooks/use-settings";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GrainBackground } from "@/components/grain-background";
import {
  X,
  Image as ImageIcon,
  PlayCircle,
  Mic,
  Type,
  MapPin,
  Music,
  Camera,
  Video,
  Smile,
  ChevronDown
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import {
  AudioModule,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { haptic } from '@/services/haptics';
import { RecordingOverlay } from "@/components/recording-overlay";
import type { MediaElement } from "@/types/journal";
import { dobYear } from "@/utils/dob";
import { MAX_MEDIA_ELEMENTS, type MediaKind } from "@/constants/media";
import {
  alertElementCap,
  alertFileTooLarge,
  alertMusicLimit,
  copyWithinFileSize,
  downloadWithinFileSize,
  getHighResArtwork,
  hasMusicElement,
  sliceToElementCap,
} from "@/utils/media-attach";
import { memoryTextMetrics } from "@/utils/memory-text";
import { arrangeStickers } from "@/utils/sticker-layout";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import { usePostHog } from "posthog-react-native";
import { MusicPicker } from "@/components/music-picker";
import { StoryPicker } from "@/components/story-picker";
import { ComposeBottomBar } from "@/components/compose/compose-bottom-bar";
import { InkButton, InkPalette } from "@/components/compose/ink-palette";
import { GifPicker } from "@/components/gif-picker";
import type { MusicTrack } from "@/hooks/use-music-store";
import { useStoriesStore } from "@/hooks/use-stories";
import { goBack } from '@/utils/navigation';

function ComposeMediaPreview({
  m,
  theme,
  onRemove,
  pending = false,
}: {
  m: MediaElement;
  theme: any;
  onRemove: () => void;
  /** Still downloading in the background. */
  pending?: boolean;
}) {
  const isVideo = m.type === "video";
  const videoThumbnailUri = useVideoThumbnail(isVideo ? m.uri : undefined);

  // A picked music track carries metadata with album artwork and previews
  // with its art; a voice recording has neither and keeps the mic tile.
  const artwork = m.metadata?.artwork;
  const musicArtworkUri =
    m.type === "audio" && artwork
      ? getHighResArtwork(artwork)
      : undefined;
  
  return (
    <View style={styles.mediaPreviewWrapper}>
      {m.type === "audio" && !musicArtworkUri ? (
        <View
          style={[
            styles.mediaPreviewImage,
            {
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.backgroundElement,
            },
          ]}
        >
          <Mic size={24} color={theme.text} />
        </View>
      ) : (
        <Image
          source={{
            uri:
              isVideo && videoThumbnailUri
                ? videoThumbnailUri
                : musicArtworkUri ?? m.uri,
          }}
          style={styles.mediaPreviewImage}
          contentFit="cover"
        />
      )}

      {(isVideo || musicArtworkUri) && (
        <View
          style={[
            styles.videoOverlay,
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          {isVideo ? (
            <PlayCircle size={28} color="rgba(255,255,255,0.9)" />
          ) : (
            <Music size={24} color="rgba(255,255,255,0.9)" />
          )}
        </View>
      )}

      {pending && (
        <View style={[StyleSheet.absoluteFill, styles.pendingOverlay]} pointerEvents="none">
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}

      {/* Small X button to remove this specific media */}
      <Pressable style={styles.removeMediaButton} onPress={onRemove}>
        <X size={12} color="#FFF" />
      </Pressable>
    </View>
  );
}

function formatComposeDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatComposeTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ComposeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { sharedText, storyId: paramStoryId, editId, dateTimestamp } = useLocalSearchParams<{
    sharedText?: string;
    storyId?: string;
    editId?: string;
    dateTimestamp?: string;
  }>();

  const numericEditId = editId ? Number(editId) : null;
  const existingComposition = useJournalStore((state) =>
    numericEditId
      ? state.hydratedById[numericEditId] ||
        state.allCompositions.find((c) => c.id === numericEditId) ||
        state.compositions.find((c) => c.id === numericEditId)
      : null
  );

  const [showGifPicker, setShowGifPicker] = useState(false);

  const [body, setBody] = useState(existingComposition?.textContent ?? sharedText ?? "");
  const [storyIds, setStoryIds] = useState<number[]>(
    existingComposition?.storyIds ?? (paramStoryId ? [Number(paramStoryId)] : [])
  );

  const [locationName, setLocationName] = useState<string | undefined>(
    existingComposition?.location?.name
  );
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | undefined>(
    existingComposition?.location?.latitude && existingComposition?.location?.longitude
      ? { lat: existingComposition.location.latitude, lng: existingComposition.location.longitude }
      : undefined
  );

  const [mediaElements, setMediaElements] = useState<MediaElement[]>(() => {
    if (existingComposition?.mediaElements) {
      return existingComposition.mediaElements;
    }
    const pendingMedia = consumePendingCameraMedia();
    if (pendingMedia) {
      const stickerSize = 120;
      const safeW = screenWidth - 60 - stickerSize;
      const safeH =
        Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;

      return [
        {
          id: Math.random().toString(36).substring(2, 9),
          uri: pendingMedia.uri,
          type: pendingMedia.type,
          x_pos: 30 + Math.random() * safeW,
          y_pos: 30 + Math.random() * safeH,
          width: pendingMedia.width,
          height: pendingMedia.height,
        },
      ];
    }
    return [];
  });
  const [fontFamily, setFontFamily] = useState(existingComposition?.fontFamily ?? "JetBrainsMono-Medium");
  const [fontSize, setFontSize] = useState(existingComposition?.fontSize ?? 21);
  const [textColor, setTextColor] = useState<string | null>(existingComposition?.textColor ?? null);
  const [isInkOpen, setIsInkOpen] = useState(false);

  // Sync state if existingComposition resolves later
  useEffect(() => {
    if (existingComposition) {
      setBody(existingComposition.textContent);
      setMediaElements(existingComposition.mediaElements || []);
      setFontFamily(existingComposition.fontFamily || "JetBrainsMono-Medium");
      setFontSize(existingComposition.fontSize || 21);
      setTextColor(existingComposition.textColor ?? null);
      if (existingComposition.location?.name) {
        setLocationName(existingComposition.location.name);
      }
      if (existingComposition.location?.latitude && existingComposition.location?.longitude) {
        setLocationCoords({ lat: existingComposition.location.latitude, lng: existingComposition.location.longitude });
      }
      if (existingComposition.storyIds) {
        setStoryIds(existingComposition.storyIds);
      }
    }
  }, [existingComposition]);

  const { addComposition, updateComposition } = useJournalStore();
  const { settings } = useSettings();
  const posthog = usePostHog();
  const [isSaving, setIsSaving] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isMusicPickerVisible, setIsMusicPickerVisible] = useState(false);
  
  // storyId is declared above
  const [isStoryPickerVisible, setIsStoryPickerVisible] = useState(false);
  const { stories } = useStoriesStore();

  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsFetchingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const name =
          place.city || place.subregion || place.region || place.country;
        if (name) setLocationName(name);
      }
    } catch (e) {
      console.log("Failed to fetch location", e);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (settings.autoLocationTagging) {
      fetchLocation();
    }
  }, [settings.autoLocationTagging]);

  const AVAILABLE_FONTS = [
    { id: "JetBrainsMono-Medium", name: "MONO" },
    { id: "BitcountGridDouble-Light", name: "BITCOUNT" },
    { id: "RockSalt-Regular", name: "ROCK SALT" },
    { id: "BigelowRules-Regular", name: "BIGELOW" },
    { id: "RubikGlitchPop-Regular", name: "GLITCH" },
    { id: "Ewert-Regular", name: "EWERT" },
    { id: "RubikDoodleShadow-Regular", name: "DOODLE" },
    { id: "Cookiemonster-gv11", name: "MONSTER" },
    { id: "PlayfairDisplay_400Regular", name: "PLAYFAIR" },
    { id: "SpaceGrotesk_400Regular", name: "GROTESK" },
    { id: "BebasNeue_400Regular", name: "BEBAS" },
    { id: "Caveat_400Regular", name: "CAVEAT" },
    { id: "DancingScript_400Regular", name: "DANCING" },
    { id: "Righteous_400Regular", name: "FUNKY" },
    { id: "Pacifico_400Regular", name: "PACIFICO" },
    { id: "PermanentMarker_400Regular", name: "MARKER" },
    { id: "AmaticSC_700Bold", name: "SKETCH" },
    { id: "PressStart2P_400Regular", name: "RETRO" },
  ];

  const FONT_SIZES = [
    { id: 16, name: "S" },
    { id: 21, name: "M" },
    { id: 28, name: "L" },
    { id: 40, name: "XL" },
    { id: 56, name: "XXL" },
  ];

  const cycleFont = () => {
    haptic.select();
    const currentIndex = AVAILABLE_FONTS.findIndex((f) => f.id === fontFamily);
    const nextFont =
      AVAILABLE_FONTS[(currentIndex + 1) % AVAILABLE_FONTS.length];
    setFontFamily(nextFont.id);
  };

  const cycleSize = () => {
    haptic.select();
    const currentIndex = FONT_SIZES.findIndex((s) => s.id === fontSize);
    const nextSize = FONT_SIZES[(currentIndex + 1) % FONT_SIZES.length];
    setFontSize(nextSize.id);
  };

  const currentFontName =
    AVAILABLE_FONTS.find((f) => f.id === fontFamily)?.name || "MONO";
  const currentSizeName =
    FONT_SIZES.find((s) => s.id === fontSize)?.name || "M";

  const targetTimestamp = useMemo(() => {
    if (existingComposition?.createdAt) return existingComposition.createdAt;
    if (dateTimestamp) {
      const parsed = parseInt(dateTimestamp, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }, [existingComposition, dateTimestamp]);

  const now = useMemo(() => (targetTimestamp ? new Date(targetTimestamp) : new Date()), [targetTimestamp]);
  const dateString = useMemo(() => formatComposeDate(now), [now]);
  const timeString = useMemo(() => formatComposeTime(now), [now]);

  // A post must have either text OR media to be saveable
  const canSave =
    (body.trim().length > 0 || mediaElements.length > 0) && !isSaving;

  const handleAttachMedia = async () => {
    haptic.tap();
    try {
      if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
        alertElementCap();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const { accepted: assets, capped } = sliceToElementCap(
          mediaElements.length,
          result.assets,
        );
        if (capped) alertElementCap();

        const oversized: Record<MediaKind, number> = {
          image: 0,
          video: 0,
          audio: 0,
        };

        const newMedia = await Promise.all(
          assets.map(async (asset): Promise<MediaElement | null> => {
            const kind: MediaKind = asset.type === "video" ? "video" : "image";

            // Generate a random initial layout position.
            const stickerSize = 120;
            const safeW = screenWidth - 60 - stickerSize;
            const safeH =
              Math.min(screenWidth * 1.618, screenHeight * 0.78) -
              stickerSize -
              60;

            // Determine extension and copy to safe document directory
            const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
            const ext = extMatch
              ? extMatch[1].toLowerCase()
              : asset.type === "video"
                ? "mp4"
                : "jpg";
            const dest = `${FileSystem.documentDirectory}picked_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const copied = await copyWithinFileSize({
              from: asset.uri,
              to: dest,
              kind,
              knownSizeBytes: asset.fileSize,
            });
            if (!copied) {
              oversized[kind] += 1;
              return null;
            }

            return {
              id: Math.random().toString(36).substring(2, 9),
              uri: dest,
              type: asset.type === "video" ? "video" : "image",
              x_pos: 30 + Math.random() * safeW,
              y_pos: 30 + Math.random() * safeH,
              width: asset.width,
              height: asset.height,
            };
          }),
        );

        const attached = newMedia.filter((m) => m !== null);
        if (attached.length > 0) {
          setMediaElements((prev) => [...prev, ...attached]);
        }
        for (const kind of ["image", "video"] as MediaKind[]) {
          if (oversized[kind] > 0) alertFileTooLarge(kind, oversized[kind]);
        }
      }
    } catch (error) {
      console.error("Failed to pick media:", error);
    }
  };

  const handleCapturePhoto = async () => {
    haptic.tap();
    try {
      if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
        alertElementCap();
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const stickerSize = 120;
        const safeW = screenWidth - 60 - stickerSize;
        const safeH = Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;

        const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const copied = await copyWithinFileSize({
          from: asset.uri,
          to: dest,
          kind: "image",
          knownSizeBytes: asset.fileSize,
        });
        if (!copied) {
          alertFileTooLarge("image");
          return;
        }

        setMediaElements((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            uri: dest,
            type: "image",
            x_pos: 30 + Math.random() * safeW,
            y_pos: 30 + Math.random() * safeH,
            width: asset.width,
            height: asset.height,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
    }
  };

  const handleCaptureVideo = async () => {
    haptic.tap();
    try {
      if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
        alertElementCap();
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const stickerSize = 120;
        const safeW = screenWidth - 60 - stickerSize;
        const safeH = Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;

        const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
        const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const copied = await copyWithinFileSize({
          from: asset.uri,
          to: dest,
          kind: "video",
          knownSizeBytes: asset.fileSize,
        });
        if (!copied) {
          alertFileTooLarge("video");
          return;
        }

        setMediaElements((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            uri: dest,
            type: "video",
            x_pos: 30 + Math.random() * safeW,
            y_pos: 30 + Math.random() * safeH,
            width: asset.width,
            height: asset.height,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to capture video:", error);
    }
  };



  // Songs being downloaded in the background, by element id. Save waits for
  // these so a memory never stores a remote preview URL.
  const pendingMusic = useRef(new Map<string, Promise<void>>());
  // Outcomes of finished downloads, applied at save time (state from the
  // save's closure would still hold the remote URLs).
  const resolvedMusic = useRef(new Map<string, { uri: string; artwork: string | null }>());
  const failedMusic = useRef(new Set<string>());
  const [pendingMusicIds, setPendingMusicIds] = useState<ReadonlySet<string>>(() => new Set());

  /**
   * Attach a chosen song instantly, then download it. The element appears at
   * once with its remote preview and artwork (both playable/displayable), and
   * is swapped to the local copies when they land. If the preview cannot be
   * fetched, the song is removed and the user is told why.
   */
  const handleAttachMusic = (track: MusicTrack) => {
    if (hasMusicElement(mediaElements)) {
      alertMusicLimit();
      return;
    }
    if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
      alertElementCap();
      return;
    }

    const id = Math.random().toString(36).substring(2, 9);
    const stickerSize = 120;
    const safeW = screenWidth - 60 - stickerSize;
    const safeH = Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;
    // Always the 1000x1000 master so zooming stays crisp.
    const artworkUrl = getHighResArtwork(track.artworkUrl100) || track.artworkUrl100;

    haptic.success();
    setMediaElements((prev) => [
      ...prev,
      {
        id,
        uri: track.previewUrl,
        type: "audio",
        x_pos: 30 + Math.random() * safeW,
        y_pos: 30 + Math.random() * safeH,
        metadata: { title: track.trackName, artist: track.artistName, artwork: artworkUrl },
      },
    ]);
    setPendingMusicIds((prev) => new Set(prev).add(id));

    const job = (async () => {
      const stamp = Date.now();
      const ext = track.previewUrl.split("?")[0].split(".").pop() || "m4a";
      const [audio, artwork] = await Promise.all([
        downloadWithinFileSize({
          url: track.previewUrl,
          to: `${FileSystem.documentDirectory}music_${track.trackId}_${stamp}.${ext}`,
          kind: "audio",
        }),
        downloadWithinFileSize({
          url: artworkUrl,
          to: `${FileSystem.documentDirectory}music_artwork_${track.trackId}_${stamp}.jpg`,
          kind: "image",
        }).catch((err) => {
          // Artwork is decorative: keep the remote image if it cannot be saved.
          console.warn("Failed to save artwork, keeping remote URL", err);
          return null;
        }),
      ]);
      if (!audio) throw new Error("Preview exceeds the audio size cap");
      resolvedMusic.current.set(id, { uri: audio, artwork });
      setMediaElements((prev) =>
        prev.map((m) =>
          m.id === id && m.metadata
            ? { ...m, uri: audio, metadata: { ...m.metadata, artwork: artwork ?? m.metadata.artwork } }
            : m,
        ),
      );
    })()
      .catch((err) => {
        console.error("Failed to download song", err);
        failedMusic.current.add(id);
        setMediaElements((prev) => prev.filter((m) => m.id !== id));
        haptic.error();
        Alert.alert("COULDN'T ADD SONG", "Check your connection and try choosing it again.");
      })
      .finally(() => {
        pendingMusic.current.delete(id);
        setPendingMusicIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    pendingMusic.current.set(id, job);
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      // A song still downloading finishes first, so only local files are saved.
      await Promise.all(pendingMusic.current.values());
      const elements = mediaElements
        .filter((m) => !failedMusic.current.has(m.id))
        .map((m) => {
          const local = resolvedMusic.current.get(m.id);
          if (!local || !m.metadata) return m;
          return { ...m, uri: local.uri, metadata: { ...m.metadata, artwork: local.artwork ?? m.metadata.artwork } };
        });
      if (elements.length === 0 && body.trim().length === 0) {
        setIsSaving(false);
        return;
      }

      // Lay the media out as a tidy collage around the text. On edit, keep
      // anything the user already placed and only arrange what is new.
      const card = {
        width: screenWidth - 42,
        height: Math.min(screenWidth * 1.618, screenHeight * 0.78),
      };
      const arranged = arrangeStickers(elements, card, { content: body, fontFamily, fontSize });
      const existingIds = new Set(existingComposition?.mediaElements.map((m) => m.id) ?? []);
      const laidOut = elements.map((element, index) =>
        existingIds.has(element.id) ? element : arranged[index],
      );
      if (numericEditId) {
        await updateComposition({
          id: numericEditId,
          textContent: body.trim(),
          mediaElements: laidOut,
          fontFamily,
          fontSize,
          textColor,
          locationName,
          locationCoords: locationCoords
            ? JSON.stringify(locationCoords)
            : undefined,
          storyIds,
        });
      } else {
        await addComposition({
          textContent: body.trim(),
          mediaElements: laidOut,
          fontFamily,
          fontSize,
          textColor,
          locationName,
          locationCoords: locationCoords
            ? JSON.stringify(locationCoords)
            : undefined,
          storyIds,
          createdAt: targetTimestamp ?? undefined,
        });
      }

      {
        let ageCategory = "Unknown";
        // settings.dob is stored as DD.MM.YYYY (dots) — new Date() cannot
        // parse that, so pull the year out explicitly.
        const birthYear = dobYear(settings.dob);
        if (birthYear !== null) {
          const age = new Date().getFullYear() - birthYear;
          if (age >= 0) {
            if (age < 18) ageCategory = "Under 18";
            else if (age <= 24) ageCategory = "18-24";
            else if (age <= 34) ageCategory = "25-34";
            else if (age <= 44) ageCategory = "35-44";
            else if (age <= 54) ageCategory = "45-54";
            else if (age <= 64) ageCategory = "55-64";
            else ageCategory = "65+";
          }
        }

        const mediaTypesCount = mediaElements.reduce(
          (acc, el) => {
            if (el.type === "audio" && el.metadata)
              acc.music = (acc.music || 0) + 1;
            else if (el.type === "audio") acc.voice = (acc.voice || 0) + 1;
            else acc[el.type] = (acc[el.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        let contentType = "Empty";
        if (body.trim().length > 0 && mediaElements.length === 0)
          contentType = "Text Only";
        else if (body.trim().length === 0 && mediaElements.length > 0)
          contentType = "Media Only";
        else if (body.trim().length > 0 && mediaElements.length > 0)
          contentType = "Text + Media";

        posthog?.capture("Memory Created", {
          hasMedia: mediaElements.length > 0,
          mediaCount: mediaElements.length,
          fontFamily,
          hasLocation: !!locationName,
          ageCategory,
          contentType,
          textLength: body.trim().length,
          ...mediaTypesCount,
        });
      }

      haptic.success();
      goBack();
    } catch (error) {
      console.error("Failed to save composition:", error);
      setIsSaving(false);
      // Stay on the page so nothing written is lost; the user can retry.
      haptic.error();
      Alert.alert("COULDN'T SAVE", "Your memory wasn't saved. Please try again.");
    }
  };

  const handleClose = () => {
    haptic.tap();
    goBack();
  };

  const handleRecordToggle = async () => {
    try {
      if (recorderState.isRecording) {
        // Stop recording
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          // Copy to safe document directory
          const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : "m4a";
          const dest = `${FileSystem.documentDirectory}audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

          await FileSystem.copyAsync({ from: uri, to: dest });

          const newMedia: MediaElement = {
            id: Math.random().toString(36).substring(2, 9),
            uri: dest,
            type: "audio",
            x_pos: 30 + Math.random() * (screenWidth - 150),
            y_pos: 30 + Math.random() * (screenHeight - 150),
          };
          setMediaElements((prev) => [...prev, newMedia]);
        }
      } else {
        // Start recording
        if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
          alertElementCap();
          return;
        }

        const { status } = await AudioModule.requestRecordingPermissionsAsync();
        if (status !== "granted") return;

        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        await recorder.prepareToRecordAsync();
        haptic.tap();
        await recorder.record();
      }
    } catch (err) {
      console.error("Failed to toggle recording", err);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ─── Toolbar ─── */}
        <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
          {/* Close button — circular, industrial */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 },
            ]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={16} color={theme.text} />
          </Pressable>

          <View style={styles.toolbarSpacer} />

          {/* Ink (text colour) chooser */}
          <InkButton
            color={textColor}
            open={isInkOpen}
            onPress={() => setIsInkOpen((open) => !open)}
            style={styles.fontButton}
          />

          {/* Size chooser */}
          <Pressable
            onPress={cycleSize}
            style={({ pressed }) => [
              styles.fontButton,
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 },
            ]}
            accessibilityLabel="Cycle Size"
            accessibilityRole="button"
          >
            <ThemedText
              style={[
                styles.fontButtonText,
                { color: theme.text, fontSize: 13 },
              ]}
            >
              {currentSizeName}
            </ThemedText>
          </Pressable>

          {/* Font chooser */}
          <Pressable
            onPress={cycleFont}
            style={({ pressed }) => [
              styles.fontButton,
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 },
            ]}
            accessibilityLabel="Cycle Font"
            accessibilityRole="button"
          >
            <Type size={14} color={theme.text} />
            <ThemedText style={[styles.fontButtonText, { color: theme.text }]}>
              {currentFontName}
            </ThemedText>
          </Pressable>

          {/* Save button — pill, only active when there's content */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: canSave ? theme.text : theme.border,
                opacity: pressed && canSave ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Save memory"
            accessibilityRole="button"
          >
            <ThemedText
              style={[
                styles.saveText,
                { color: canSave ? theme.background : theme.textMuted },
              ]}
            >
              {isSaving
                ? pendingMusicIds.size > 0
                  ? "Adding music"
                  : numericEditId ? "Updating" : "Saving"
                : numericEditId ? "Update" : "Save"}
            </ThemedText>
          </Pressable>
        </View>

        {isInkOpen && <InkPalette color={textColor} onChange={setTextColor} />}

        {/* ─── Content ─── */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date + time + media attach metadata — monospace, industrial readout */}
          <View style={styles.metaContainer}>
            <View style={styles.metaLeft}>
              <ThemedText style={styles.metaDate} themeColor="textMuted">
                {dateString}
              </ThemedText>
              <View style={styles.metaDot} />
              <ThemedText style={styles.metaTime} themeColor="textMuted">
                {timeString}
              </ThemedText>
              
            </View>

                                                <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metaActionsRow}
              style={{ marginTop: 12, marginHorizontal: -24 }}
            >
              <View style={{ width: 24 }} /> {/* left padding spacer for scroll */}
              
              {/* 1. Camera (Photo) - First Option */}
              <Pressable
                onPress={handleCapturePhoto}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Camera size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  Capture
                </ThemedText>
              </Pressable>

              {/* 2. Attach Gallery */}
              <Pressable
                onPress={handleAttachMedia}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <ImageIcon size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  Attach
                </ThemedText>
              </Pressable>

              {/* 3. Music */}
              <Pressable
                onPress={() => {
                  if (hasMusicElement(mediaElements)) {
                    alertMusicLimit();
                    return;
                  }
                  haptic.tap();
                  setIsMusicPickerVisible(true);
                }}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Music size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  Music
                </ThemedText>
              </Pressable>

              {/* 4. GIF */}
              <Pressable
                onPress={() => {
                  haptic.tap();
                  setShowGifPicker(true);
                }}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Smile size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  GIF
                </ThemedText>
              </Pressable>

              {/* 5. Video (Moved after GIF) */}
              <Pressable
                onPress={handleCaptureVideo}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Video size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  Video
                </ThemedText>
              </Pressable>

              {/* 6. Record Audio (Kept with Video) */}
              <Pressable
                onPress={handleRecordToggle}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Mic size={16} color={theme.textMuted} />
                <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                  Record
                </ThemedText>
              </Pressable>

              {/* 7. Location */}
              {!settings.autoLocationTagging && !locationName && (
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    fetchLocation();
                  }}
                  disabled={isFetchingLocation}
                  style={({ pressed }) => [
                    styles.attachButton,
                    { opacity: pressed || isFetchingLocation ? 0.5 : 1 },
                  ]}
                >
                  <MapPin size={16} color={theme.textMuted} />
                  <ThemedText style={[styles.attachText, { color: theme.textMuted }]}>
                    {isFetchingLocation ? "Locating" : "Location"}
                  </ThemedText>
                </Pressable>
              )}
              {locationName && (
                <View style={styles.locationBadge}>
                  <MapPin size={14} color={theme.textMuted} />
                  <ThemedText style={styles.locationText} themeColor="textMuted" numberOfLines={1}>
                    {locationName.toUpperCase()}
                  </ThemedText>
                </View>
              )}

              <View style={{ width: 24 }} /> {/* right padding spacer for scroll */}
            </ScrollView>
          </View>

          {/* Divider — thin, quiet */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Body text input — the main writing area */}
          <TextInput
            style={[
              styles.bodyInput,
              {
                color: textColor ?? theme.text,
                fontFamily,
                ...memoryTextMetrics(fontFamily, fontSize),
              },
            ]}
            placeholder="Capture a thought, moment, or feeling..."
            placeholderTextColor={theme.textMuted}
            multiline
            autoFocus
            value={body}
            onChangeText={setBody}
            selectionColor={theme.border}
            cursorColor={theme.text}
            textAlignVertical="top"
            scrollEnabled={false}
          />

          {/* Previews of attached media */}
          {mediaElements.length > 0 && (
            <View style={styles.mediaPreviewsContainer}>
              {mediaElements.map((m) => (
                <ComposeMediaPreview
                  key={m.id}
                  m={m}
                  theme={theme}
                  pending={pendingMusicIds.has(m.id)}
                  onRemove={() => {
                    haptic.tap();
                    setMediaElements((prev) => prev.filter((x) => x.id !== m.id));
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <ComposeBottomBar
          storyLabel={
            storyIds.length === 1
              ? stories.find((s) => s.id === storyIds[0])?.title.toUpperCase() || 'STORY'
              : storyIds.length > 1
                ? `${storyIds.length} STORIES`
                : 'STORY'
          }
          hasStory={storyIds.length > 0}
          onOpenStories={() => setIsStoryPickerVisible(true)}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>

      {/* Full-screen recording overlay — shared with the home quick-record */}
      <RecordingOverlay
        visible={recorderState.isRecording}
        durationMillis={recorderState.durationMillis}
        onStop={handleRecordToggle}
      />

      <MusicPicker
        visible={isMusicPickerVisible}
        onClose={() => setIsMusicPickerVisible(false)}
        onSelect={handleAttachMusic}
      />
      
      <StoryPicker mode="multi"
        visible={isStoryPickerVisible}
        onClose={() => setIsStoryPickerVisible(false)}
        onToggle={(id) => setStoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        selectedStoryIds={storyIds}
      />
      
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={async (gifUrl) => {
          setShowGifPicker(false);
          if (mediaElements.length >= MAX_MEDIA_ELEMENTS) {
            alertElementCap();
            return;
          }
          // Download the GIF and attach it to mediaElements
          try {
            const extMatch = gifUrl.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : "gif";
            const dest = `${FileSystem.documentDirectory}klipy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            
            const downloaded = await downloadWithinFileSize({
              url: gifUrl,
              to: dest,
              kind: "image",
            });
            if (!downloaded) {
              alertFileTooLarge("image");
              return;
            }
            
            const stickerSize = 120;
            const safeW = screenWidth - 60 - stickerSize;
            const safeH = Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;
            
            setMediaElements((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).substring(2, 9),
                uri: dest,
                type: "image",
                x_pos: 30 + Math.random() * safeW,
                y_pos: 30 + Math.random() * safeH,
                width: 120, // default squareish size, can be overridden by format.dims in a real app
                height: 120,
                isGif: true,
                rotation: -10 + Math.random() * 20,
                scale: 1,
              },
            ]);
          } catch (err) {
            console.error("Failed to download GIF:", err);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pendingOverlay: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
  },
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // ─── Toolbar ───
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
    paddingBottom: 13,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarSpacer: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 21,
    paddingVertical: 8,
    borderRadius: 34,
  },
  saveText: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  fontButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 34,
    borderWidth: 1,
    marginRight: 12,
  },
  fontButtonText: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // ─── Content ───
  scrollContent: {
    paddingHorizontal: 21,
    paddingTop: 8,
    flexGrow: 1,
  },
  metaContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.06)",
  },
  attachText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
  },
  metaDate: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#C0C0C0",
  },
  metaTime: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.06)",
    maxWidth: 160,
  },
  locationText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
    marginBottom: 21,
  },
  bodyInput: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 21,
    minHeight: 200,
  },
  mediaPreviewsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 21,
    paddingBottom: 21,
  },
  mediaPreviewWrapper: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  mediaPreviewImage: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
