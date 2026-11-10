/**
 * StampMapView — one map for stamps on both platforms: Apple Maps on iOS,
 * Google Maps on Android (needs the Google Maps key in app.json,
 * android.config.googleMaps.apiKey). Each place is pinned with its stamp's
 * own photo, loaded small. Used by the profile card and the full stamp map.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useImage, type ImageRef } from 'expo-image';

import { hasNativeModule } from '@/components/stamps/needs-update';
import { useThemeContext } from '@/hooks/use-theme';
import type { Stamp } from '@/types/stamp';

/** Pin thumbnails are decoded small: they're drawn at ~40pt. */
const PIN_PX = 96;
const MAX_PINS = 40;

const maps: typeof import('expo-maps') | null = hasNativeModule('ExpoMaps')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-maps')
  : null;

/** Whether this build can draw a map at all. */
export const MAPS_AVAILABLE = maps !== null;

export interface StampMapHandle {
  /** Moves the camera to a place. */
  focus: (latitude: number, longitude: number, zoom: number) => void;
}

interface StampMapViewProps {
  stamps: Stamp[];
  camera: { latitude: number; longitude: number; zoom: number } | undefined;
  onPinPress?: (stampId: number) => void;
  onMapPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Loads one stamp's photo as a small image for its pin, and hands it up. */
function PinImage({ stamp, onReady }: { stamp: Stamp; onReady: (id: number, image: ImageRef) => void }) {
  const image = useImage({ uri: stamp.imageUri }, { maxWidth: PIN_PX, maxHeight: PIN_PX });
  useEffect(() => {
    if (image) onReady(stamp.id, image);
  }, [image, stamp.id, onReady]);
  return null;
}

export const StampMapView = forwardRef<StampMapHandle, StampMapViewProps>(function StampMapView({ stamps, camera, onPinPress, onMapPress, style }, ref) {
  const { isDark } = useThemeContext();
  const apple = useRef<import('expo-maps').AppleMaps.MapView>(null);
  const google = useRef<import('expo-maps').GoogleMaps.MapView>(null);

  useImperativeHandle(ref, () => ({
    focus: (latitude, longitude, zoom) => {
      const pos = { coordinates: { latitude, longitude }, zoom };
      apple.current?.setCameraPosition(pos);
      google.current?.setCameraPosition(pos);
    },
  }));

  // One pin per place: the newest stamp taken there.
  const pins = useMemo(() => {
    const seen = new Set<string>();
    const out: Stamp[] = [];
    for (const s of stamps) {
      const key = `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= MAX_PINS) break;
    }
    return out;
  }, [stamps]);

  const [images, setImages] = useState<Record<number, ImageRef>>({});
  const onReady = useCallback((id: number, image: ImageRef) => setImages((m) => (m[id] === image ? m : { ...m, [id]: image })), []);

  if (!maps) return null;
  const cameraPosition = camera ? { coordinates: { latitude: camera.latitude, longitude: camera.longitude }, zoom: camera.zoom } : undefined;
  const loaders = pins.map((s) => <PinImage key={s.id} stamp={s} onReady={onReady} />);

  if (Platform.OS === 'ios') {
    const { AppleMaps } = maps;
    return (
      <>
        {loaders}
        <AppleMaps.View
          ref={apple}
          style={style ?? StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          annotations={pins.map((s) => ({ id: String(s.id), coordinates: { latitude: s.latitude, longitude: s.longitude }, icon: images[s.id], backgroundColor: '#FFFFFF', ...(images[s.id] ? {} : { text: '·' }) }))}
          onAnnotationClick={(a) => a.id && onPinPress?.(Number(a.id))}
          onMapClick={onMapPress}
          uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
          properties={{ pointsOfInterest: { including: [] }, elevation: AppleMaps.MapStyleElevation.FLAT }}
        />
      </>
    );
  }

  const { GoogleMaps } = maps;
  return (
    <>
      {loaders}
      <GoogleMaps.View
        ref={google}
        style={style ?? StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
        markers={pins.map((s) => ({ id: String(s.id), coordinates: { latitude: s.latitude, longitude: s.longitude }, title: s.place, icon: images[s.id] }))}
        onMarkerClick={(m) => m.id && onPinPress?.(Number(m.id))}
        onMapClick={onMapPress}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, mapToolbarEnabled: false, zoomControlsEnabled: false, indoorLevelPickerEnabled: false }}
      />
    </>
  );
});
