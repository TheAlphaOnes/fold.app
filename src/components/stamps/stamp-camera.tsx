/**
 * StampCamera — the live viewfinder framed as a blank stamp, the top layer
 * of the stamps page (StampStudio). The world shows through a perforated
 * stamp cut out of the dark, the place is printed above it, and the shutter
 * makes the stamp:
 *
 *   1. instant feedback: a flash, the view freezes on the shot;
 *   2. the stamp is cut to exactly what the window showed;
 *   3. its postmark is inked on (lands with a thud, settles), then a line
 *      says what it means: NEW PLACE or BACK IN somewhere, with its number;
 *   4. Done flies the stamp down into the collection drawer's fan, shrinking
 *      to its size on a slight arc; it lands there once, and the viewfinder
 *      comes back.
 *
 * The place shows at once from the last known position and is refined in
 * the background, so the shutter never waits on GPS. A stamp is proof of a
 * place, so without location it explains how to turn it on.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { SwitchCamera } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { RoundButton } from '@/components/round-button';
import { Postmark, StampView, STAMP_ASPECT, stampPerforation } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { useStamps } from '@/hooks/use-stamps';
import { trackError } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { lastKnownPlace, lookupLocation, type FoundPlace } from '@/services/location.service';
import { formatSerial, isNewPlace, photoCropFor, photoMatchesPreview, stampCropFor } from '@/stamps/geometry';

/** The stamp's widest, as a share of the screen. */
const STAMP_WIDTH = 0.74;
/** Width of the saved stamp photo: sharp on the map's hover card, light in the grid. */
const PHOTO_PX = 900;
/** Pinch range: the camera's zoom is 0…1; past ~0.3 phone lenses get soft. */
const MAX_ZOOM = 0.3;
/** Room above the stamp for the place line, and below it for the shutter row. */
const PLACE_LINE = 52;
const CONTROLS = 132;
/** Space between the shutter row and the drawer's peek. */
const SHUTTER_LIFT = 34;
/** How long the made stamp takes to fly into the drawer's fan. */
const FLY_MS = 560;
/** The app's dark ground around the viewfinder. */
const BACKDROP = '#0E0E0E';

type Phase = 'aiming' | 'shooting' | 'stamped' | 'delivering';
type PlaceState = FoundPlace | null | 'finding';

interface Made {
  uri: string;
  place: string;
  createdAt: number;
  serial: number;
  newPlace: boolean;
}

interface StampCameraProps {
  /** The camera runs; off while the collection drawer is open. */
  active: boolean;
  /** Space the page keeps at the top (its buttons) and bottom (the drawer's peek). */
  topInset: number;
  bottomInset: number;
  /** Where a finished stamp flies to: the centre slot of the drawer's fan (its top-centre and width). */
  landing: { x: number; y: number; width: number };
}

export function StampCamera({ active, topInset, bottomInset, landing }: StampCameraProps) {
  const screen = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const preview = useRef<View>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [place, setPlace] = useState<PlaceState>('finding');
  // The fresh fix, for a shot taken before it arrived.
  const freshPlace = useRef<Promise<FoundPlace | null> | null>(null);
  const [phase, setPhase] = useState<Phase>('aiming');
  const [made, setMade] = useState<Made | null>(null);
  const [zoom, setZoom] = useState(0);
  const { add, stamps, deliver } = useStamps();
  const flash = useSharedValue(0);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    let live = true;
    // Show the last known place at once, then replace it with a fresh fix.
    lastKnownPlace().then((quick) => live && quick && setPlace((p) => (p === 'finding' ? quick : p)));
    freshPlace.current = lookupLocation();
    freshPlace.current.then((found) => live && setPlace((p) => found ?? (p === 'finding' ? null : p)));
    return () => {
      live = false;
    };
  }, []);

  // The stamp: as large as fits between the place line and the shutter, centred there.
  const top = topInset + PLACE_LINE;
  const bottom = screen.height - bottomInset - CONTROLS;
  const stampW = Math.min(screen.width * STAMP_WIDTH, (bottom - top) / STAMP_ASPECT);
  const stampH = stampW * STAMP_ASPECT;
  const stampX = (screen.width - stampW) / 2;
  const stampY = top + (bottom - top - stampH) / 2;
  // The photo runs to the stamp's perforated edge, so the window is the whole stamp.
  const window = { x: stampX, y: stampY, width: stampW, height: stampH };

  const pinchStart = useSharedValue(0);
  const pinch = Gesture.Pinch()
    .onStart(() => pinchStart.set(zoom))
    .onUpdate((e) => {
      const next = Math.min(MAX_ZOOM, Math.max(0, pinchStart.get() + (e.scale - 1) * 0.12));
      runOnJS(setZoom)(next);
    });

  const shoot = async () => {
    if (phase !== 'aiming' || !camera.current) return;
    setPhase('shooting');
    haptic.press();
    // The flash fires on the press itself, before the camera answers.
    flash.set(1);
    flash.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    try {
      // A snapshot of the viewfinder as shown, taken alongside the photo: the stamp's
      // source when the photo turns out not to match the preview.
      const shown = captureRef(preview, { format: 'jpg', quality: 0.95 }).catch(() => null);
      const shot = await camera.current.takePictureAsync({ quality: 0.9 });
      camera.current?.pausePreview().catch(() => undefined);
      const resolved = place !== 'finding' && place ? place : await freshPlace.current;
      if (!resolved?.name) {
        camera.current?.resumePreview().catch(() => undefined);
        setPhase('aiming');
        askForLocation();
        return;
      }
      // Crop against the image as decoded (orientation applied), not the size the camera
      // reports: those can differ.
      const upright = await ImageManipulator.manipulate(shot.uri).renderAsync();
      const view = { width: screen.width, height: screen.height };
      let source: string | typeof upright = upright;
      let crop = photoCropFor({ width: upright.width, height: upright.height }, view, window);
      if (!photoMatchesPreview({ width: upright.width, height: upright.height }, view)) {
        // The photo isn't the picture the viewfinder showed (simulator cameras hand back a
        // different frame), so the stamp is cut from what was on screen instead.
        const snapshot = await shown;
        if (snapshot) {
          const frame = await ImageManipulator.manipulate(snapshot).renderAsync();
          const scale = frame.width / view.width;
          source = frame;
          crop = { originX: Math.round(window.x * scale), originY: Math.round(window.y * scale), width: Math.round(window.width * scale), height: Math.round(window.height * scale) };
        } else {
          crop = stampCropFor({ width: upright.width, height: upright.height }, view, window);
        }
      }
      const image = await ImageManipulator.manipulate(source).crop(crop).resize({ width: PHOTO_PX }).renderAsync();
      const saved = await image.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
      const dest = `${FileSystem.documentDirectory}stamp_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: saved.uri, to: dest });
      const newPlace = isNewPlace(stamps, resolved.name);
      const createdAt = Date.now();
      await add({ imageUri: dest, place: resolved.name, country: resolved.country, latitude: resolved.lat, longitude: resolved.lng, createdAt });
      setMade({ uri: dest, place: resolved.name, createdAt, serial: stamps.length + 1, newPlace });
      setPhase('stamped');
    } catch (error) {
      trackError(error, 'stamp_capture');
      camera.current?.resumePreview().catch(() => undefined);
      setPhase('aiming');
      Alert.alert("Couldn't make the stamp", 'Something went wrong taking the photo. Try again.');
    }
  };

  // Done: the stamp flies down into the fan's centre slot, shrinking to the
  // fan's size on a slight arc; as it arrives it's handed to the collection
  // (which settles it in place) and the viewfinder comes back.
  const fly = useSharedValue(0);
  const done = () => {
    if (phase !== 'stamped') return;
    haptic.tap();
    setPhase('delivering');
    // The viewfinder wakes while the stamp is in the air, so it's live when it lands.
    camera.current?.resumePreview().catch(() => undefined);
    fly.set(withTiming(1, { duration: FLY_MS, easing: Easing.inOut(Easing.cubic) }));
    setTimeout(() => {
      deliver();
      setMade(null);
      setPhase('aiming');
      setZoom(0);
      fly.set(0);
    }, FLY_MS);
  };

  // The made stamp's reveal: the viewfinder and its controls step aside. They come
  // back as soon as it starts flying to the drawer, so the camera is there behind it.
  const revealing = phase === 'stamped';
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  if (permission && !permission.granted) {
    return (
      <View style={[styles.root, styles.centre, { paddingBottom: bottomInset }]}>
        <ThemedText style={styles.note}>Fold needs the camera to make stamps</ThemedText>
        <Pressable onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()} accessibilityRole="button" style={styles.allow}>
          <ThemedText style={styles.allowText}>{permission.canAskAgain ? 'ALLOW CAMERA' : 'OPEN SETTINGS'}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pinch}>
        <View style={StyleSheet.absoluteFill}>
          <View ref={preview} collapsable={false} style={StyleSheet.absoluteFill}>
            {/* Stays mounted through the reveal (only paused): remounting it showed a second of black. */}
            {<CameraView ref={camera} style={StyleSheet.absoluteFill} active={active} facing={facing} mirror={facing === 'front'} zoom={zoom} animateShutter={false} />}
          </View>
          <StampMask screen={screen} x={stampX} y={stampY} w={stampW} h={stampH} solid={revealing} />
        </View>
      </GestureDetector>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      {/* The place, printed above the stamp; tap it to turn location on. */}
      {!revealing && (
        <Animated.View entering={fadeIn(260, 120)} style={[styles.placeLine, { top: stampY - 44 }]}>
          <Pressable onPress={place === null ? askForLocation : undefined} disabled={place !== null} accessibilityRole={place === null ? 'button' : 'text'}>
            <ThemedText style={styles.placeText} numberOfLines={1}>
              {placeLabel(place)}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {made && <MadeStamp made={made} x={stampX} y={stampY} w={stampW} fly={fly} landing={landing} />}

      {!revealing ? (
        <Animated.View entering={riseIn(320, 160, 12)} style={[styles.controls, { bottom: bottomInset + SHUTTER_LIFT }]}>
          <View style={styles.side}>{zoom > 0.01 && <ThemedText style={styles.zoom}>{(1 + zoom * 10).toFixed(1)}×</ThemedText>}</View>
          <Pressable
            onPress={shoot}
            disabled={phase !== 'aiming'}
            accessibilityRole="button"
            accessibilityLabel="Make stamp"
            style={({ pressed }) => [styles.shutter, { transform: [{ scale: pressed || phase === 'shooting' ? 0.9 : 1 }] }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.side}>
            <RoundButton icon={SwitchCamera} accessibilityLabel="Switch camera" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
          </View>
        </Animated.View>
      ) : (
        phase === 'stamped' && (
          <Animated.View entering={riseIn(320, 900, 14)} exiting={FadeOut.duration(120)} style={[styles.after, { bottom: bottomInset + SHUTTER_LIFT }]}>
            <Pressable onPress={done} accessibilityRole="button" accessibilityLabel="Done, add to collection" style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={styles.primaryText}>DONE</ThemedText>
            </Pressable>
          </Animated.View>
        )
      )}
    </View>
  );
}

function askForLocation() {
  Alert.alert('Where are you?', 'A stamp is proof of a place, so Fold needs your location to make one.', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

/** "PUNE · INDIA", or what's happening while there's no place yet. */
function placeLabel(place: PlaceState): string {
  if (place === 'finding') return 'FINDING YOU…';
  if (!place?.name) return 'LOCATION OFF · TAP TO ALLOW';
  return [place.name, place.country].filter(Boolean).join(' · ').toUpperCase();
}

interface MaskProps {
  screen: { width: number; height: number };
  x: number;
  y: number;
  w: number;
  h: number;
  /** After the shot the live view is gone; the dim becomes solid. */
  solid: boolean;
}

/**
 * The viewfinder's frame, drawn like the collection's blank stamp: the
 * screen stays the app's plain dark and the camera shows through a stamp
 * cut out of it, scalloped edge and all, with a thin outline tracing it.
 */
function StampMask({ screen, x, y, w, h, solid }: MaskProps) {
  const { r, holes } = stampPerforation(w);
  const outline = stampOutline(w, h, r, holes, { x, y });
  return (
    <Svg width={screen.width} height={screen.height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={solid ? `M 0 0 H ${screen.width} V ${screen.height} H 0 Z` : `M 0 0 H ${screen.width} V ${screen.height} H 0 Z ${outline}`} fill={BACKDROP} fillRule="evenodd" />
      {!solid && <Path d={outline} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.5} fill="none" />}
    </Svg>
  );
}

/**
 * The finished stamp: its postmark comes down a beat after it shows, lands
 * hard (thud) and settles; then what it means is printed under it.
 */
function MadeStamp({ made, x, y, w, fly, landing }: { made: Made; x: number; y: number; w: number; fly: SharedValue<number>; landing: { x: number; y: number; width: number } }) {
  const ink = useSharedValue(0);
  useEffect(() => {
    ink.set(withDelay(260, withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) })));
    const thud = setTimeout(() => haptic.thud(), 470);
    const cheer = setTimeout(() => haptic.success(), 820);
    return () => {
      clearTimeout(thud);
      clearTimeout(cheer);
    };
  }, [ink]);

  const h = w * STAMP_ASPECT;
  // The flight: from this stamp's centre to the fan slot's centre, at the fan's size.
  const end = landing.width / w;
  const dx = landing.x - (x + w / 2);
  const dy = landing.y + (landing.width * STAMP_ASPECT) / 2 - (y + h / 2);
  const flight = useAnimatedStyle(() => {
    const t = fly.get();
    return {
      transform: [
        { translateX: dx * t },
        // A slight lift first, then down: an arc, not a slide.
        { translateY: dy * t - Math.sin(t * Math.PI) * 36 },
        { rotate: `${Math.sin(t * Math.PI) * -6}deg` },
        { scale: 1 + (end - 1) * t },
      ],
    };
  });
  // The postmark and the caption under the stamp go first; the stamp arrives clean, as it sits in the fan.
  const extras = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, fly.get() * 3) }));
  const mark = useAnimatedStyle(() => ({
    opacity: ink.get() * (1 - Math.min(1, fly.get() * 3)),
    transform: [{ scale: 1.6 - ink.get() * 0.6 }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, flight]} pointerEvents="none">
      <StampView imageUri={made.uri} place={made.place} createdAt={made.createdAt} width={w} postmark={false} serial={made.serial} />
      <Animated.View style={[{ position: 'absolute', right: -w * 0.06, top: w * 0.42 }, mark]}>
        <Postmark size={w * 0.42} place={made.place} createdAt={made.createdAt} style={{ position: 'relative' }} />
      </Animated.View>
      <Animated.View style={extras}>
        <Animated.View entering={FadeIn.delay(700).duration(320)} style={styles.verdict}>
          <ThemedText style={styles.verdictBadge}>{made.newPlace ? 'NEW PLACE' : `BACK IN ${made.place.toUpperCase()}`}</ThemedText>
          <ThemedText style={styles.verdictMeta}>{formatSerial(made.serial)} in your collection</ThemedText>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKDROP },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  flash: { backgroundColor: '#FFFFFF' },
  note: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 13, textAlign: 'center' },
  allow: { height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  allowText: { color: '#111111', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  placeLine: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  placeText: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 2.5 },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  side: { width: 48, alignItems: 'center' },
  zoom: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  verdict: { alignItems: 'center', marginTop: 28, gap: 6 },
  verdictBadge: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Bold', fontSize: 13, letterSpacing: 3 },
  verdictMeta: { color: '#FFFFFF99', fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },
  after: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  primary: { height: 48, paddingHorizontal: 34, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  primaryText: { color: '#111111', fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
});
