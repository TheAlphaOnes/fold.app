/**
 * StampAlbumCard — the profile's stamps as a collector's album.
 *
 *   ▢ STAMP ALBUM                              PAGE 01 / 03  ›
 *   ┌────┐ ┌────┐ ┌────┐ ┌────┐
 *   │ ▓▓ │ │ ▓▓ │ │ ▓▓ │ │ ▓▓ │   each stamp in a glassine pocket (a clear
 *   │░░░░│ │░░░░│ │░░░░│ │░░░░│   sleeve over its lower half), a little
 *   └────┘ └────┘ └────┘ └────┘   crooked, as if mounted by hand
 *    PUNE   GOA   …               a typed label under each pocket
 *
 * Swipe sideways to turn pages (8 stamps to a page); the last page ends
 * with an empty "next" pocket. On arrival each stamp slides down into its
 * pocket, one after another. Tapping one lifts it out, then shows it on the
 * map. The header opens the full collection.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChevronRight, Plus, Stamp as StampIcon } from 'lucide-react-native';

import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const COLS = 4;
const ROWS = 2;
const PER_PAGE = COLS * ROWS;
const GAP = 12;
const SIDE = 16;
const LABEL_H = 18;
/** Mounted by hand: each pocket's own small tilt, the same every time. */
const TILTS = [-2, 1.5, -1, 2.5, 1, -2.5, 2, -1.5];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function StampAlbumCard() {
  const theme = useTheme();
  const { width: screen } = useWindowDimensions();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const pageW = screen - 32 - 2; // the card's inner width
  const cell = (pageW - SIDE * 2 - GAP * (COLS - 1)) / COLS;
  const stampW = cell - 12;
  const pocketH = stampW * STAMP_ASPECT + 12;

  // Pages of 8, plus a "next" pocket after the last stamp.
  const slots: (Stamp | 'next')[] = [...stamps, 'next'];
  const pages: (Stamp | 'next')[][] = [];
  for (let i = 0; i < slots.length; i += PER_PAGE) pages.push(slots.slice(i, i + PER_PAGE));
  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / pageW);
    if (p !== page) {
      haptic.select();
      setPage(p);
    }
  };

  const open = () => {
    haptic.tap();
    navigate.push(stamps.length > 0 ? '/stamps?view=collection' : '/stamps');
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable onPress={open} style={({ pressed }) => [styles.header, pressed && styles.headerPressed]} accessibilityRole="button" accessibilityLabel="Stamp album">
        <View style={styles.headerLead}>
          <StampIcon size={14} color={theme.textMuted} />
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STAMP ALBUM</ThemedText>
        </View>
        <View style={styles.headerLead}>
          {pages.length > 1 && (
            <ThemedText style={[styles.pageNo, { color: theme.textMuted }]}>
              PAGE {String(page + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}
            </ThemedText>
          )}
          <ChevronRight size={16} color={theme.textMuted} />
        </View>
      </Pressable>

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
        {pages.map((items, p) => (
          <View key={p} style={[styles.page, { width: pageW }]}>
            {items.map((item, i) => (
              <View key={item === 'next' ? 'next' : item.id} style={{ width: cell }}>
                {item === 'next' ? (
                  <NextPocket width={cell} height={pocketH} />
                ) : (
                  <Pocket stamp={item} width={cell} stampW={stampW} height={pocketH} tilt={TILTS[(p * PER_PAGE + i) % TILTS.length]} arrival={p === 0 ? i : 0} />
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Page dots, when there's more than one page. */}
      {pages.length > 1 && (
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === page ? theme.text : theme.border, width: i === page ? 14 : 5 }]} />
          ))}
        </View>
      )}
    </View>
  );
}

/** One stamp in its glassine pocket, with a typed label underneath. */
function Pocket({ stamp, width, stampW, height, tilt, arrival }: { stamp: Stamp; width: number; stampW: number; height: number; tilt: number; arrival: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const slide = useSharedValue(reduced ? 1 : 0);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (!reduced) slide.set(withDelay(120 + arrival * 70, withSpring(1, { damping: 13, stiffness: 160 })));
  }, [slide, arrival, reduced]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, slide.get() * 2),
    transform: [{ translateY: -(1 - slide.get()) * 34 - lift.get() * 16 }, { rotate: `${tilt}deg` }, { scale: 1 + lift.get() * 0.12 }],
  }));

  const press = () => {
    haptic.tap();
    // Lifted out of its pocket, then off to the map.
    lift.set(withSequence(withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }), withDelay(120, withTiming(0, { duration: 1 }))));
    setTimeout(() => navigate.push(`/stamps/map?id=${stamp.id}`), 260);
  };

  const d = new Date(stamp.createdAt);
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`Stamp from ${stamp.place}, on the map`}>
      <View style={[styles.pocket, { width, height, backgroundColor: '#00000033', borderColor: '#FFFFFF14' }]}>
        <Animated.View style={stampStyle}>
          <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={stampW} postmark={false} />
        </Animated.View>
        {/* The glassine sleeve: a clear strip over the lower half, with a soft sheen. */}
        <Svg width={width} height={height * 0.46} style={styles.sleeve} pointerEvents="none">
          <Defs>
            <LinearGradient id={`sheen-${stamp.id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.05} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.11} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height * 0.46} fill={`url(#sheen-${stamp.id})`} />
          <Rect width={width} height={1} fill="#FFFFFF" fillOpacity={0.28} />
        </Svg>
      </View>
      {/* The typed label: the place (shrinks to fit, never cut off), then the month. */}
      <ThemedText style={[styles.label, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {stamp.place.toUpperCase()}
      </ThemedText>
      <ThemedText style={[styles.labelDate, { color: theme.textMuted }]}>
        {MONTHS[d.getMonth()]} '{String(d.getFullYear()).slice(2)}
      </ThemedText>
    </Pressable>
  );
}

/** The empty pocket after the last stamp: where the next one goes. */
function NextPocket({ width, height }: { width: number; height: number }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        navigate.push('/stamps');
      }}
      accessibilityRole="button"
      accessibilityLabel="Make a stamp"
    >
      <View style={[styles.pocket, styles.nextPocket, { width, height, borderColor: theme.border }]}>
        <Plus size={18} color={theme.textMuted} />
      </View>
      <ThemedText style={[styles.label, { color: theme.textMuted }]}>NEXT</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageNo: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1.5 },
  page: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', paddingHorizontal: SIDE, paddingBottom: 14, columnGap: GAP, rowGap: 14 },
  pocket: { borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sleeve: { position: 'absolute', left: 0, bottom: 0 },
  nextPocket: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  label: { height: LABEL_H - 4, marginTop: 6, fontFamily: 'JetBrainsMono-Bold', fontSize: 8, lineHeight: 12, letterSpacing: 0.8, textAlign: 'center' },
  labelDate: { fontFamily: 'JetBrainsMono-Medium', fontSize: 7, lineHeight: 10, letterSpacing: 1, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 14 },
  dot: { height: 5, borderRadius: 2.5 },
});
