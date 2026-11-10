/**
 * Stamp map — every place you've stamped, over time.
 *
 *   - a pin per stamp, and a faint line joining them in the order you went;
 *   - the stamp you're looking at hovers over the map, gently bobbing, with
 *     its place and date (tap a pin or a stamp in the strip to change it);
 *   - a strip of all your stamps along the bottom, newest first.
 *
 * Opens on the whole journey, or on one stamp when `?id=` is given (from
 * the collection). Apple Maps on iOS; Android shows a note until a Google
 * Maps key is configured.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { StampMapView, type StampMapHandle } from '@/components/stamps/stamp-map-view';
import { useLocalSearchParams } from 'expo-router';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseButton } from '@/components/round-button';
import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { fadeIn, riseIn } from '@/constants/motion';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { markGuideDone } from '@/services/guide-progress';
import { placeCount, regionFor } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const STRIP_STAMP = 64;
const HOVER_STAMP = 150;
/** Zoom when focusing one stamp: about a city. */
const FOCUS_ZOOM = 11;

export default function StampMap() {
  useEffect(() => markGuideDone('stampmap'), []);
  const theme = useTheme();

  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { stamps, loaded, load } = useStamps();
  const map = useRef<StampMapHandle>(null);
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const selected = stamps.find((s) => s.id === selectedId) ?? null;
  // The journey in the order it happened.
  const journey = useMemo(() => [...stamps].sort((a, b) => a.createdAt - b.createdAt), [stamps]);
  const [initialCamera] = useState(() => {
    const focus = id ? stamps.find((s) => s.id === Number(id)) : undefined;
    if (focus) return { coordinates: { latitude: focus.latitude, longitude: focus.longitude }, zoom: FOCUS_ZOOM };
    const region = regionFor(stamps);
    return region ? { coordinates: { latitude: region.latitude, longitude: region.longitude }, zoom: region.zoom } : undefined;
  });

  // Opened before the collection had loaded (e.g. straight from Profile):
  // frame the stamps once they arrive instead of staying on the world.
  const framed = useRef(initialCamera !== undefined);
  useEffect(() => {
    if (framed.current || stamps.length === 0) return;
    framed.current = true;
    const target = id ? stamps.find((s) => s.id === Number(id)) : undefined;
    const region = regionFor(stamps);
    if (target) map.current?.focus(target.latitude, target.longitude, FOCUS_ZOOM);
    else if (region) map.current?.focus(region.latitude, region.longitude, region.zoom);
  }, [stamps, id]);

  const serials = useMemo(() => new Map(journey.map((s, i) => [s.id, i + 1])), [journey]);

  const focus = (stamp: Stamp) => {
    haptic.select();
    setSelectedId(stamp.id);
    map.current?.focus(stamp.latitude, stamp.longitude, FOCUS_ZOOM);
  };

  const header = (
    <Animated.View entering={fadeIn(200)} style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
      <CloseButton accessibilityLabel="Close map" />
      <View style={[styles.titleChip, { backgroundColor: theme.background + 'E6', borderColor: theme.border }]}>
        <ThemedText style={[Type.rail, { color: theme.text }]}>MAP</ThemedText>
        {stamps.length > 0 && (
          <ThemedText style={[styles.count, { color: theme.textMuted }]}>
            {placeCount(stamps)} {placeCount(stamps) === 1 ? 'place' : 'places'}
          </ThemedText>
        )}
      </View>
      <View style={styles.topSpacer} />
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StampMapView
        ref={map}
        stamps={stamps}
        camera={initialCamera ? { latitude: initialCamera.coordinates.latitude, longitude: initialCamera.coordinates.longitude, zoom: initialCamera.zoom } : undefined}
        onPinPress={(id) => {
          const stamp = stamps.find((s) => s.id === id);
          if (stamp) focus(stamp);
        }}
        onMapPress={() => setSelectedId(null)}
      />

      {header}

      {loaded && stamps.length === 0 && (
        <Animated.View entering={fadeIn(300, 120)} style={styles.centre} pointerEvents="box-none">
          <View style={[styles.emptyCard, { backgroundColor: theme.background + 'F0', borderColor: theme.border }]}>
            <ThemedText style={[styles.note, { color: theme.text }]}>no places yet</ThemedText>
            <Pressable onPress={() => navigate.replace('/stamps')} accessibilityRole="button" style={[styles.cta, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.ctaText, { color: theme.background }]}>STAMP A PLACE</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {stamps.length > 0 && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
          {selected && <HoverStamp key={selected.id} stamp={selected} serial={serials.get(selected.id)} />}
          <Animated.View entering={riseIn(340, 160, 14)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {stamps.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => focus(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.place} on the map`}
                  accessibilityState={{ selected: s.id === selectedId }}
                  style={({ pressed }) => ({ transform: [{ translateY: s.id === selectedId ? -8 : 0 }, { scale: pressed ? 0.94 : 1 }] })}
                >
                  <StampView imageUri={s.imageUri} place={s.place} createdAt={s.createdAt} width={STRIP_STAMP} postmark={false} />
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

/** The selected stamp, floating over the map with a slow bob and sway. */
function HoverStamp({ stamp, serial }: { stamp: Stamp; serial?: number }) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    // Up-down and the slight turn run on different clocks, so it never loops visibly.
    bob.set(withRepeat(withSequence(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })), -1));
  }, [bob, reduced]);
  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.get() * 6 }, { rotate: `${-3 + bob.get() * 2.5}deg` }],
  }));
  return (
    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={[styles.hover, { height: HOVER_STAMP * STAMP_ASPECT + 16 }]} pointerEvents="none">
      <Animated.View style={float}>
        <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={HOVER_STAMP} serial={serial} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  titleChip: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, marginHorizontal: 'auto' },
  topSpacer: { width: 34 },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.8 },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  note: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, textAlign: 'center' },
  emptyCard: { alignItems: 'center', gap: 16, padding: 24, borderRadius: 20, borderWidth: 1 },
  cta: { height: 40, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  hover: { alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 },
  strip: { paddingHorizontal: 16, paddingTop: 12, gap: 12, alignItems: 'flex-end' },
});
