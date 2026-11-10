/**
 * Stamp camera — a live viewfinder framed as a blank stamp. The world shows
 * through the stamp's window (everything around it dimmed), the place
 * you're in is printed above it, and the shutter makes the stamp:
 *
 *   1. the photo is cut to exactly what the window showed;
 *   2. the stamp appears with that photo, and a postmark is inked onto it
 *      (it lands with a thud, slightly over-sized, and settles);
 *   3. it's saved to the collection and the map, and the screen returns.
 *
 * A stamp is proof of a place, so it needs the location; without it the
 * shutter explains how to turn it on instead of saving a placeless stamp.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { SwitchCamera } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { CloseButton, RoundButton } from '@/components/round-button';
import { Postmark, StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { useStamps } from '@/hooks/use-stamps';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { lookupLocation, type FoundPlace } from '@/services/location.service';
import { photoCropFor } from '@/stamps/geometry';
import { goBack } from '@/utils/navigation';

/** The stamp's width as a share of the screen, and the photo inside it. */
const STAMP_WIDTH = 0.78;
const PHOTO_INSET = 0.08;
/** Long side of the saved stamp photo. */
const PHOTO_PX = 1080;

type Phase = 'aiming' | 'shooting' | 'stamped';

export default function StampCamera() {
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [place, setPlace] = useState<FoundPlace | null | 'finding'>('finding');
  const [phase, setPhase] = useState<Phase>('aiming');
  const [made, setMade] = useState<{ uri: string; place: string; createdAt: number } | null>(null);
  const add = useStamps((s) => s.add);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    let live = true;
    lookupLocation().then((found) => live && setPlace(found));
    return () => {
      live = false;
    };
  }, []);

  // The stamp: centred, a little above the middle so the shutter has room.
  const stampW = screen.width * STAMP_WIDTH;
  const stampH = stampW * STAMP_ASPECT;
  const stampX = (screen.width - stampW) / 2;
  const stampY = (screen.height - stampH) / 2 - screen.height * 0.04;
  const inset = stampW * PHOTO_INSET;
  const window = { x: stampX + inset, y: stampY + inset, width: stampW - inset * 2, height: stampW - inset * 2 };

  const shoot = async () => {
    if (phase !== 'aiming' || !camera.current) return;
    if (place === 'finding') return;
    if (!place?.name) {
      Alert.alert('Where are you?', 'A stamp is proof of a place, so Fold needs your location. Turn it on in Settings and try again.');
      return;
    }
    setPhase('shooting');
    haptic.press();
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      const crop = photoCropFor({ width: shot.width, height: shot.height }, { width: screen.width, height: screen.height }, window);
      const image = await ImageManipulator.manipulate(shot.uri).crop(crop).resize({ width: PHOTO_PX }).renderAsync();
      const saved = await image.saveAsync({ compress: 0.88, format: SaveFormat.JPEG });
      const dest = `${FileSystem.documentDirectory}stamp_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: saved.uri, to: dest });
      const createdAt = Date.now();
      await add({ imageUri: dest, place: place.name, country: place.country, latitude: place.lat, longitude: place.lng, createdAt });
      setMade({ uri: dest, place: place.name, createdAt });
      setPhase('stamped');
    } catch (error) {
      trackError(error, 'stamp_capture');
      setPhase('aiming');
      Alert.alert("Couldn't make the stamp", 'Something went wrong taking the photo. Try again.');
    }
  };

  if (permission && !permission.granted) {
    return (
      <View style={[styles.root, styles.centre, { paddingTop: insets.top }]}>
        <View style={[styles.close, { top: insets.top + 6 }]}>
          <CloseButton accessibilityLabel="Close camera" />
        </View>
        <ThemedText style={styles.note}>Fold needs the camera to make stamps.</ThemedText>
        {permission.canAskAgain && (
          <Pressable onPress={requestPermission} accessibilityRole="button" style={styles.allow}>
            <ThemedText style={styles.allowText}>ALLOW CAMERA</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {phase !== 'stamped' && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} animateShutter={false} />}
      <StampMask screen={screen} x={stampX} y={stampY} w={stampW} h={stampH} window={window} solid={phase === 'stamped'} />

      {/* The place, printed above the stamp. */}
      <Animated.View entering={fadeIn(260, 120)} style={[styles.placeLine, { top: stampY - 44 }]} pointerEvents="none">
        <ThemedText style={styles.placeText} numberOfLines={1}>
          {placeLabel(place)}
        </ThemedText>
      </Animated.View>

      {made && <MadeStamp made={made} x={stampX} y={stampY} w={stampW} onDone={goBack} />}

      <View style={[styles.close, { top: insets.top + 6 }]}>
        <CloseButton accessibilityLabel="Close camera" />
      </View>

      {phase !== 'stamped' && (
        <Animated.View entering={riseIn(320, 160, 12)} style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.side} />
          <Pressable
            onPress={shoot}
            disabled={phase !== 'aiming' || place === 'finding'}
            accessibilityRole="button"
            accessibilityLabel="Make stamp"
            style={({ pressed }) => [styles.shutter, { opacity: place === 'finding' ? 0.4 : 1, transform: [{ scale: pressed || phase === 'shooting' ? 0.9 : 1 }] }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.side}>
            <RoundButton icon={SwitchCamera} accessibilityLabel="Switch camera" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** "PUNE · INDIA", or what's happening while there's no place yet. */
function placeLabel(place: FoundPlace | null | 'finding'): string {
  if (place === 'finding') return 'FINDING YOU…';
  if (!place?.name) return 'LOCATION OFF';
  return [place.name, place.country].filter(Boolean).join(' · ').toUpperCase();
}

interface MaskProps {
  screen: { width: number; height: number };
  x: number;
  y: number;
  w: number;
  h: number;
  window: { x: number; y: number; width: number; height: number };
  /** After the shot the live view is gone; the dim becomes solid. */
  solid: boolean;
}

/** The dim around the stamp, and the stamp's white perforated paper around the window. */
function StampMask({ screen, x, y, w, h, window, solid }: MaskProps) {
  const r = w * 0.026;
  const holes = Math.round(w / (r * 3.6));
  const outline = stampOutline(w, h, r, holes, { x, y });
  const hole = `M ${window.x} ${window.y} h ${window.width} v ${window.height} h ${-window.width} Z`;
  return (
    <Svg width={screen.width} height={screen.height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={`M 0 0 H ${screen.width} V ${screen.height} H 0 Z ${outline}`} fill={solid ? '#0E0E0E' : '#000000B8'} fillRule="evenodd" />
      {!solid && <Path d={`${outline} ${hole}`} fill="#FFFFFF" fillRule="evenodd" />}
    </Svg>
  );
}

/** The finished stamp, with its postmark inked on, then back to where we came from. */
function MadeStamp({ made, x, y, w, onDone }: { made: { uri: string; place: string; createdAt: number }; x: number; y: number; w: number; onDone: () => void }) {
  const ink = useSharedValue(0);
  const lift = useSharedValue(0);
  useEffect(() => {
    // The mark comes down a beat after the stamp shows, lands hard, settles.
    ink.set(withDelay(260, withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) })));
    const thud = setTimeout(() => haptic.thud(), 470);
    // Then the stamp lifts slightly as it's put away.
    lift.set(withDelay(1250, withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }))));
    const done = setTimeout(onDone, 1700);
    return () => {
      clearTimeout(thud);
      clearTimeout(done);
    };
  }, [ink, lift, onDone]);

  const mark = useAnimatedStyle(() => ({
    opacity: ink.get(),
    transform: [{ scale: 1.6 - ink.get() * 0.6 }],
  }));
  const paper = useAnimatedStyle(() => ({
    opacity: 1 - lift.get(),
    transform: [{ translateY: -lift.get() * 40 }, { scale: 1 - lift.get() * 0.08 }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, paper]} pointerEvents="none">
      <StampView imageUri={made.uri} place={made.place} createdAt={made.createdAt} width={w} postmark={false} />
      <Animated.View style={[{ position: 'absolute', right: -w * 0.06, top: w * 0.5 }, mark]}>
        <Postmark size={w * 0.42} place={made.place} createdAt={made.createdAt} style={{ position: 'relative' }} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  close: { position: 'absolute', left: 16 },
  note: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 13, textAlign: 'center' },
  allow: { height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  allowText: { color: '#111111', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  placeLine: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  placeText: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 2.5 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  side: { width: 48, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
});
