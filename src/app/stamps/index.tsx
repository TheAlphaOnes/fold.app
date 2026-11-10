/**
 * Stamp collection — every place you've stamped, as a pinned-up sheet of
 * stamps (two columns, each laid down at its own slight tilt).
 *
 *   ✕   STAMPS · 12 stamps · 5 places           🗺
 *   [stamp] [stamp]
 *   [stamp] [stamp]
 *            [ STAMP A PLACE ]                 primary, at the thumb
 *
 * Tap a stamp to see it on the map; hold to remove it.
 */

import React, { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map as MapIcon, Stamp as StampIcon } from 'lucide-react-native';

import { GrainBackground } from '@/components/grain-background';
import { CloseButton, ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';
import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { fadeIn, riseIn } from '@/constants/motion';
import { useGuardedPress } from '@/hooks/use-guarded-press';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { placeCount, stampTilt } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const EDGE = 16;
const COLUMN_GAP = 18;

export default function StampCollection() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { stamps, loaded, load, remove } = useStamps();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const tile = (width - EDGE * 2 - COLUMN_GAP) / 2;
  const openCamera = useGuardedPress(() => navigate.push('/stamps/camera'));

  const confirmRemove = (stamp: Stamp) => {
    haptic.thud();
    Alert.alert('Remove this stamp?', `${stamp.place} will come off your collection and map.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(stamp.id) },
    ]);
  };

  const places = placeCount(stamps);
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GrainBackground />
      <Animated.View entering={fadeIn(200)} style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <CloseButton accessibilityLabel="Close stamps" />
        <View style={styles.title}>
          <ThemedText style={[Type.rail, { color: theme.text }]}>STAMPS</ThemedText>
          {stamps.length > 0 && (
            <ThemedText style={[styles.count, { color: theme.textMuted }]}>
              {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'} · {places} {places === 1 ? 'place' : 'places'}
            </ThemedText>
          )}
        </View>
        <RoundButton icon={MapIcon} accessibilityLabel="Map of your stamps" onPress={() => navigate.push('/stamps/map')} />
      </Animated.View>

      {loaded && stamps.length === 0 ? (
        <EmptyCollection width={tile * 1.15} />
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + ROUND_BUTTON_SIZE + 48 }]} showsVerticalScrollIndicator={false}>
          {stamps.map((stamp, i) => (
            // Laid down one after another: each arrives a beat after the last.
            <Animated.View key={stamp.id} entering={riseIn(360, 60 + Math.min(i, 10) * 50, 14)} style={{ width: tile, height: tile * STAMP_ASPECT + 8 }}>
              <Pressable
                onPress={() => navigate.push(`/stamps/map?id=${stamp.id}`)}
                onLongPress={() => confirmRemove(stamp)}
                accessibilityRole="button"
                accessibilityLabel={`Stamp from ${stamp.place}`}
                accessibilityHint="Shows it on the map. Hold to remove."
                style={({ pressed }) => ({ transform: [{ rotate: `${stampTilt(stamp.id)}deg` }, { scale: pressed ? 0.96 : 1 }] })}
              >
                <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={tile} />
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Animated.View entering={riseIn(340, 180, 12)} style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          onPress={openCamera}
          accessibilityRole="button"
          accessibilityLabel="Stamp a place"
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.text, opacity: pressed ? 0.75 : 1 }]}
        >
          <StampIcon size={16} color={theme.background} />
          <ThemedText style={[styles.ctaText, { color: theme.background }]}>STAMP A PLACE</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** No stamps yet: an empty perforated outline and a line on what stamps are. */
function EmptyCollection({ width }: { width: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={fadeIn(320, 120)} style={styles.empty}>
      <View style={[styles.emptyStamp, { width, height: width * STAMP_ASPECT, borderColor: theme.border }]}>
        <StampIcon size={28} color={theme.textMuted} strokeWidth={1.5} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>your first stamp</ThemedText>
      <ThemedText style={[styles.emptyBody, { color: theme.textMuted }]}>take a photo wherever you are and it becomes a stamp of that place, kept here and on your map</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: EDGE, paddingBottom: 12 },
  title: { flex: 1, alignItems: 'center' },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.8, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLUMN_GAP, paddingHorizontal: EDGE, paddingTop: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  cta: { height: ROUND_BUTTON_SIZE + 10, paddingHorizontal: 26, borderRadius: (ROUND_BUTTON_SIZE + 10) / 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14, paddingBottom: 80 },
  emptyStamp: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontFamily: 'JetBrainsMono-Medium', fontSize: 15, letterSpacing: 0.5 },
  emptyBody: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
