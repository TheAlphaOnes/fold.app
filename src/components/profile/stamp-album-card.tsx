/**
 * StampAlbumCard — the profile's stamps, as a map you can move around: a
 * real map framed on every place you've stamped, each place marked by its
 * own stamp as a small thumbnail pin. Tap a pin: that stamp on the full map.
 * The header's + makes a new stamp.
 *
 * Apple Maps on iOS, Google Maps on Android (StampMapView).
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Stamp as StampIcon } from 'lucide-react-native';

import { MAPS_AVAILABLE, StampMapView } from '@/components/stamps/stamp-map-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
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

      <View style={[styles.mapBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
        {MAPS_AVAILABLE && region ? (
          <StampMapView
            stamps={stamps}
            camera={{ latitude: region.latitude, longitude: region.longitude, zoom: Math.max(1, region.zoom - 1) }}
            onPinPress={(id) => {
              haptic.tap();
              navigate.push(`/stamps/map?id=${id}`);
            }}
          />
        ) : (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
              {loaded && stamps.length === 0 ? 'your first stamp lands here' : 'this version has no map yet'}
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
