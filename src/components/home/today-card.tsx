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
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Camera as CameraIcon, Check, SwitchCamera } from 'lucide-react-native';

import { TodaySky } from '@/components/home/today-sky';
import { FadedEdges } from '@/components/home/faded-edges';
import { CameraSurface } from '@/components/camera/camera-surface';
import { ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';
import { takeShotAsShown } from '@/components/camera/shot-as-shown';
import { ThemedText } from '@/components/themed-text';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { shotsFor, skyFor } from '@/home/today';
import { TemplateSlider } from '@/components/compose/template-slider';
import type { TemplateId } from '@/canvas/types';
import { navigate } from '@/utils/navigation';
import { setPendingCameraMedia, type PendingMedia } from '@/utils/pending-camera-media';



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
  const sky = skyFor();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const container = useRef<React.ComponentRef<typeof View>>(null);
  const [template, setTemplate] = useState<TemplateId>('story');
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

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
  // Once the camera has shown a picture it stays up: a paused session holds
  // its last frame, so coming back (from the profile, a pushed screen) just
  // resumes it. Fading it out and back up let the sky's huge date ghost
  // through the half-faded picture.
  const shown = ready;
  // Controls read on whatever is behind them: the picture, or a light or dark sky.
  const controlInk = shown || sky.dark ? '#FFFFFF' : '#111111';
  // The sky is the page before the camera exists. Once the picture has fully
  // developed over it, it is unmounted for good: a paused iOS preview draws
  // nothing (it doesn't hold a frame), so anything left underneath — the
  // sky's huge date — would show through on every navigation.
  const [skyGone, setSkyGone] = useState(false);
  const retireSky = () => setSkyGone(true);
  useEffect(() => {
    develop.set(shown ? withDelay(160, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }, (done) => done && runOnJS(retireSky)())) : withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) }));
  }, [shown, develop]);
  // The picture rises out of the sky like a print developing.
  const picture = useAnimatedStyle(() => ({ opacity: develop.get() }));
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
    <View style={{ width, height, backgroundColor: skyGone ? theme.background : sky.bottom }}>
      {/* No card: today's sky until the camera rises out of it. */}
      {!skyGone && <TodaySky width={width} height={height} invite={permission?.granted ? undefined : 'tap the shutter and let today in'} />}
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
      {/* Soft, cloud-like edges: the page fades into home instead of ending on a line. */}
      {/* A low wash under the controls, so the dial and shutter read over any picture. */}
      <Animated.View pointerEvents="none" style={[styles.scrim, { height: height * 0.4 }, picture]}>
        <Svg width={width} height={height * 0.4}>
          <Defs>
            <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.55" stopColor="#000000" stopOpacity={0.32} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.6} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height * 0.4} fill="url(#scrim)" />
        </Svg>
      </Animated.View>
      <FadedEdges width={width} height={height} color={theme.background} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />


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
          color={controlInk}
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
            style={({ pressed }) => [styles.shutter, { borderColor: controlInk, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
          >
            {permission?.granted ? <View style={[styles.shutterInner, { backgroundColor: controlInk }]} /> : <CameraIcon size={24} color={controlInk} />}
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
  flash: { backgroundColor: '#FFFFFF' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center', gap: 16 },
  taken: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 40, borderRadius: 12, backgroundColor: '#00000080' },
  thumb: { width: 28, height: 28, borderRadius: 6 },
  count: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 1, marginLeft: 4 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  side: { width: ROUND_BUTTON_SIZE, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31 },
});
