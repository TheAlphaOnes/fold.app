/**
 * StampAlbumCard — the profile's stamps, as a map you can move around: a
 * real map framed on every place you've stamped, each place marked by its
 * own stamp as a small thumbnail pin. Tap a pin: that stamp on the full map.
 * The header's + makes a new stamp.
 *
 * iOS uses Apple Maps; elsewhere (or on a build without the maps module)
 * the card shows a note instead.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useImage, type ImageRef } from 'expo-image';
import { Plus, Stamp as StampIcon } from 'lucide-react-native';

import { hasNativeModule } from '@/components/stamps/needs-update';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme, useThemeContext } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { regionFor } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const MAP_H = 240;
/** Pin thumbnails are decoded small: they're drawn at ~40pt. */
const PIN_PX = 96;
/** One pin per place, at most this many (the newest). */
const MAX_PINS = 24;

// Loaded only where the maps module exists, so older builds don't crash.
const AppleMaps: typeof import('expo-maps').AppleMaps | null =
  Platform.OS === 'ios' && hasNativeModule('ExpoMaps')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-maps').AppleMaps
    : null;

/** Loads one stamp's photo as a small image for its pin, and hands it up. */
function PinImage({ stamp, onReady }: { stamp: Stamp; onReady: (id: number, image: ImageRef) => void }) {
  const image = useImage({ uri: stamp.imageUri }, { maxWidth: PIN_PX, maxHeight: PIN_PX });
  useEffect(() => {
    if (image) onReady(stamp.id, image);
  }, [image, stamp.id, onReady]);
  return null;
}

export function StampAlbumCard() {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

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

  const region = useMemo(() => regionFor(stamps), [stamps]);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptic.tap();
            navigate.push('/stamps?view=collection');
          }}
          style={styles.headerLead}
          accessibilityRole="button"
          accessibilityLabel="Stamp collection"
        >
          <StampIcon size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STAMPS</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.tap();
            navigate.push('/stamps');
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Make a stamp"
        >
          <Plus size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {pins.map((s) => (
        <PinImage key={s.id} stamp={s} onReady={onReady} />
      ))}

      <View style={[styles.mapBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
        {AppleMaps && region ? (
          <AppleMaps.View
            style={StyleSheet.absoluteFill}
            cameraPosition={{ coordinates: { latitude: region.latitude, longitude: region.longitude }, zoom: Math.max(1, region.zoom - 1) }}
            colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
            annotations={pins.map((s) => ({
              id: String(s.id),
              coordinates: { latitude: s.latitude, longitude: s.longitude },
              icon: images[s.id],
              backgroundColor: '#FFFFFF',
              ...(images[s.id] ? {} : { text: '·' }),
            }))}
            onAnnotationClick={(a) => {
              haptic.tap();
              navigate.push(`/stamps/map?id=${a.id}`);
            }}
            uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
            properties={{ pointsOfInterest: { including: [] }, elevation: AppleMaps.MapStyleElevation.FLAT }}
          />
        ) : (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
              {loaded && stamps.length === 0 ? 'your first stamp lands here' : 'the map comes to android soon'}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBox: { height: MAP_H, marginHorizontal: 12, marginBottom: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
});
