/**
 * StampAlbumCard — the profile's stamps, as a strip torn from a sheet.
 *
 *   ▢ STAMP ALBUM                                          ›
 *   ┌╌╌┐┌╌╌┐┌╌╌┐┌╌╌┐┌╌╌┐┌ ─ ┐
 *   │▓▓││▓▓││▓▓││▓▓││▓▓││ + │   stamps edge to edge, newest first, the
 *   └╌╌┘└╌╌┘└╌╌┘└╌╌┘└╌╌┘└ ─ ┘   last slot a blank waiting for the next
 *    ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿     one cancellation run across the strip
 *
 * On arrival the stamps deal in one after another, then the cancellation
 * lines draw across them all, as if the strip went through the franking
 * machine in one pass. Tap a stamp: it shows on the map. Tap the blank: the
 * stamp camera. Nothing loops.
 */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight, Plus, Stamp as StampIcon } from 'lucide-react-native';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { StampView, STAMP_ASPECT, stampPerforation } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { riseIn } from '@/constants/motion';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { postmarkInk } from '@/stamps/geometry';
import { navigate } from '@/utils/navigation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STAMP = 92;
const STAMP_H = STAMP * STAMP_ASPECT;
/** Stamps overlap a hair so their perforations meet like a real sheet. */
const OVERLAP = 2;
const STEP = STAMP - OVERLAP;
const SHOWN = 10;
const PAD = 16;
const STRIP_H = STAMP_H + 26;

export function StampAlbumCard() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { stamps, loaded, load } = useStamps();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const shown = stamps.slice(0, SHOWN);
  const slots = shown.length + 1; // + the blank
  const stripW = PAD * 2 + slots * STEP + OVERLAP;
  const ink = postmarkInk(shown[0]?.place ?? 'fold');

  // The cancellation: four wavy lines across the stamps, drawn in one pass.
  const runW = shown.length * STEP;
  const wave = (y: number) => {
    let d = `M ${PAD} ${y}`;
    for (let x = PAD; x < PAD + runW - 4; x += 28) d += ' q 7 -6 14 0 t 14 0';
    return d;
  };
  const length = runW * 1.3;
  const drawn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced || shown.length === 0) return;
    drawn.set(withDelay(240 + Math.min(shown.length, 6) * 90, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })));
  }, [drawn, reduced, shown.length]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.get()) }));

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
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: stripW, height: STRIP_H }}>
        {shown.map((stamp, i) => (
          <Animated.View key={stamp.id} entering={reduced ? undefined : riseIn(360, 80 + Math.min(i, 6) * 90, 14)} style={[styles.slot, { left: PAD + i * STEP }]}>
            <Pressable
              onPress={() => {
                haptic.tap();
                navigate.push(`/stamps/map?id=${stamp.id}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Stamp from ${stamp.place}, on the map`}
              style={({ pressed }) => ({ transform: [{ translateY: pressed ? -4 : 0 }] })}
            >
              <StampView imageUri={stamp.imageUri} place={stamp.place} createdAt={stamp.createdAt} width={STAMP} postmark={false} />
            </Pressable>
          </Animated.View>
        ))}

        {/* The next one, not yet made. */}
        <Pressable
          onPress={() => {
            haptic.tap();
            navigate.push('/stamps');
          }}
          accessibilityRole="button"
          accessibilityLabel="Make a stamp"
          style={({ pressed }) => [styles.slot, { left: PAD + shown.length * STEP, opacity: pressed ? 0.6 : 1 }]}
        >
          <BlankStamp color={theme.textMuted} />
        </Pressable>

        {/* The cancellation, over every stamp in one pass. */}
        {shown.length > 0 && (
          <Svg width={stripW} height={STRIP_H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {[0.5, 0.58, 0.66, 0.74].map((t) => (
              <AnimatedPath
                key={t}
                d={wave(8 + STAMP_H * t)}
                stroke={ink}
                strokeOpacity={0.6}
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${length} ${length}`}
                animatedProps={lineProps}
              />
            ))}
          </Svg>
        )}
      </ScrollView>
    </View>
  );
}

/** A dashed, perforated outline with a plus: the slot for the next stamp. */
function BlankStamp({ color }: { color: string }) {
  const { r, holes } = stampPerforation(STAMP);
  return (
    <View style={styles.blank}>
      <Svg width={STAMP} height={STAMP_H} style={StyleSheet.absoluteFill}>
        <Path d={stampOutline(STAMP - 2, STAMP_H - 2, r, holes, { x: 1, y: 1 })} stroke={color} strokeOpacity={0.5} strokeWidth={1.25} strokeDasharray="3 3" fill="none" />
      </Svg>
      <Plus size={20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slot: { position: 'absolute', top: 4 },
  blank: { width: STAMP, height: STAMP_H, alignItems: 'center', justifyContent: 'center' },
});
