/**
 * Compose Screen — full-page memory editor.
 *
 * Inspired by Google Journal's layout hierarchy:
 *   toolbar → date metadata → body text
 *
 * Adapted into Fold's Teenage Engineering aesthetic:
 *   monospace metadata, flat industrial UI, golden ratio spacing.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions,
  Modal,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
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
  Book
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
import { VinylRecord } from "@/components/vinyl-record";
import type { MediaElement } from "@/types/journal";
import { formatMillis } from "@/utils/format-date";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import { TextInputWrapper } from "expo-paste-input";
import { usePostHog } from "posthog-react-native";
import { MusicPicker } from "@/components/music-picker";
import { StoryPicker } from "@/components/story-picker";
import type { MusicTrack } from "@/hooks/use-music-store";
import { useStoriesStore } from "@/hooks/use-stories";

function ComposeMediaPreview({
  m,
  theme,
  onRemove,
}: {
  m: MediaElement;
  theme: any;
  onRemove: () => void;
}) {
  const isVideo = m.type === "video";
  const videoThumbnailUri = useVideoThumbnail(isVideo ? m.uri : undefined);
  
  return (
    <View style={styles.mediaPreviewWrapper}>
      {m.type === "audio" ? (
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
            uri: isVideo && videoThumbnailUri ? videoThumbnailUri : m.uri,
          }}
          style={styles.mediaPreviewImage}
          contentFit="cover"
        />
      )}

      {isVideo && (
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
          <PlayCircle size={28} color="rgba(255,255,255,0.9)" />
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
  const { sharedText, storyId: paramStoryId } = useLocalSearchParams<{ sharedText?: string; storyId?: string }>();

  const [body, setBody] = useState(sharedText ?? "");
  const [storyId, setStoryId] = useState<number | null>(paramStoryId ? Number(paramStoryId) : null);

  const [mediaElements, setMediaElements] = useState<MediaElement[]>(() => {
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
  const [fontFamily, setFontFamily] = useState("JetBrainsMono-Medium");
  const [fontSize, setFontSize] = useState(21);

  const { addComposition } = useJournalStore();
  const { settings } = useSettings();
  const posthog = usePostHog();
  const [isSaving, setIsSaving] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [locationName, setLocationName] = useState<string>();
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lng: number;
  }>();
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
    { id: "JetBrainsMono-Medium", name: "SYS.MONO" },
    { id: "BitcountGridDouble-Regular", name: "BITCOUNT" },
    { id: "RockSalt-Regular", name: "ROCK SALT" },
    { id: "BigelowRules-Regular", name: "BIGELOW" },
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
    const currentIndex = AVAILABLE_FONTS.findIndex((f) => f.id === fontFamily);
    const nextFont =
      AVAILABLE_FONTS[(currentIndex + 1) % AVAILABLE_FONTS.length];
    setFontFamily(nextFont.id);
  };

  const cycleSize = () => {
    const currentIndex = FONT_SIZES.findIndex((s) => s.id === fontSize);
    const nextSize = FONT_SIZES[(currentIndex + 1) % FONT_SIZES.length];
    setFontSize(nextSize.id);
  };

  const currentFontName =
    AVAILABLE_FONTS.find((f) => f.id === fontFamily)?.name || "SYS.MONO";
  const currentSizeName =
    FONT_SIZES.find((s) => s.id === fontSize)?.name || "M";

  const now = useMemo(() => new Date(), []);
  const dateString = useMemo(() => formatComposeDate(now), [now]);
  const timeString = useMemo(() => formatComposeTime(now), [now]);

  // A post must have either text OR media to be saveable
  const canSave =
    (body.trim().length > 0 || mediaElements.length > 0) && !isSaving;

  const handleAttachMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const newMedia: MediaElement[] = await Promise.all(
          result.assets.map(async (asset) => {
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

            await FileSystem.copyAsync({ from: asset.uri, to: dest });

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

        setMediaElements((prev) => [...prev, ...newMedia]);
      }
    } catch (error) {
      console.error("Failed to pick media:", error);
    }
  };

  const handleCapturePhoto = async () => {
    try {
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

        await FileSystem.copyAsync({ from: asset.uri, to: dest });

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
    try {
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

        await FileSystem.copyAsync({ from: asset.uri, to: dest });

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

  const handleAttachMusic = async (localUri: string, track: MusicTrack) => {
    const stickerSize = 120;
    const safeW = screenWidth - 60 - stickerSize;
    const safeH =
      Math.min(screenWidth * 1.618, screenHeight * 0.78) - stickerSize - 60;

    setMediaElements((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        uri: localUri,
        type: "audio",
        x_pos: 30 + Math.random() * safeW,
        y_pos: 30 + Math.random() * safeH,
        metadata: {
          title: track.trackName,
          artist: track.artistName,
          artwork: track.artworkUrl100,
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      await addComposition({
        textContent: body.trim(),
        mediaElements,
        fontFamily,
        fontSize,
        locationName,
        locationCoords: locationCoords
          ? JSON.stringify(locationCoords)
          : undefined,
        storyIds: storyId ? [storyId] : [],
      });

      if (settings.dataCollection) {
        let ageCategory = "Unknown";
        if (settings.dob) {
          try {
            const birthYear = new Date(settings.dob).getFullYear();
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthYear;
            if (!isNaN(age)) {
              if (age < 18) ageCategory = "Under 18";
              else if (age <= 24) ageCategory = "18-24";
              else if (age <= 34) ageCategory = "25-34";
              else if (age <= 44) ageCategory = "35-44";
              else if (age <= 54) ageCategory = "45-54";
              else if (age <= 64) ageCategory = "55-64";
              else ageCategory = "65+";
            }
          } catch (e) {}
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

      router.back();
    } catch (error) {
      console.error("Failed to save composition:", error);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    router.back();
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
        const { status } = await AudioModule.requestRecordingPermissionsAsync();
        if (status !== "granted") return;

        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        await recorder.prepareToRecordAsync();
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
              {isSaving ? "Saving" : "Save"}
            </ThemedText>
          </Pressable>
        </View>

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
              <View style={{ width: 24 }} />{" "}
              {/* left padding spacer for scroll */}
              <Pressable
                onPress={handleRecordToggle}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Mic size={16} color={theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: theme.textMuted }]}
                >
                  Record
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAttachMedia}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <ImageIcon size={16} color={theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: theme.textMuted }]}
                >
                  Attach
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setIsMusicPickerVisible(true)}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Music size={16} color={theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: theme.textMuted }]}
                >
                  Music
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setIsStoryPickerVisible(true)}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Book size={16} color={storyId ? theme.text : theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: storyId ? theme.text : theme.textMuted }]}
                >
                  {storyId ? "Story ✓" : "Story"}
                </ThemedText>
              </Pressable>
              {!settings.autoLocationTagging && !locationName && (
                <Pressable
                  onPress={fetchLocation}
                  disabled={isFetchingLocation}
                  style={({ pressed }) => [
                    styles.attachButton,
                    { opacity: pressed || isFetchingLocation ? 0.5 : 1 },
                  ]}
                >
                  <MapPin size={16} color={theme.textMuted} />
                  <ThemedText
                    style={[styles.attachText, { color: theme.textMuted }]}
                  >
                    {isFetchingLocation ? "Locating" : "Location"}
                  </ThemedText>
                </Pressable>
              )}
              {locationName && (
                <View style={styles.locationBadge}>
                  <MapPin size={14} color={theme.textMuted} />
                  <ThemedText
                    style={styles.locationText}
                    themeColor="textMuted"
                    numberOfLines={1}
                  >
                    {locationName.toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <Pressable
                onPress={handleCapturePhoto}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Camera size={16} color={theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: theme.textMuted }]}
                >
                  Capture
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleCaptureVideo}
                style={({ pressed }) => [
                  styles.attachButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Video size={16} color={theme.textMuted} />
                <ThemedText
                  style={[styles.attachText, { color: theme.textMuted }]}
                >
                  Video
                </ThemedText>
              </Pressable>
              <View style={{ width: 24 }} />{" "}
              {/* right padding spacer for scroll */}
            </ScrollView>
          </View>

          {/* Divider — thin, quiet */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Body text input — the main writing area */}
          <TextInputWrapper
            onPaste={async (payload) => {
              if (payload.type === "images") {
                const newMedia: MediaElement[] = await Promise.all(
                  payload.uris.map(async (uri) => {
                    const stickerSize = 120;
                    const safeW = screenWidth - 60 - stickerSize;
                    const safeH =
                      Math.min(screenWidth * 1.618, screenHeight * 0.78) -
                      stickerSize -
                      60;

                    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
                    const ext = extMatch ? extMatch[1].toLowerCase() : "gif";
                    const dest = `${FileSystem.documentDirectory}pasted_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

                    await FileSystem.copyAsync({ from: uri, to: dest });

                    return {
                      id: Math.random().toString(36).substring(2, 9),
                      uri: dest,
                      type: "image",
                      x_pos: 30 + Math.random() * safeW,
                      y_pos: 30 + Math.random() * safeH,
                    };
                  }),
                );
                setMediaElements((prev) => [...prev, ...newMedia]);
              } else if (payload.type === "text") {
                setBody((prev) => prev + payload.value);
              }
            }}
          >
            <TextInput
              style={[
                styles.bodyInput,
                {
                  color: theme.text,
                  fontFamily,
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.5),
                },
              ]}
              placeholder="What's on your mind?"
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
          </TextInputWrapper>

          {/* Previews of attached media */}
          {mediaElements.length > 0 && (
            <View style={styles.mediaPreviewsContainer}>
              {mediaElements.map((m) => (
                <ComposeMediaPreview
                  key={m.id}
                  m={m}
                  theme={theme}
                  onRemove={() =>
                    setMediaElements((prev) =>
                      prev.filter((x) => x.id !== m.id),
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom safe area pad */}
        <View style={{ height: insets.bottom || 12 }} />
      </KeyboardAvoidingView>

      {/* Full-screen recording overlay using Modal for guaranteed centering and top-level z-index */}
      <Modal
        visible={recorderState.isRecording}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.recordingOverlay}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient
                id="vignetteCompose"
                cx="50%"
                cy="50%"
                rx="70%"
                ry="70%"
                fx="50%"
                fy="50%"
              >
                <Stop
                  offset="0%"
                  stopColor={
                    theme.background === "#FFFFFF" ? "#FFFFFF" : "#000000"
                  }
                  stopOpacity="0.4"
                />
                <Stop
                  offset="40%"
                  stopColor={
                    theme.background === "#FFFFFF" ? "#FFFFFF" : "#000000"
                  }
                  stopOpacity="0.7"
                />
                <Stop
                  offset="100%"
                  stopColor={
                    theme.background === "#FFFFFF" ? "#FFFFFF" : "#000000"
                  }
                  stopOpacity="0.95"
                />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#vignetteCompose)" />
          </Svg>

          <Pressable
            style={styles.recordingOverlayInner}
            onPress={handleRecordToggle}
          >
            <VinylRecord size={300} isRecording={true} isPlaying={false} />
            <ThemedText style={styles.recordingText}>Tap to stop</ThemedText>
            <ThemedText
              style={[
                styles.recordingText,
                { fontSize: 24, marginTop: 12, opacity: 0.8 },
              ]}
            >
              {formatMillis(recorderState.durationMillis)}
            </ThemedText>
          </Pressable>
        </View>
      </Modal>

      <MusicPicker
        visible={isMusicPickerVisible}
        onClose={() => setIsMusicPickerVisible(false)}
        onSelect={handleAttachMusic}
      />
      
      <StoryPicker mode="single"
        visible={isStoryPickerVisible}
        onClose={() => setIsStoryPickerVisible(false)}
        onSelect={setStoryId}
        selectedStoryId={storyId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  recordingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  recordingOverlayInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordingText: {
    marginTop: 40,
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#878787",
  },
});
