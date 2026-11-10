/**
 * CaptureCamera — the app's own camera for photos and videos, used by the
 * composer's camera button and the home key's swipe-up (in place of the
 * system camera sheet, which crashes under a streamed simulator camera and
 * looks nothing like the app).
 *
 *   ✕
 *            live view, full screen
 *        PHOTO   VIDEO              the mode, above the shutter
 *     [ 0:12 ]   ( ◯ )      ⟲       timer · shutter · flip
 *
 * Photo: tap the shutter (a white flash, the view freezes on the shot).
 * Video: tap to start (the shutter turns into a red stop), tap to stop;
 * clips stop on their own at 60 seconds.
 *
 * The result goes back to the screen that opened the camera (awaitCapture),
 * or, when opened from home, straight into a new memory in the composer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useCameraPermissions, useMicrophonePermissions, type CameraMode, type CameraType, type CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwitchCamera } from 'lucide-react-native';

import { CameraSurface } from '@/components/camera/camera-surface';
import { CloseButton, RoundButton } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { hasCaptureWaiter, resolveCapture, type CapturedMedia } from '@/utils/capture-result';
import { goBack, navigate } from '@/utils/navigation';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';

/** Longest clip the camera records for a memory. */
const VIDEO_MAX_SECONDS = 60;
const BACKDROP = '#000000';
const STOP_RED = '#FF3B30';

const rid = () => Math.random().toString(36).substring(2, 9);

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function CaptureCamera() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CameraMode>('picture');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const flash = useSharedValue(0);
  // The shot to hand back. It's handed over only once this screen has closed:
  // the opener changing its canvas while this screen is still animating away
  // crashes the native view tree.
  const result = useRef<CapturedMedia | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  // Closed (after a shot, or with ✕ / swipe back): the opener gets the shot or null.
  useEffect(() => () => resolveCapture(result.current), []);

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [recording]);

  /** Copies the shot into the app's documents and hands it on. */
  const deliver = async (shot: CapturedMedia) => {
    const ext = shot.type === 'video' ? 'mov' : 'jpg';
    const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${rid()}.${ext}`;
    await FileSystem.copyAsync({ from: shot.uri, to: dest });
    const kept = { ...shot, uri: dest };
    if (hasCaptureWaiter()) {
      result.current = kept;
      goBack();
    } else {
      // Opened from home: the shot starts a new memory.
      setPendingCameraMedia(kept);
      navigate.replace('/compose');
    }
  };

  const takePhoto = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    haptic.press();
    flash.set(1);
    flash.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.92 });
      camera.current?.pausePreview().catch(() => undefined);
      await deliver({ uri: photo.uri, type: 'image', width: photo.width, height: photo.height });
    } catch (error) {
      trackError(error, 'capture_photo');
      camera.current?.resumePreview().catch(() => undefined);
      setBusy(false);
      Alert.alert("Couldn't take the photo", 'Something went wrong with the camera. Try again.');
    }
  };

  const startVideo = async () => {
    if (!camera.current || busy) return;
    // Without the microphone the clip is recorded silent rather than refused.
    if (mic && !mic.granted && mic.canAskAgain) await requestMic();
    haptic.press();
    setElapsed(0);
    setRecording(true);
    try {
      const clip = await camera.current.recordAsync({ maxDuration: VIDEO_MAX_SECONDS });
      setRecording(false);
      if (!clip?.uri) return;
      setBusy(true);
      await deliver({ uri: clip.uri, type: 'video' });
    } catch (error) {
      trackError(error, 'capture_video');
      setRecording(false);
      setBusy(false);
      Alert.alert("Couldn't record the video", 'Something went wrong with the camera. Try again.');
    }
  };

  const stopVideo = () => {
    haptic.tap();
    camera.current?.stopRecording();
  };

  const onShutter = () => {
    if (mode === 'picture') takePhoto();
    else if (recording) stopVideo();
    else startVideo();
  };

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  if (permission && !permission.granted) {
    return (
      <View style={[styles.root, styles.centre]}>
        <View style={[styles.close, { top: insets.top + 6 }]}>
          <CloseButton accessibilityLabel="Close camera" />
        </View>
        <ThemedText style={styles.note}>Fold needs the camera to take photos</ThemedText>
        <Pressable onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()} accessibilityRole="button" style={styles.allow}>
          <ThemedText style={styles.allowText}>{permission.canAskAgain ? 'ALLOW CAMERA' : 'OPEN SETTINGS'}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraSurface cameraRef={camera} facing={facing} mode={mode} mirror={facing === 'front'} mute={!mic?.granted} animateShutter={false} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      {/* Hidden, not removed, while recording: the screen keeps one fixed set of views. */}
      <View style={[styles.close, { top: insets.top + 6, opacity: recording ? 0 : 1 }]} pointerEvents={recording ? 'none' : 'auto'}>
        <CloseButton accessibilityLabel="Close camera" />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        {/* The mode, or the clip's running time while recording. */}
        {recording ? (
          <View style={styles.timer}>
            <View style={styles.dot} />
            <ThemedText style={styles.timerText}>{formatClock(elapsed)}</ThemedText>
          </View>
        ) : (
          <View style={styles.modes}>
            {(['picture', 'video'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  if (m === mode || busy) return;
                  haptic.select();
                  setMode(m);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                hitSlop={10}
              >
                <ThemedText style={[styles.modeText, { opacity: mode === m ? 1 : 0.5 }]}>{m === 'picture' ? 'PHOTO' : 'VIDEO'}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.controls}>
          <View style={styles.side} />
          <Pressable
            onPress={onShutter}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={mode === 'picture' ? 'Take photo' : recording ? 'Stop recording' : 'Record video'}
            style={({ pressed }) => [styles.shutter, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
          >
            {/* Photo: a white disc. Video: a red disc that becomes a rounded stop square while recording. */}
            <View
              style={[
                styles.shutterInner,
                mode === 'video' && { backgroundColor: STOP_RED },
                recording && { width: 30, height: 30, borderRadius: 7 },
              ]}
            />
          </Pressable>
          <View style={styles.side}>
            <View style={{ opacity: recording ? 0 : 1 }} pointerEvents={recording ? 'none' : 'auto'}>
              <RoundButton icon={SwitchCamera} accessibilityLabel="Switch camera" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKDROP },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  close: { position: 'absolute', left: 16 },
  flash: { backgroundColor: '#FFFFFF' },
  note: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 13, textAlign: 'center' },
  allow: { height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  allowText: { color: '#111111', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 18 },
  modes: { flexDirection: 'row', gap: 28, height: 24, alignItems: 'center' },
  modeText: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2.5 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#00000080' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: STOP_RED },
  timerText: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 13, letterSpacing: 1 },
  controls: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  side: { width: 48, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
});
