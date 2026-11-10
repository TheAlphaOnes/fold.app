/**
 * StampStudio — the stamps page: making stamps and keeping them, in one place.
 *
 *   ✕                                      🗺
 *        PUNE · INDIA
 *        ┌ ─ ─ ─ ─ ─ ┐
 *        │ viewfinder │       the stamp camera, first: capturing is the
 *        └ ─ ─ ─ ─ ─ ┘        first thing you're here to do
 *            ( ◯ )
 *   ─────────── ▔▔ ───────────
 *    STAMPS · 12 · 5 places      the collection drawer, peeking: the latest
 *     ▱ ▱ ▱ ▱ ▱                  stamps fanned at the bottom edge
 *
 * Drag the drawer up (or tap its handle) and it morphs: the camera sinks
 * back and pauses, the fan gathers away and the full collection rises in
 * its place. Drag down, or pull down past the top of the grid, to go back.
 * A stamp just made drops into the fan. `?view=collection` opens with the
 * drawer up.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Map as MapIcon } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { CloseButton, RoundButton } from '@/components/round-button';
import { StampCamera } from '@/components/stamps/stamp-camera';
import { EmptyCollection, StampTile } from '@/components/stamps/stamp-collection-screen';
import { StampView, STAMP_ASPECT, stampPerforation } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { placeCount } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

/** The drawer's visible height when closed (above the home indicator), and the fan in it. */
const PEEK = 132;
const FAN_STAMP = 84;
const FAN_MAX = 5;
/** Room at the top for the page's close and map buttons. EDGE leaves room for the tiles' tilt. */
const TOP_BAR = 56;
const EDGE = 22;
const COLUMN_GAP = 18;
/** Pulling the grid down this far past its top closes the drawer. */
const PULL_TO_CLOSE = 70;
const SPRING = { damping: 22, stiffness: 210, mass: 0.9 } as const;

export default function StampStudio() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const focused = useIsFocused();
  const { stamps, loaded, load, justAdded, clearJustAdded } = useStamps();
  // ?view=collection opens on the collection instead of the camera.
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [open, setOpen] = useState(view === 'collection');

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  useEffect(() => {
    if (justAdded == null) return;
    const t = setTimeout(clearJustAdded, 1600);
    return () => clearTimeout(t);
  }, [justAdded, clearJustAdded]);

  // The drawer runs from just under the top bar to the bottom of the screen;
  // closed, it's pushed down so only PEEK (plus the home indicator) shows.
  const drawerTop = insets.top + TOP_BAR;
  const drawerHeight = screen.height - drawerTop;
  const closedY = drawerHeight - PEEK - insets.bottom;
  const y = useSharedValue(open ? 0 : closedY);
  // 0 closed … 1 open; everything in the morph reads from this.
  const progress = useDerivedValue(() => interpolate(y.get(), [closedY, 0], [0, 1], Extrapolation.CLAMP));

  const settle = (toOpen: boolean) => {
    'worklet';
    y.set(withSpring(toOpen ? 0 : closedY, SPRING));
    runOnJS(setOpen)(toOpen);
  };
  const toggle = () => {
    haptic.select();
    y.set(withSpring(open ? closedY : 0, SPRING));
    setOpen(!open);
  };

  const start = useSharedValue(0);
  const drag = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onStart(() => start.set(y.get()))
    .onUpdate((e) => {
      // A little give past either end, so the edge feels soft rather than hard.
      const next = start.get() + e.translationY;
      y.set(next < 0 ? next * 0.25 : next > closedY ? closedY + (next - closedY) * 0.25 : next);
    })
    .onEnd((e) => {
      const toOpen = e.velocityY < -400 || (e.velocityY < 400 && y.get() < closedY / 2);
      settle(toOpen);
    });

  // The camera sinks back and dims as the drawer rises.
  const cameraLayer = useAnimatedStyle(() => ({
    opacity: 1 - progress.get() * 0.55,
    borderRadius: progress.get() * 28,
    transform: [{ scale: 1 - progress.get() * 0.07 }],
  }));
  const drawer = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  const places = placeCount(stamps);
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cameraLayer, cameraLayer]}>
        <StampCamera active={focused && !open} topInset={drawerTop} bottomInset={PEEK + insets.bottom} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { top: drawerTop, height: drawerHeight, backgroundColor: theme.background, borderColor: theme.border }, drawer]}>
        <GestureDetector gesture={drag}>
          <View>
            <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={open ? 'Close collection' : 'Open collection'} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
              <View style={styles.titleRow}>
                <ThemedText style={[Type.rail, { color: theme.text }]}>STAMPS</ThemedText>
                {stamps.length > 0 && (
                  <ThemedText style={[styles.count, { color: theme.textMuted }]}>
                    {stamps.length} · {places} {places === 1 ? 'place' : 'places'}
                  </ThemedText>
                )}
              </View>
            </Pressable>
            <Fan stamps={stamps} progress={progress} justAdded={justAdded} width={screen.width} />
          </View>
        </GestureDetector>
        <Collection stamps={stamps} loaded={loaded} progress={progress} open={open} justAdded={justAdded} width={screen.width} bottom={insets.bottom} onPullClose={() => {
            y.set(withSpring(closedY, SPRING));
            setOpen(false);
          }} />
      </Animated.View>

      {/* The page's own buttons ride on top of everything. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <CloseButton accessibilityLabel="Close stamps" />
        <RoundButton icon={MapIcon} accessibilityLabel="Map of your stamps" onPress={() => navigate.push('/stamps/map')} />
      </View>
    </View>
  );
}

interface FanProps {
  stamps: Stamp[];
  progress: SharedValue<number>;
  justAdded: number | null;
  width: number;
}

/** The latest stamps fanned at the drawer's edge (closed); they gather away as it opens. */
function Fan({ stamps, progress, justAdded, width }: FanProps) {
  const theme = useTheme();
  const latest = stamps.slice(0, FAN_MAX).reverse();
  const gathered = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: progress.get() * -24 }, { scale: 1 - progress.get() * 0.12 }],
  }));
  const h = FAN_STAMP * STAMP_ASPECT;

  if (stamps.length === 0) {
    // No stamps yet: blank perforated outlines waiting for the first one.
    const { r, holes } = stampPerforation(FAN_STAMP);
    return (
      <Animated.View style={[styles.fan, { height: h }, gathered]} pointerEvents="none">
        {[-1, 0, 1].map((k) => (
          <View key={k} style={[styles.fanCard, { left: width / 2 - FAN_STAMP / 2 + k * 58, transform: [{ rotate: `${k * 6}deg` }, { translateY: Math.abs(k) * 6 }] }]}>
            <Svg width={FAN_STAMP} height={h}>
              <Path d={stampOutline(FAN_STAMP - 2, h - 2, r, holes, { x: 1, y: 1 })} stroke={theme.textMuted} strokeOpacity={k === 0 ? 0.7 : 0.35} strokeWidth={1.25} fill="none" />
            </Svg>
          </View>
        ))}
        <ThemedText style={[styles.fanHint, { color: theme.textMuted }]}>your stamps land here</ThemedText>
      </Animated.View>
    );
  }

  const mid = (latest.length - 1) / 2;
  return (
    <Animated.View style={[styles.fan, { height: h }, gathered]} pointerEvents="none">
      {latest.map((s, i) => (
        <FanCard key={s.id} stamp={s} offset={i - mid} landing={s.id === justAdded} left={width / 2 - FAN_STAMP / 2} />
      ))}
    </Animated.View>
  );
}

/** One stamp in the fan; the one just made drops in from above and lands with a thud. */
function FanCard({ stamp, offset, landing, left }: { stamp: Stamp; offset: number; landing: boolean; left: number }) {
  const drop = useSharedValue(landing ? 0 : 1);
  useEffect(() => {
    if (!landing) return;
    drop.set(withDelay(80, withTiming(1, { duration: 360, easing: Easing.in(Easing.cubic) })));
    const thud = setTimeout(() => haptic.thud(), 440);
    return () => clearTimeout(thud);
  }, [landing, drop]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.get() * 2),
    transform: [
      { translateX: offset * 52 },
      { translateY: Math.abs(offset) * 7 - (1 - drop.get()) * 160 },
      { rotate: `${offset * 6}deg` },
      { scale: 1.25 - drop.get() * 0.25 },
    ],
  }));
  return (
    <Animated.View style={[styles.fanCard, { left }, style]}>
      <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={FAN_STAMP} postmark={false} />
    </Animated.View>
  );
}

interface CollectionProps {
  stamps: Stamp[];
  loaded: boolean;
  progress: SharedValue<number>;
  open: boolean;
  justAdded: number | null;
  width: number;
  bottom: number;
  onPullClose: () => void;
}

/** The full collection: rises into the drawer as it opens. */
function Collection({ stamps, loaded, progress, open, justAdded, width, bottom, onPullClose }: CollectionProps) {
  const { remove } = useStamps();
  const tile = (width - EDGE * 2 - COLUMN_GAP) / 2;
  const serials = useMemo(() => new Map([...stamps].sort((a, b) => a.createdAt - b.createdAt).map((s, i) => [s.id, i + 1])), [stamps]);
  const risen = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.3, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - progress.get()) * 60 }],
  }));

  const confirmRemove = (stamp: Stamp) => {
    Alert.alert('Remove this stamp?', `${stamp.place} will come off your collection and map.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(stamp.id) },
    ]);
  };

  return (
    <Animated.View style={[styles.collection, risen]} pointerEvents={open ? 'auto' : 'none'}>
      {loaded && stamps.length === 0 ? (
        <EmptyCollection width={tile} />
      ) : (
        <FlatList
          data={stamps}
          keyExtractor={(s) => String(s.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={7}
          onScrollEndDrag={(e) => {
            if (e.nativeEvent.contentOffset.y < -PULL_TO_CLOSE) onPullClose();
          }}
          renderItem={({ item, index }) => (
            <StampTile
              stamp={item}
              width={tile}
              serial={serials.get(item.id)}
              index={index}
              landing={open && item.id === justAdded}
              onOpen={() => navigate.push(`/stamps/map?id=${item.id}`)}
              onRemove={() => confirmRemove(item)}
            />
          )}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cameraLayer: { overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  drawer: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 10, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.8 },
  fan: { marginTop: 6 },
  fanCard: { position: 'absolute', top: 0 },
  fanHint: { position: 'absolute', top: FAN_STAMP * STAMP_ASPECT * 0.5 - 8, left: 0, right: 0, textAlign: 'center', fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },
  collection: { ...StyleSheet.absoluteFill, top: 56 },
  grid: { paddingHorizontal: EDGE, paddingTop: 8, gap: COLUMN_GAP },
  row: { gap: COLUMN_GAP },
});
