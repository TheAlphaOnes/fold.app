/**
 * StampAlbumCard — the profile's stamps, as a map: a real map framed on
 * every place you've stamped, a pin at each, your latest stamp riding in
 * the corner like a stamp on a postcard. The map is a picture here (no
 * panning, so the page scrolls freely); tapping it opens the full stamp map.
 *
 * iOS uses Apple Maps; elsewhere (or on a build without the maps module)
 * the card shows the latest stamp alone.
 */

import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Stamp as StampIcon } from 'lucide-react-native';

import { hasNativeModule } from '@/components/stamps/needs-update';
import { StampView } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme, useThemeContext } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { regionFor } from '@/stamps/geometry';
import { navigate } from '@/utils/navigation';

const MAP_H = 220;
const CORNER_STAMP = 64;

// Loaded only where the maps module exists, so older builds don't crash.
const AppleMaps: typeof import('expo-maps').AppleMaps | null =
  Platform.OS === 'ios' && hasNativeModule('ExpoMaps')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-maps').AppleMaps
    : null;

export function StampAlbumCard() {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const region = useMemo(() => regionFor(stamps), [stamps]);
  const latest = stamps[0];

  const openMap = () => {
    haptic.tap();
    navigate.push(stamps.length > 0 ? '/stamps/map' : '/stamps');
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable onPress={() => navigate.push('/stamps?view=collection')} style={({ pressed }) => [styles.header, pressed && styles.headerPressed]} accessibilityRole="button" accessibilityLabel="Stamp collection">
        <View style={styles.headerLead}>
          <StampIcon size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STAMPS</ThemedText>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      <Pressable onPress={openMap} accessibilityRole="button" accessibilityLabel="Open the map of your stamps" style={[styles.mapBox, { borderColor: theme.border }]}>
        {/* The map only draws; touches go to the card, so the page scrolls over it. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {AppleMaps && region ? (
            <AppleMaps.View
              style={StyleSheet.absoluteFill}
              cameraPosition={{ coordinates: { latitude: region.latitude, longitude: region.longitude }, zoom: Math.max(1, region.zoom - 1) }}
              colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
              markers={stamps.map((s) => ({ id: String(s.id), coordinates: { latitude: s.latitude, longitude: s.longitude }, systemImage: 'seal.fill', tintColor: theme.accentWarm }))}
              uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
              properties={{ pointsOfInterest: { including: [] }, elevation: AppleMaps.MapStyleElevation.FLAT }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
          )}
        </View>

        {/* The latest stamp, stuck in the corner like on a postcard. */}
        {latest ? (
          <View style={styles.corner} pointerEvents="none">
            <StampView imageUri={latest.imageUri} place={latest.place} createdAt={latest.createdAt} width={CORNER_STAMP} postmark />
          </View>
        ) : (
          <View style={styles.empty} pointerEvents="none">
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>your first stamp lands here</ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBox: { height: MAP_H, marginHorizontal: 12, marginBottom: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  corner: { position: 'absolute', right: 12, top: 12, transform: [{ rotate: '6deg' }] },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
});
