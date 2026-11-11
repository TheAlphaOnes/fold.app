/**
 * StampMapView — one map for stamps, the same on iOS and Android: MapLibre
 * with OpenFreeMap tiles (free, no key, no account). Each place is pinned
 * with a little perforated stamp of its newest photo. Used by the profile
 * card and the full stamp map.
 */

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, TurboModuleRegistry, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';

import { StampView } from '@/components/stamps/stamp-view';
import { useThemeContext } from '@/hooks/use-theme';
import type { Stamp } from '@/types/stamp';

/** OpenFreeMap's styles: free vector tiles, no key. */
const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
const PIN = 44;
const MAX_PINS = 40;

// A build without MapLibre's native side can't draw the map (and importing it would throw).
const maplibre: typeof import('@maplibre/maplibre-react-native') | null =
  TurboModuleRegistry.get('MLRNMapViewModule') != null
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@maplibre/maplibre-react-native')
    : null;

/** Whether this build can draw a map at all. */
export const MAPS_AVAILABLE = maplibre !== null;

export interface StampMapHandle {
  /** Moves the camera to a place. */
  focus: (latitude: number, longitude: number, zoom: number) => void;
}

interface StampMapViewProps {
  stamps: Stamp[];
  camera: { latitude: number; longitude: number; zoom: number } | undefined;
  onPinPress?: (stampId: number) => void;
  onMapPress?: () => void;
  /** Pin size; the full map uses bigger stamps than the profile card. */
  pinSize?: number;
  selectedId?: number | null;
  /** Show a button that recenters the map on the phone's current position. */
  showLocationButton?: boolean;
  /** How far that button sits from the map's bottom edge; screens with a bottom bar push it clear. */
  locationButtonBottom?: number;
  style?: StyleProp<ViewStyle>;
}

export const StampMapView = forwardRef<StampMapHandle, StampMapViewProps>(function StampMapView({ stamps, camera, onPinPress, onMapPress, pinSize = PIN, selectedId = null, showLocationButton = false, locationButtonBottom = 12, style }, ref) {
  const { isDark, colors } = useThemeContext();
  const cam = useRef<import('@maplibre/maplibre-react-native').CameraRef>(null);
  const [locating, setLocating] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: (latitude, longitude, zoom) => cam.current?.flyTo({ center: [longitude, latitude], zoom, duration: 700 }),
  }));

  /** Recenters the map on the phone's current position. */
  const goToLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location is off', 'Allow location access in Settings to find yourself on the map.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      cam.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 13, duration: 700 });
    } catch (error) {
      console.warn('Failed to find your location', error);
      Alert.alert("Couldn't find you", 'Try again in a moment.');
    } finally {
      setLocating(false);
    }
  };

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

  // The journey in the order it happened, as one faint line under the pins.
  const route = useMemo(() => {
    if (stamps.length < 2) return null;
    const ordered = [...stamps].sort((a, b) => a.createdAt - b.createdAt);
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: ordered.map((s) => [s.longitude, s.latitude]),
          },
        },
      ],
    };
  }, [stamps]);

  if (!maplibre) return null;
  const { Map, Camera, Marker, GeoJSONSource, Layer } = maplibre;

  return (
    <View style={style ?? StyleSheet.absoluteFill}>
      <Map style={StyleSheet.absoluteFill} mapStyle={isDark ? STYLE_DARK : STYLE_LIGHT} logo={false} compass={false} attribution={false} onPress={onMapPress}>
        <Camera ref={cam} initialViewState={camera ? { center: [camera.longitude, camera.latitude], zoom: camera.zoom } : undefined} />
        {route && (
          <GeoJSONSource id="stamp-journey" data={route}>
            <Layer
              id="stamp-journey-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': colors.text, 'line-opacity': 0.35, 'line-width': 2 }}
            />
          </GeoJSONSource>
        )}
        {pins.map((s) => {
          const size = s.id === selectedId ? pinSize * 1.35 : pinSize;
          return (
            <Marker key={s.id} id={String(s.id)} lngLat={[s.longitude, s.latitude]} anchor="center">
              <Pressable onPress={() => onPinPress?.(s.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Stamp from ${s.place}`} style={styles.pin}>
                <StampView imageUri={s.imageUri} place={s.place} createdAt={s.createdAt} width={size} postmark={false} />
              </Pressable>
            </Marker>
          );
        })}
      </Map>
      {showLocationButton && (
        <Pressable
          onPress={goToLocation}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Go to my location"
          style={[styles.locationButton, { backgroundColor: colors.background + 'E6', borderColor: colors.border, bottom: locationButtonBottom }]}
        >
          <LocateFixed size={18} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  pin: { transform: [{ rotate: '-6deg' }] },
  locationButton: { position: 'absolute', right: 12, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
