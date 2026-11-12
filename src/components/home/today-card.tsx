/**
 * TodayCard — "today's page": the newest slot on home while nothing is kept
 * yet today, and the whole home screen before the first memory.
 *
 *   ┌──────────────────────┐
 *   │ TUE 10.11            │   before it's centred: the date, large, and a
 *   │                      │   line for the time of day; no camera running
 *   │   first light        │
 *   │   [ ▦ CANVAS ⇅ ]     │   centred: the live camera develops in (fades
 *   │        ( ◯ )         │   up like a print), under the template picker
 *   └──────────────────────┘   and the shutter
 *
 * Tap the shutter: a flash, and the shot opens in the composer, laid out in
 * the template picked above the shutter (the composer's own picker). Hold: the device camera opens in video mode.
 * The camera runs only while the card is centred and the app is in front;
 * camera access is asked on the first tap, not on sight.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useCameraPermissions, type CameraType, type CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { SaveFormat } from 'expo-image-manipulator';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Camera as CameraIcon, Check, SwitchCamera } from 'lucide-react-native';

import { StripesSurface } from '@/canvas/render/stripes-surface';
import { ApertureIris } from '@/components/home/aperture-iris';
import { ViewfinderMarks } from '@/components/home/viewfinder-marks';
import { BalancedText } from '@/components/balanced-text';
import { CameraSurface } from '@/components/camera/camera-surface';
import { ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';
import { takeShotAsShown } from '@/components/camera/shot-as-shown';
import { ThemedText } from '@/components/themed-text';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { dayLine, shotsFor } from '@/home/today';
import { TemplateSlider } from '@/components/compose/template-slider';
import type { TemplateId } from '@/canvas/types';
import { navigate } from '@/utils/navigation';
import { setPendingCameraMedia, type PendingMedia } from '@/utils/pending-camera-media';

const RADIUS = 28;
/** The hexagon left open at the iris's centre while it is closed. */
const PUPIL = 26;
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
  const container = useRef<React.ComponentRef<typeof View>>(null);
  const [template, setTemplate] = useState<TemplateId>('story');
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const now = new Date();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const live = active && foreground && !!permission?.granted;
  // The preview is only shown once the session reports frames are coming;
  // until then the striped page stays, never a black box.
  const [ready, setReady] = useState(false);
  // Bumped to rebuild the camera when its session failed to start, e.g. when
  // it was created in the same instant the permission prompt was answered.
  const [session, setSession] = useState(0);
  const onMountError = () => {
    setReady(false);
    setSession((n) => n + 1);
  };
  // The camera "develops" in: the date and line step back as the picture rises.
  const develop = useSharedValue(0);
  const shown = live && ready;
  useEffect(() => {
    develop.set(shown ? withDelay(120, withTiming(1, { duration: 1300, easing: Easing.linear })) : withTiming(0, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
  }, [shown, develop]);
  // The picture is up before the blades part, so the iris opens onto it.
  const picture = useAnimatedStyle(() => ({ opacity: Math.min(1, develop.get() * 4) }));
  // The date stays put and readable over the picture; it only eases up a little.
  const cover = useAnimatedStyle(() => ({ transform: [{ translateY: -develop.get() * 8 }] }));
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  // Photos taken so far for this page; how many the template takes.
  const [shots, setShots] = useState<PendingMedia[]>([]);
  const limit = shotsFor(template);
  const finish = (taken: PendingMedia[]) => {
    if (taken.length === 0) return;
    haptic.success();
    useSettingsStore.getState().completeGuideStep('today');
    setPendingCameraMedia(taken);
    setShots([]);
    navigate.push(`/compose?template=${encodeURIComponent(template)}`);
  };

  const shoot = async () => {
    if (busy) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
      return; // The camera develops in; the next tap shoots.
    }
    if (!camera.current || !ready) return;
    setBusy(true);
    haptic.press();
    flash.set(1);
    flash.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    try {
      const { image } = await takeShotAsShown(camera.current, container, { width, height });
      const saved = await image.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
      const dest = `${FileSystem.documentDirectory}camera_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: saved.uri, to: dest });
      const next = [...shots, { uri: dest, type: 'image' as const, width: saved.width, height: saved.height }];
      // A fixed template opens once its last photo is in; a free one keeps going until Done.
      if (next.length >= limit.max) finish(next);
      else setShots(next);
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
        {/* Mounted once permission is in, then paused and resumed with `active`:
            tearing a capture session down runs on the main thread, and doing it
            the moment a screen starts sliding over home dropped its frames. */}
        {!!permission?.granted && (
          <CameraSurface
            key={session}
            active={live}
            cameraRef={camera}
            containerRef={container}
            facing={facing}
            mirror={facing === 'front'}
            animateShutter={false}
            onCameraReady={() => setReady(true)}
            onMountError={onMountError}
          />
        )}
      </Animated.View>
      {/* The lens: closed while the camera sleeps, opening onto the picture. */}
      <ApertureIris width={width} height={height} open={develop} pupil={PUPIL} />
      <ViewfinderMarks open={develop} />
      {!permission?.granted && (
        <View style={[styles.invite, { top: height / 2 + PUPIL + 18 }]} pointerEvents="none">
          <BalancedText style={[styles.inviteText, { color: theme.textMuted }]}>open the lens and keep a piece of today</BalancedText>
        </View>
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      <Animated.View style={[styles.cover, cover]} pointerEvents="none">
        <ThemedText style={[styles.date, shown ? styles.overPicture : { color: theme.text }]}>
          {DAYS[now.getDay()]} {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}
        </ThemedText>
        <ThemedText style={[styles.line, shown ? [styles.overPicture, { opacity: 0.85 }] : { color: theme.textMuted }]}>{dayLine(now)}</ThemedText>
      </Animated.View>

      <View style={styles.bottom}>
        {/* What's been taken: thumbnails and how many of how many. */}
        {shots.length > 0 && (
          <View style={styles.taken}>
            {shots.map((m) => (
              <Image key={m.uri} source={{ uri: m.uri }} style={styles.thumb} />
            ))}
            <ThemedText style={styles.count}>
              {shots.length}
              {limit.fixed ? ` / ${limit.max}` : ''}
            </ThemedText>
          </View>
        )}
        {/* Swipe through the templates; the shot opens laid out in the one in the middle. */}
        <TemplateSlider
          value={template}
          onChange={(t) => {
            setTemplate(t);
            // Keep what's taken, up to what the new template holds.
            setShots((s) => s.slice(0, shotsFor(t).max));
          }}
          width={width}
        />
        <View style={styles.shutterRow}>
          {/* Done: for templates that take any number of photos. */}
          <View style={[styles.side, { opacity: shots.length > 0 && !limit.fixed ? 1 : 0 }]} pointerEvents={shots.length > 0 && !limit.fixed ? 'auto' : 'none'}>
            <RoundButton icon={Check} accessibilityLabel={`Done, open ${shots.length} photos`} onPress={() => finish(shots)} />
          </View>
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
            {permission?.granted ? <View style={[styles.shutterInner, { backgroundColor: live ? '#FFFFFF' : theme.text }]} /> : <CameraIcon size={24} color={theme.text} />}
          </Pressable>
          {/* Front or back; only while the camera is live. */}
          <View style={[styles.side, { opacity: live ? 1 : 0 }]} pointerEvents={live ? 'auto' : 'none'}>
            <RoundButton icon={SwitchCamera} accessibilityLabel="Switch camera" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, borderWidth: 1, overflow: 'hidden' },
  flash: { backgroundColor: '#FFFFFF' },
  // Inside the viewfinder's corner marks.
  cover: { position: 'absolute', top: 44, left: 36, right: 36, gap: 8 },
  invite: { position: 'absolute', left: 48, right: 48, alignItems: 'center' },
  inviteText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, lineHeight: 18, letterSpacing: 0.5, textAlign: 'center' },
  date: { fontFamily: 'JetBrainsMono-Bold', fontSize: 34, lineHeight: 44, letterSpacing: 1 },
  line: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
  overPicture: { color: '#FFFFFF', textShadowColor: '#00000099', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center', gap: 16 },
  taken: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 40, borderRadius: 12, backgroundColor: '#00000080' },
  thumb: { width: 28, height: 28, borderRadius: 6 },
  count: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 1, marginLeft: 4 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  side: { width: ROUND_BUTTON_SIZE, alignItems: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28 },
});
