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
 *
 * The full screen is the fallback for an app without the camera module;
 * normally the collection is the drawer under the stamp camera (StampStudio),
 * which reuses StampTile and EmptyCollection from here.
 */

import React, { useEffect, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map as MapIcon, Stamp as StampIcon } from 'lucide-react-native';

import Svg, { Path } from 'react-native-svg';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { BalancedText } from '@/components/balanced-text';
import { GrainBackground } from '@/components/grain-background';
import { CloseButton, ROUND_BUTTON_SIZE, RoundButton } from '@/components/round-button';
import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { fadeIn, riseIn } from '@/constants/motion';
import { useBottomInset } from '@/hooks/use-bottom-inset';
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
  const bottomInset = useBottomInset();
  const { width } = useWindowDimensions();
  const { stamps, loaded, load, remove, justAdded, clearJustAdded } = useStamps();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  // The new stamp lands once; after that it's just part of the sheet.
  useEffect(() => {
    if (justAdded == null) return;
    const t = setTimeout(clearJustAdded, 1400);
    return () => clearTimeout(t);
  }, [justAdded, clearJustAdded]);

  // Numbers in the order stamps were made (No. 001 is the first).
  const serials = useMemo(() => new Map([...stamps].sort((a, b) => a.createdAt - b.createdAt).map((s, i) => [s.id, i + 1])), [stamps]);

  const tile = (width - EDGE * 2 - COLUMN_GAP) / 2;
  const openCamera = useGuardedPress(() => navigate.push('/stamps/camera'));


  const confirmRemove = (stamp: Stamp) => {
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
        // Virtualised: a long collection only decodes the stamps on screen.
        <FlatList
          data={stamps}
          keyExtractor={(s) => String(s.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: bottomInset + ROUND_BUTTON_SIZE + 48 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          renderItem={({ item, index }) => (
            <StampTile
              stamp={item}
              width={tile}
              serial={serials.get(item.id)}
              index={index}
              landing={item.id === justAdded}
              onOpen={() => navigate.push(`/stamps/map?id=${item.id}`)}
              onRemove={() => confirmRemove(item)}
            />
          )}
        />
      )}

      <Animated.View entering={riseIn(340, 180, 12)} style={[styles.bottom, { paddingBottom: bottomInset + 8 }]}>
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

export interface StampTileProps {
  stamp: Stamp;
  width: number;
  serial?: number;
  index: number;
  /** Just made: drops onto the sheet with a thud instead of rising in. */
  landing: boolean;
  onOpen: () => void;
  onRemove: () => void;
}

/** One stamp on the sheet, at its own tilt. */
export function StampTile({ stamp, width, serial, index, landing, onOpen, onRemove }: StampTileProps) {
  const drop = useSharedValue(landing ? 0 : 1);
  useEffect(() => {
    if (!landing) return;
    // Held over the sheet, then pressed down hard and settles: the stamp being placed.
    drop.set(withDelay(250, withTiming(1, { duration: 320, easing: Easing.in(Easing.cubic) })));
    const thud = setTimeout(() => haptic.thud(), 570);
    return () => clearTimeout(thud);
  }, [landing, drop]);
  const placed = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.get() * 3),
    transform: [{ scale: 1.35 - drop.get() * 0.35 }, { rotate: `${(1 - drop.get()) * -10}deg` }],
  }));
  const tilt = stampTilt(stamp.id);
  return (
    // The entrance and the landing live on separate views (one animation per view).
    <Animated.View entering={landing ? undefined : riseIn(360, 60 + Math.min(index, 10) * 50, 14)} style={{ width, height: width * STAMP_ASPECT + 8 }}>
      <Animated.View style={placed}>
        <Pressable
          onPress={onOpen}
          onLongPress={() => {
            haptic.thud();
            onRemove();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Stamp from ${stamp.place}`}
          accessibilityHint="Shows it on the map. Hold to remove."
          style={({ pressed }) => ({ transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.96 : 1 }] })}
        >
          <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={width} serial={serial} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/** No stamps yet: an empty perforated outline and a line on what stamps are. */
export function EmptyCollection({ width }: { width: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={fadeIn(320, 120)} style={styles.empty}>
      <View style={[styles.emptyStamp, { width, height: width * STAMP_ASPECT }]}>
        {/* A blank stamp: the same perforated paper as a real one, drawn as an outline. */}
        <Svg width={width} height={width * STAMP_ASPECT} style={StyleSheet.absoluteFill}>
          <Path d={stampOutline(width - 2, width * STAMP_ASPECT - 2, width * 0.026, Math.round(width / (width * 0.026 * 3.6)), { x: 1, y: 1 })} stroke={theme.textMuted} strokeOpacity={0.7} strokeWidth={1.5} fill="none" />
        </Svg>
        <StampIcon size={28} color={theme.textMuted} strokeWidth={1.5} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>your first stamp</ThemedText>
      <BalancedText style={[styles.emptyBody, { color: theme.textMuted }]}>take a photo wherever you are and it becomes a stamp of that place, kept here and on your map</BalancedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: EDGE, paddingBottom: 12 },
  title: { flex: 1, alignItems: 'center' },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.8, marginTop: 2 },
  grid: { paddingHorizontal: EDGE, paddingTop: 16, gap: COLUMN_GAP },
  row: { gap: COLUMN_GAP },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  cta: { height: ROUND_BUTTON_SIZE + 10, paddingHorizontal: 26, borderRadius: (ROUND_BUTTON_SIZE + 10) / 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14, paddingBottom: 80 },
  emptyStamp: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontFamily: 'JetBrainsMono-Medium', fontSize: 15, letterSpacing: 0.5 },
  emptyBody: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
