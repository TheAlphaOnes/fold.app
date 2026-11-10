/**
 * StampAlbumCard — the profile's stamp collection, as a pile on a desk.
 *
 *   ▢ STAMP ALBUM                                  ›
 *     ╱▔▔╲ ╱▔▔╲                    07
 *    ▕ ⌂  ▕ ⌂ ◎  postmark          stamps
 *     ╲▁▁╱ ╲▁▁╱                    3 places · last PUNE
 *
 * On first sight the latest stamps drop onto the pile one after another,
 * each landing with a spring at its own tilt, then a postmark slams down
 * across them. Tap the pile and the top stamp flicks to the bottom (a
 * shuffle through the stack). The header opens the whole collection.
 * Nothing loops: it moves on arrival and when touched, then rests.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight, Stamp as StampIcon } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { Postmark, StampView, STAMP_ASPECT, stampPerforation } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { placeCount } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const STAMP = 88;
const PILE_MAX = 6;
/** Where each depth of the pile sits: a little across and down, each at its own tilt. */
const SLOTS = [
  { x: 0, y: 6, r: -5 },
  { x: 26, y: 0, r: 7 },
  { x: 48, y: 10, r: -9 },
  { x: 14, y: 18, r: 11 },
  { x: 60, y: 22, r: -3 },
  { x: 36, y: 26, r: 4 },
];
const PILE_W = 60 + STAMP + 12;
const PILE_H = 26 + STAMP * STAMP_ASPECT + 8;

export function StampAlbumCard() {
  const theme = useTheme();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  // The pile's order, top first; a tap sends the top stamp to the bottom.
  const latest = useMemo(() => stamps.slice(0, PILE_MAX), [stamps]);
  // How many times the pile has been shuffled; the order is the latest stamps rotated by it.
  const [shift, setShift] = useState(0);
  const order = useMemo(() => {
    const ids = latest.map((s) => s.id);
    const k = ids.length ? shift % ids.length : 0;
    return [...ids.slice(k), ...ids.slice(0, k)];
  }, [latest, shift]);
  const shuffle = () => {
    if (order.length < 2) return;
    haptic.select();
    setShift((n) => n + 1);
  };

  const open = () => {
    haptic.tap();
    navigate.push(stamps.length > 0 ? '/stamps?view=collection' : '/stamps');
  };
  const places = placeCount(stamps);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable onPress={open} style={({ pressed }) => [styles.header, pressed && styles.headerPressed]} accessibilityRole="button" accessibilityLabel="Stamp album">
        <View style={styles.headerLead}>
          <StampIcon size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STAMP ALBUM</ThemedText>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      {loaded && stamps.length === 0 ? (
        <EmptyAlbum onStart={open} />
      ) : (
        <View style={styles.body}>
          <Pressable onPress={shuffle} accessibilityRole="button" accessibilityLabel="Shuffle the pile" accessibilityHint="Sends the top stamp to the bottom">
            <View style={{ width: PILE_W, height: PILE_H }}>
              {/* Drawn bottom first, so the top of the order paints last. */}
              {[...latest]
                .sort((a, b) => order.indexOf(b.id) - order.indexOf(a.id))
                .map((stamp, drawIndex) => (
                  <PileStamp key={stamp.id} stamp={stamp} depth={Math.max(0, order.indexOf(stamp.id))} arrival={latest.length - 1 - drawIndex} />
                ))}
              {latest[0] && <SlamMark place={latest[0].place} createdAt={latest[0].createdAt} delay={latest.length * 110 + 260} />}
            </View>
          </Pressable>

          <View style={styles.stats}>
            <ThemedText style={[styles.count, { color: theme.text }]}>{String(stamps.length).padStart(2, '0')}</ThemedText>
            <ThemedText style={[styles.unit, { color: theme.accentWarm }]}>{stamps.length === 1 ? 'stamp' : 'stamps'}</ThemedText>
            <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
              {places} {places === 1 ? 'place' : 'places'}
            </ThemedText>
            {latest[0] && (
              <ThemedText style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
                last · {latest[0].place.toLowerCase()}
              </ThemedText>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/** One stamp in the pile: drops in on arrival, then springs to its depth's slot whenever the order changes. */
function PileStamp({ stamp, depth, arrival }: { stamp: Stamp; depth: number; arrival: number }) {
  const reduced = useReducedMotion();
  const slot = SLOTS[Math.min(depth, SLOTS.length - 1)];
  const x = useSharedValue(slot.x);
  const y = useSharedValue(reduced ? slot.y : slot.y - 150);
  const r = useSharedValue(reduced ? slot.r : slot.r * 3);
  const o = useSharedValue(reduced ? 1 : 0);

  // The drop: from above, a beat after the stamp before it.
  useEffect(() => {
    if (reduced) return;
    const delay = 120 + arrival * 110;
    o.set(withDelay(delay, withTiming(1, { duration: 120 })));
    y.set(withDelay(delay, withSpring(slot.y, { damping: 11, stiffness: 170, mass: 0.8 })));
    r.set(withDelay(delay, withSpring(slot.r, { damping: 9, stiffness: 120 })));
    // Arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A shuffle: every stamp springs to its new depth.
  useEffect(() => {
    x.set(withSpring(slot.x, { damping: 14, stiffness: 160 }));
    y.set(withSpring(slot.y, { damping: 14, stiffness: 160 }));
    r.set(withSpring(slot.r, { damping: 12, stiffness: 140 }));
  }, [slot.x, slot.y, slot.r, x, y, r]);

  const style = useAnimatedStyle(() => ({
    opacity: o.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${r.get()}deg` }],
  }));
  return (
    <Animated.View style={[styles.pileStamp, style]} pointerEvents="none">
      <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={STAMP} postmark={false} />
    </Animated.View>
  );
}

/** The postmark coming down hard across the pile once the stamps have landed. */
function SlamMark({ place, createdAt, delay }: { place: string; createdAt: number; delay: number }) {
  const reduced = useReducedMotion();
  const ink = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    ink.set(withDelay(delay, withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })));
  }, [ink, delay, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: ink.get(),
    transform: [{ scale: 1.9 - ink.get() * 0.9 }, { rotate: '-12deg' }],
  }));
  return (
    <Animated.View style={[styles.slam, style]} pointerEvents="none">
      <Postmark size={86} place={place} createdAt={createdAt} style={{ position: 'relative' }} />
    </Animated.View>
  );
}

/** No stamps yet: blank perforated outlines waiting, and the way to the first. */
function EmptyAlbum({ onStart }: { onStart: () => void }) {
  const theme = useTheme();
  const h = STAMP * STAMP_ASPECT;
  const { r, holes } = stampPerforation(STAMP);
  return (
    <View style={styles.body}>
      <View style={{ width: PILE_W, height: PILE_H }}>
        {SLOTS.slice(0, 3).map((slot, i) => (
          <View key={i} style={[styles.pileStamp, { transform: [{ translateX: slot.x }, { translateY: slot.y }, { rotate: `${slot.r}deg` }] }]}>
            <Svg width={STAMP} height={h}>
              <Path d={stampOutline(STAMP - 2, h - 2, r, holes, { x: 1, y: 1 })} stroke={theme.textMuted} strokeOpacity={0.5 - i * 0.12} strokeWidth={1.25} fill="none" />
            </Svg>
          </View>
        ))}
      </View>
      <View style={styles.stats}>
        <ThemedText style={[styles.meta, { color: theme.text }]}>your album is empty</ThemedText>
        <Pressable onPress={onStart} accessibilityRole="button" style={({ pressed }) => [styles.cta, { backgroundColor: theme.text, opacity: pressed ? 0.75 : 1 }]}>
          <ThemedText style={[styles.ctaText, { color: theme.background }]}>FIRST STAMP</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 26, paddingTop: 16 },
  pileStamp: { position: 'absolute', left: 0, top: 0 },
  slam: { position: 'absolute', right: -8, bottom: -6 },
  stats: { alignItems: 'flex-end', gap: 4, flexShrink: 1, paddingLeft: 12 },
  count: { fontFamily: 'BitcountGridDouble-Light', fontSize: 44, lineHeight: 50 },
  unit: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, letterSpacing: 1, marginTop: -4 },
  meta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.5 },
  cta: { marginTop: 10, height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: 'center' },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2 },
});
