/**
 * StampAlbumCard — the profile's stamps, as a map you can move around: a
 * real map framed on every place you've stamped, each place marked by its
 * own stamp as a small thumbnail pin. Tap a pin: that stamp on the full map.
 * The map is the card; its + makes a new stamp.
 *
 * MapLibre with OpenFreeMap tiles (StampMapView), the same on both.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { MAPS_AVAILABLE, StampMapView } from '@/components/stamps/stamp-map-view';
import { ThemedText } from '@/components/themed-text';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { regionFor } from '@/stamps/geometry';
import { navigate } from '@/utils/navigation';

const MAP_H = 240;
export function StampAlbumCard() {
  const theme = useTheme();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const region = useMemo(() => regionFor(stamps), [stamps]);

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {MAPS_AVAILABLE && region ? (
        <StampMapView
          stamps={stamps}
          camera={{ latitude: region.latitude, longitude: region.longitude, zoom: Math.max(1, region.zoom - 1) }}
          onPinPress={(id) => {
            haptic.tap();
            navigate.push(`/stamps/map?id=${id}`);
          }}
          showLocationButton
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.empty}>
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            {loaded && stamps.length === 0 ? 'your first stamp lands here' : 'this version has no map yet'}
          </ThemedText>
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
});
