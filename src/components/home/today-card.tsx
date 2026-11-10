/**
 * TodayCard — "today's page": the newest slot on home while nothing is kept
 * yet today, and the whole home screen before the first memory.
 *
 *   ┌──────────────────────┐
 *   │ TUE 10.11            │   before it's centred: the date, large, and a
 *   │                      │   line for the time of day; no camera running
 *   │   first light        │
 *   │        ( ◯ )         │   centred: the live camera develops in (fades
 *   │   ‹ CANVAS ›         │   up like a print), with the shutter and the
 *   └──────────────────────┘   template the shot will open in
 *
 * Tap the shutter: a flash, and the shot opens in the composer, laid out in
 * the template picked here. Hold: the device camera opens in video mode.
 * The camera runs only while the card is centred and the app is in front;
 * camera access is asked on the first tap, not on sight.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { SaveFormat } from 'expo-image-manipulator';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Camera as CameraIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { StripesSurface } from '@/canvas/render/stripes-surface';
import { CameraSurface } from '@/components/camera/camera-surface';
import { takeShotAsShown } from '@/components/camera/shot-as-shown';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { dayLine } from '@/home/today';
import { BASE_TEMPLATES, GRID_TEMPLATES } from '@/templates/registry';
import type { TemplateId } from '@/canvas/types';
import { navigate } from '@/utils/navigation';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';

/** The templates a fresh shot can open in (Text has no photo, so it's left out). */
const TEMPLATES = [...BASE_TEMPLATES, ...GRID_TEMPLATES].filter((t) => t.id !== 'text');
const RADIUS = 28;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface TodayCardProps {
  width: number;
  height: number;
  /** Centred in the feed (or the whole screen) and home is in front. */
  active: boolean;
  /** Hold on the shutter: the device camera, in video mode. */
  onRecordVideo: () => void;
}

export function TodayCard({ width, height, active, onRecordVideo }: TodayCardProps) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const container = useRef<View>(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const now = new Date();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const live = active && foreground && !!permission?.granted;
  // The camera "develops" in: the date and line step back as the picture rises.
  const develop = useSharedValue(0);
  useEffect(() => {
    develop.set(live ? withDelay(180, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })) : withTiming(0, { duration: 220 }));
  }, [live, develop]);
  const picture = useAnimatedStyle(() => ({ opacity: develop.get() }));
  const cover = useAnimatedStyle(() => ({ opacity: 1 - develop.get() * 0.85, transform: [{ translateY: -develop.get() * 24 }] }));
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const template = TEMPLATES[templateIndex];
  const step = (by: number) => {
    haptic.select();
    setTemplateIndex((i) => (i + by + TEMPLATES.length) % TEMPLATES.length);
  };

  const shoot = async () => {
    if (busy) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
      return; // The camera develops in; the next tap shoots.
    }
    if (!camera.current) return;
    setBusy(true);
    haptic.press();
    flash.set(1);
    flash.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    try {
      const { image } = await takeShotAsShown(camera.current, container, { width, height });
      const saved = await image.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
      const dest = `${FileSystem.documentDirectory}camera_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: saved.uri, to: dest });
      setPendingCameraMedia({ uri: dest, type: 'image', width: saved.width, height: saved.height });
      navigate.push(`/compose?template=${encodeURIComponent(template.id as TemplateId)}`);
    } catch (error) {
      trackError(error, 'today_capture');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { width, height, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {/* A blank page, the same striped card as an empty canvas, until the camera develops in. */}
      <StripesSurface animated={false} />
      <Animated.View style={[StyleSheet.absoluteFill, picture]} pointerEvents="none">
        {live && <CameraSurface cameraRef={camera} containerRef={container} animateShutter={false} />}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      <Animated.View style={[styles.cover, cover]} pointerEvents="none">
        <ThemedText style={[styles.date, { color: live ? '#FFFFFF' : theme.text }]}>
          {DAYS[now.getDay()]} {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}
        </ThemedText>
        <ThemedText style={[styles.line, { color: live ? '#FFFFFFCC' : theme.textMuted }]}>{dayLine(now)}</ThemedText>
      </Animated.View>

      <View style={styles.bottom}>
        <Pressable
          onPress={shoot}
          onLongPress={() => {
            haptic.thud();
            onRecordVideo();
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={permission?.granted ? 'Take a photo for today, hold for video' : 'Use the camera for today'}
          style={({ pressed }) => [styles.shutter, { borderColor: live ? '#FFFFFF' : theme.text, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          {permission?.granted ? (
            <View style={[styles.shutterInner, { backgroundColor: live ? '#FFFFFF' : theme.text }]} />
          ) : (
            <CameraIcon size={24} color={theme.text} />
          )}
        </Pressable>
        <View style={[styles.templates, { backgroundColor: live ? '#00000066' : 'transparent', borderColor: live ? '#FFFFFF55' : theme.border }]}>
          <Pressable onPress={() => step(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous template">
            <ChevronLeft size={16} color={live ? '#FFFFFF' : theme.text} />
          </Pressable>
          <ThemedText style={[styles.templateName, { color: live ? '#FFFFFF' : theme.text }]} numberOfLines={1}>
            {template.name.toUpperCase()}
          </ThemedText>
          <Pressable onPress={() => step(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next template">
            <ChevronRight size={16} color={live ? '#FFFFFF' : theme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, borderWidth: 1, overflow: 'hidden' },
  flash: { backgroundColor: '#FFFFFF' },
  cover: { position: 'absolute', top: 28, left: 24, right: 24, gap: 8 },
  date: { fontFamily: 'JetBrainsMono-Bold', fontSize: 34, lineHeight: 44, letterSpacing: 1 },
  line: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center', gap: 16 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28 },
  templates: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, minWidth: 170, justifyContent: 'space-between' },
  templateName: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2 },
});
