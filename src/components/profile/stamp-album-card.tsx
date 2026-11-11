/**
 * StampAlbumCard — the profile's stamps, as a map you can move around: a
 * real map framed on every place you've stamped, each place marked by its
 * own stamp as a small thumbnail pin. Tap a pin: that stamp on the full map.
 * The map is the card; its + makes a new stamp.
 *
 * MapLibre with OpenFreeMap tiles (StampMapView), the same on both. Before
 * the first stamp exists the map waits on a world view, hinting where the
 * first one will land, and frames your places once they arrive.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { MAPS_AVAILABLE, StampMapView, type StampMapHandle } from '@/components/stamps/stamp-map-view';
import { ThemedText } from '@/components/themed-text';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { regionFor, UNSTAMPED_REGION } from '@/stamps/geometry';
import { navigate } from '@/utils/navigation';

const MAP_H = 240;
interface StampAlbumCardProps {
  /** A finger is on the map: the page's scroll stands down while true. */
  onInteractChange?: (active: boolean) => void;
}

export function StampAlbumCard({ onInteractChange }: StampAlbumCardProps) {
  const theme = useTheme();
  const { stamps, loaded, load } = useStamps();
  const map = useRef<StampMapHandle>(null);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const region = useMemo(() => regionFor(stamps), [stamps]);

  // Opened before the collection was in: the card starts on the waiting
  // world view, then flies to the stamps once they arrive.
  const framed = useRef(region !== null);
  useEffect(() => {
    if (framed.current || !region) return;
    framed.current = true;
    map.current?.focus(region.latitude, region.longitude, Math.max(1, region.zoom - 1));
  }, [region]);

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {MAPS_AVAILABLE ? (
        <StampMapView
          ref={map}
          stamps={stamps}
          camera={region ? { latitude: region.latitude, longitude: region.longitude, zoom: Math.max(1, region.zoom - 1) } : UNSTAMPED_REGION}
          onPinPress={(id) => {
            haptic.tap();
            navigate.push(`/stamps/map?id=${id}`);
          }}
          onInteractChange={onInteractChange}
          showLocationButton
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.empty}>
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>this version has no map yet</ThemedText>
        </View>
      )}
      {/* The empty collection keeps the map: its world view carries the hint. */}
      {loaded && stamps.length === 0 && MAPS_AVAILABLE && (
        <View style={styles.hintLayer} pointerEvents="none">
          <View style={[styles.hintChip, { backgroundColor: theme.background + 'F0', borderColor: theme.border }]}>
            <ThemedText style={[styles.hintText, { color: theme.text }]}>your first stamp lands here</ThemedText>
          </View>
        </View>
      )}
      <Pressable
        onPress={() => {
          haptic.tap();
          navigate.push('/stamps');
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Make a stamp"
        style={[styles.addButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      >
        <Plus size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, height: MAP_H, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  addButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
  hintLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hintChip: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 },
  hintText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
});
