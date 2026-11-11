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
 *       ▱ ▱ ▱ ▱ ▱                the collection drawer, peeking: just the
 *                                latest stamps fanned at the bottom edge
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
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
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
import { useBottomInset } from '@/hooks/use-bottom-inset';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { markGuideDone } from '@/services/guide-progress';
import { placeCount } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

/** The drawer's visible height when closed (above the home indicator): the title and just the tops of the fanned stamps. */
const PEEK = 24;
const FAN_STAMP = 66;
const FAN_MAX = 5;
/** The handle's strip at the top of the drawer, and the gap before the fan (the camera aims its landing here). */
const HANDLE_AREA = 17;
const FAN_GAP = 2;
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
  const safeBottom = useBottomInset();
  const screen = useWindowDimensions();
  const focused = useIsFocused();
  const { stamps: all, loaded, load, pending, justAdded, clearJustAdded } = useStamps();
  // A stamp still on show in the camera isn't in the collection yet; it arrives on Done.
  const stamps = useMemo(() => all.filter((s) => s.id !== pending), [all, pending]);
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
  const closedY = drawerHeight - PEEK - safeBottom;
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

  useEffect(() => {
    if (open) markGuideDone('stampdrawer');
  }, [open]);

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

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cameraLayer, cameraLayer]}>
        <StampCamera
          active={focused && !open}
          topInset={drawerTop}
          bottomInset={PEEK + safeBottom}
          landing={{ x: screen.width / 2, y: screen.height - PEEK - safeBottom + HANDLE_AREA + FAN_GAP, width: FAN_STAMP }}
        />
      </Animated.View>

      <Animated.View style={[styles.drawer, { top: drawerTop, height: drawerHeight, backgroundColor: theme.background, borderColor: theme.border }, drawer]}>
        <GestureDetector gesture={drag}>
          <View>
            <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={open ? 'Close collection' : `Open collection, ${stamps.length} stamps`} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
            </Pressable>
            <Fan stamps={stamps} progress={progress} justAdded={justAdded} width={screen.width} />
          </View>
        </GestureDetector>
        <Collection stamps={stamps} loaded={loaded} progress={progress} open={open} justAdded={justAdded} width={screen.width} bottom={safeBottom} onPullClose={() => {
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
  // The newest sits in the middle, on top (where a new stamp lands); older ones
  // alternate outward. Drawn oldest first so the newest ends up above.
  const latest = stamps.slice(0, FAN_MAX).map((s, i) => ({ s, offset: i === 0 ? 0 : (i % 2 === 1 ? -1 : 1) * Math.ceil(i / 2) })).reverse();
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

  return (
    <Animated.View style={[styles.fan, { height: h }, gathered]} pointerEvents="none">
      {latest.map(({ s, offset }) => (
        <FanCard key={s.id} stamp={s} offset={offset} landing={s.id === justAdded} left={width / 2 - FAN_STAMP / 2} />
      ))}
    </Animated.View>
  );
}

/**
 * One stamp in the fan. The one just delivered has flown in from the camera,
 * so it settles where it lands: a small press and a thud. Every card springs
 * to its place in the arc, so the others make room as it arrives.
 */
function FanCard({ stamp, offset, landing, left }: { stamp: Stamp; offset: number; landing: boolean; left: number }) {
  const settle = useSharedValue(landing ? 0 : 1);
  const slot = useSharedValue(offset);
  useEffect(() => {
    slot.set(withSpring(offset, { damping: 16, stiffness: 180 }));
  }, [offset, slot]);
  useEffect(() => {
    if (!landing) return;
    settle.set(withSpring(1, { damping: 9, stiffness: 260 }));
    haptic.thud();
  }, [landing, settle]);
  const style = useAnimatedStyle(() => {
    const o = slot.get();
    return {
      transform: [
        // An arc, like a hand of cards: the middle stamp rises highest, the outer ones dip and turn.
        { translateX: o * 46 },
        { translateY: o * o * 9 },
        { rotate: `${o * 9}deg` },
        // Arrives pressed slightly small and springs to size.
        { scale: 0.88 + settle.get() * 0.12 },
      ],
    };
  });
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
  const theme = useTheme();
  const { remove } = useStamps();
  const places = placeCount(stamps);
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
      {/* The title comes with the collection; closed, the peek is just the handle and the stamps. */}
      <View style={styles.titleRow}>
        <ThemedText style={[Type.rail, { color: theme.text }]}>STAMPS</ThemedText>
        {stamps.length > 0 && (
          <ThemedText style={[styles.count, { color: theme.textMuted }]}>
            {stamps.length} · {places} {places === 1 ? 'place' : 'places'}
          </ThemedText>
        )}
      </View>
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
          // Pulling past the top closes the drawer as soon as it's far enough, not on release.
          scrollEventThrottle={16}
          onScroll={(e) => {
            if (open && e.nativeEvent.contentOffset.y < -PULL_TO_CLOSE) onPullClose();
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
  handleArea: { alignItems: 'center', paddingTop: 7, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.5 },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 10 },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.8 },
  fan: { marginTop: FAN_GAP },
  fanCard: { position: 'absolute', top: 0 },
  fanHint: { position: 'absolute', top: FAN_STAMP * STAMP_ASPECT * 0.5 - 8, left: 0, right: 0, textAlign: 'center', fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },
  collection: { ...StyleSheet.absoluteFill, top: 20 },
  grid: { paddingHorizontal: EDGE, paddingTop: 8, gap: COLUMN_GAP },
  row: { gap: COLUMN_GAP },
});
