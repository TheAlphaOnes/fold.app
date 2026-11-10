/**
 * Four takes on the profile's Stamp Album card, to compare side by side
 * (dev page: /dev/stamp-albums). The profile shows whichever ALBUM_STYLE
 * names; the rest go once one is picked.
 *
 *   passport  stamps scattered at angles on a visa page, inked over
 *   hero      the latest stamp large, older ones fanned behind; tap to flip
 *   grid      a collector's album page: stamps in mounts, empty ones waiting
 *   envelope  a kraft envelope, newest stamp in the corner, others peeking out
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { ChevronRight, Plus, Stamp as StampIcon } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { Postmark, StampView, STAMP_ASPECT, stampPerforation } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

export type AlbumStyle = 'passport' | 'hero' | 'grid' | 'envelope';

/** The card's inner width: the profile's content width minus the card border. */
function useInner() {
  const { width } = useWindowDimensions();
  return width - 32 - 2;
}

function useAlbumStamps() {
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  return stamps;
}

function openCollection(has: boolean) {
  haptic.tap();
  navigate.push(has ? '/stamps?view=collection' : '/stamps');
}

function Header({ has }: { has: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => openCollection(has)} style={({ pressed }) => [styles.header, pressed && styles.headerPressed]} accessibilityRole="button" accessibilityLabel="Stamp album">
      <View style={styles.headerLead}>
        <StampIcon size={14} color={theme.textMuted} />
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STAMP ALBUM</ThemedText>
      </View>
      <ChevronRight size={16} color={theme.textMuted} />
    </Pressable>
  );
}

/** A stamp that drops into place with a spring when the card appears. */
function Dropped({ children, x, y, rotate, delay, z = 0 }: { children: React.ReactNode; x: number; y: number; rotate: number; delay: number; z?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withSpring(1, { damping: 12, stiffness: 150 })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 2),
    transform: [{ translateX: x }, { translateY: y - (1 - t.get()) * 40 }, { rotate: `${rotate + (1 - t.get()) * rotate * 2}deg` }, { scale: 1.15 - t.get() * 0.15 }],
  }));
  return <Animated.View style={[styles.abs, { zIndex: z }, style]}>{children}</Animated.View>;
}

const openStamp = (s: Stamp) => () => {
  haptic.tap();
  navigate.push(`/stamps/map?id=${s.id}`);
};

// ─── 1. Passport page ────────────────────────────────────────────────────

/** Fixed, hand-placed spots (fractions of the page) and tilts, so it looks arranged, not random. */
const PASSPORT_SPOTS = [
  { x: 0.04, y: 0.08, r: -8 },
  { x: 0.36, y: 0.02, r: 6 },
  { x: 0.68, y: 0.12, r: -4 },
  { x: 0.16, y: 0.5, r: 10 },
  { x: 0.5, y: 0.46, r: -11 },
  { x: 0.76, y: 0.55, r: 5 },
];

export function PassportAlbum() {
  const theme = useTheme();
  const stamps = useAlbumStamps();
  const inner = useInner();
  const pageH = 250;
  const S = 74;
  const shown = stamps.slice(0, PASSPORT_SPOTS.length);
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Header has={stamps.length > 0} />
      <View style={{ height: pageH, marginHorizontal: 12, marginBottom: 14, borderRadius: 6, backgroundColor: '#E9E2D0', overflow: 'hidden' }}>
        {/* The page: faint guilloche lines and a watermark word, like a visa page. */}
        <Svg width={inner - 24} height={pageH} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 14 }, (_, i) => (
            <Path key={i} d={`M 0 ${18 + i * 17} q ${(inner - 24) / 4} -10 ${(inner - 24) / 2} 0 t ${(inner - 24) / 2} 0`} stroke="#B8AD92" strokeOpacity={0.35} strokeWidth={0.8} fill="none" />
          ))}
        </Svg>
        <ThemedText style={styles.watermark}>VISAS</ThemedText>
        {shown.map((s, i) => {
          const spot = PASSPORT_SPOTS[i];
          return (
            <Dropped key={s.id} x={spot.x * (inner - 24 - S)} y={spot.y * (pageH - S * STAMP_ASPECT) + 8} rotate={spot.r} delay={100 + i * 110} z={i}>
              <Pressable onPress={openStamp(s)}>
                <StampView imageUri={s.imageUri} place={s.place} createdAt={s.createdAt} width={S} postmark={i % 2 === 0} />
              </Pressable>
            </Dropped>
          );
        })}
        {shown.length === 0 && <EmptyNote />}
      </View>
    </View>
  );
}

// ─── 2. One hero stamp ───────────────────────────────────────────────────

export function HeroAlbum() {
  const theme = useTheme();
  const stamps = useAlbumStamps();
  const [top, setTop] = useState(0);
  const deck = useMemo(() => {
    const list = stamps.slice(0, 5);
    return list.length ? [...list.slice(top % list.length), ...list.slice(0, top % list.length)] : [];
  }, [stamps, top]);
  const BIG = 150;
  const H = BIG * STAMP_ASPECT;
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Header has={stamps.length > 0} />
      <Pressable
        onPress={() => {
          if (deck.length < 2) return;
          haptic.select();
          setTop((t) => t + 1);
        }}
        style={[styles.heroStage, { height: H + 50 }]}
        accessibilityRole="button"
        accessibilityLabel="Flip to the next stamp"
      >
        {/* Back cards fanned left and right, then the top one, drawn last. */}
        {deck
          .slice(0, 3)
          .reverse()
          .map((s, i, arr) => {
            const depth = arr.length - 1 - i;
            const side = depth === 0 ? 0 : depth === 1 ? -1 : 1;
            return (
              <HeroCard key={s.id} stamp={s} width={BIG} offset={side * 58} rotate={side * 10 - (depth === 0 ? 3 : 0)} depth={depth} />
            );
          })}
        {deck.length === 0 && <EmptyNote />}
      </Pressable>
      {deck[0] && (
        <ThemedText style={[styles.heroCaption, { color: theme.textMuted }]}>
          {deck[0].place.toUpperCase()} · tap to flip
        </ThemedText>
      )}
    </View>
  );
}

function HeroCard({ stamp, width, offset, rotate, depth }: { stamp: Stamp; width: number; offset: number; rotate: number; depth: number }) {
  const x = useSharedValue(offset);
  const r = useSharedValue(rotate);
  useEffect(() => {
    x.set(withSpring(offset, { damping: 14, stiffness: 150 }));
    r.set(withSpring(rotate, { damping: 12, stiffness: 140 }));
  }, [offset, rotate, x, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { rotate: `${r.get()}deg` }, { scale: depth === 0 ? 1 : 0.84 }] }));
  return (
    <Animated.View style={[styles.heroCard, { opacity: depth === 0 ? 1 : 0.75 }, style]} pointerEvents="none">
      <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={width} postmark={depth === 0} />
    </Animated.View>
  );
}

// ─── 3. Album grid ───────────────────────────────────────────────────────

export function GridAlbum() {
  const theme = useTheme();
  const stamps = useAlbumStamps();
  const inner = useInner();
  const COLS = 4;
  const GAP = 12;
  const cell = (inner - 32 - GAP * (COLS - 1)) / COLS;
  const S = cell - 10;
  const slots = 8;
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Header has={stamps.length > 0} />
      <View style={[styles.grid, { gap: GAP }]}>
        {Array.from({ length: slots }, (_, i) => {
          const s = stamps[i];
          return (
            <View key={i} style={[styles.mount, { width: cell, height: S * STAMP_ASPECT + 10, borderColor: s ? '#00000040' : theme.border, backgroundColor: s ? '#0000001F' : 'transparent', borderStyle: s ? 'solid' : 'dashed' }]}>
              {s ? (
                <Dropped x={0} y={0} rotate={0} delay={80 + i * 70}>
                  <Pressable onPress={openStamp(s)}>
                    <StampView imageUri={s.imageUri} place={s.place} createdAt={s.createdAt} width={S} postmark={false} />
                  </Pressable>
                  {/* The hinge: a strip of translucent tape across the top. */}
                  <View style={[styles.hinge, { width: S * 0.5, left: S * 0.25 }]} />
                </Dropped>
              ) : (
                i === stamps.length && (
                  <Pressable onPress={() => openCollection(false)} style={styles.mountEmpty} accessibilityRole="button" accessibilityLabel="Make a stamp">
                    <Plus size={16} color={theme.textMuted} />
                  </Pressable>
                )
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── 4. Envelope ─────────────────────────────────────────────────────────

export function EnvelopeAlbum() {
  const theme = useTheme();
  const stamps = useAlbumStamps();
  const inner = useInner();
  const W = inner - 40;
  const H = 150;
  const S = 70;
  const peek = stamps.slice(1, 4);
  const newest = stamps[0];
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Header has={stamps.length > 0} />
      <Pressable onPress={() => openCollection(stamps.length > 0)} style={{ height: H + 70, marginHorizontal: 20, marginBottom: 18 }} accessibilityRole="button" accessibilityLabel="Open the stamp collection">
        {/* Stamps slipped in behind the front of the envelope, peeking out of the top. */}
        {peek.map((s, i) => (
          <Dropped key={s.id} x={30 + i * 62} y={10 + (i % 2) * 8} rotate={[-9, 4, 11][i]} delay={120 + i * 100}>
            <StampView imageUri={s.imageUri} place={s.place} createdAt={s.createdAt} width={S} postmark={false} />
          </Dropped>
        ))}
        <View style={[styles.envelope, { top: 70, width: W, height: H }]}>
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            <Rect width={W} height={H} fill="#B48A57" rx={6} />
            {/* The folded flaps meeting in the middle. */}
            <Path d={`M 0 ${H} L ${W / 2} ${H * 0.45} L ${W} ${H}`} fill="#A47C4C" />
            <Path d={`M 0 0 L ${W * 0.42} ${H * 0.55} L 0 ${H}`} fill="#BC9462" />
            <Path d={`M ${W} 0 L ${W * 0.58} ${H * 0.55} L ${W} ${H}`} fill="#BC9462" />
            <Line x1={0} y1={0} x2={W} y2={0} stroke="#8E6A3E" strokeWidth={2} />
          </Svg>
          {newest ? (
            <View style={styles.envelopeStamp}>
              <StampView imageUri={newest.imageUri} place={newest.place} createdAt={newest.createdAt} width={58} postmark={false} />
              <View style={styles.envelopeMark}>
                <Postmark size={70} place={newest.place} createdAt={newest.createdAt} style={{ position: 'relative' }} />
              </View>
            </View>
          ) : (
            <BlankSlot size={58} style={styles.envelopeStamp} />
          )}
          <ThemedText style={styles.envelopeCount}>{stamps.length} INSIDE</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

// ─── shared bits ─────────────────────────────────────────────────────────

function BlankSlot({ size, style }: { size: number; style?: object }) {
  const { r, holes } = stampPerforation(size);
  const h = size * STAMP_ASPECT;
  return (
    <View style={[{ width: size, height: h }, style]}>
      <Svg width={size} height={h}>
        <Path d={stampOutline(size - 2, h - 2, r, holes, { x: 1, y: 1 })} stroke="#00000066" strokeWidth={1.2} strokeDasharray="3 3" fill="none" />
      </Svg>
    </View>
  );
}

function EmptyNote() {
  const theme = useTheme();
  return (
    <View style={styles.emptyNote}>
      <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>no stamps yet</ThemedText>
    </View>
  );
}

export const ALBUMS: Record<AlbumStyle, () => React.JSX.Element> = {
  passport: PassportAlbum,
  hero: HeroAlbum,
  grid: GridAlbum,
  envelope: EnvelopeAlbum,
};

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  abs: { position: 'absolute', left: 0, top: 0 },
  watermark: { position: 'absolute', right: 14, bottom: 8, fontFamily: 'JetBrainsMono-Bold', fontSize: 28, letterSpacing: 8, color: '#B8AD9259' },
  heroStage: { alignItems: 'center', justifyContent: 'center' },
  heroCard: { position: 'absolute' },
  heroCaption: { textAlign: 'center', fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 2, paddingBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 18 },
  mount: { borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  mountEmpty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hinge: { position: 'absolute', top: -5, height: 10, backgroundColor: '#FFFFFF59', borderRadius: 1 },
  envelope: { position: 'absolute', left: 0, borderRadius: 6, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  envelopeStamp: { position: 'absolute', right: 14, top: 12 },
  envelopeMark: { position: 'absolute', left: -46, top: 10, transform: [{ rotate: '-14deg' }] },
  envelopeCount: { position: 'absolute', left: 16, bottom: 14, fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 3, color: '#3B2A15' },
  emptyNote: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
});
