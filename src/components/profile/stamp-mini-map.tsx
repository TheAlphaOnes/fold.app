/**
 * StampMiniMap — where your stamps are, drawn small: each place a dot on a
 * faint graticule, joined in the order you went, the newest pulsing once
 * as the card arrives. No tiles or native map (the profile stays light);
 * tap it for the real map.
 *
 * Places are projected into the box by their own bounds (with a margin),
 * so a city's worth of stamps fills it as well as a world's.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Map as MapIcon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StampMiniMapProps {
  stamps: Stamp[];
  width: number;
  height: number;
}

/** Points for each distinct place, oldest first, fitted into the box. */
function project(stamps: Stamp[], w: number, h: number) {
  const seen = new Map<string, Stamp>();
  for (const s of [...stamps].sort((a, b) => a.createdAt - b.createdAt)) {
    const key = `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  const pts = [...seen.values()];
  if (pts.length === 0) return [];
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.05);
  const pad = 0.18;
  const scale = Math.min(w, h) * (1 - pad * 2) / span;
  const cx = (minLng + maxLng) / 2;
  const cy = (minLat + maxLat) / 2;
  return pts.map((p) => ({ x: w / 2 + (p.longitude - cx) * scale, y: h / 2 - (p.latitude - cy) * scale }));
}

export function StampMiniMap({ stamps, width, height }: StampMiniMapProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const points = useMemo(() => project(stamps, width, height), [stamps, width, height]);
  const route = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const length = points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y)), 0);

  // The route draws itself in once, then rests.
  const drawn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) drawn.set(withDelay(500, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [drawn, reduced]);
  const routeProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.get()) }));

  const grid = [0.25, 0.5, 0.75];
  const ink = theme.accentWarm;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        navigate.push('/stamps/map');
      }}
      accessibilityRole="button"
      accessibilityLabel="Open the map of your stamps"
      style={({ pressed }) => [styles.box, { width, height, borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.8 : 1 }]}
    >
      <Svg width={width} height={height}>
        {grid.map((g) => (
          <Line key={`v${g}`} x1={width * g} y1={0} x2={width * g} y2={height} stroke={theme.border} strokeWidth={1} strokeDasharray="2 4" />
        ))}
        {grid.map((g) => (
          <Line key={`h${g}`} x1={0} y1={height * g} x2={width} y2={height * g} stroke={theme.border} strokeWidth={1} strokeDasharray="2 4" />
        ))}
        {points.length > 1 && (
          <AnimatedPath d={route} stroke={ink} strokeOpacity={0.55} strokeWidth={1.5} fill="none" strokeDasharray={`${length} ${length}`} animatedProps={routeProps} />
        )}
        {points.map((p, i) => {
          const newest = i === points.length - 1;
          return (
            <React.Fragment key={i}>
              {newest && <Circle cx={p.x} cy={p.y} r={9} fill={ink} fillOpacity={0.18} />}
              <Circle cx={p.x} cy={p.y} r={newest ? 4.5 : 3} fill={newest ? ink : theme.text} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[styles.tag, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <MapIcon size={11} color={theme.textMuted} />
        <ThemedText style={[styles.tagText, { color: theme.textMuted }]}>MAP</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tag: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, paddingHorizontal: 8, borderRadius: 11, borderWidth: 1 },
  tagText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 9, letterSpacing: 1.5 },
});
