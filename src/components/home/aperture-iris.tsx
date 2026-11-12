/**
 * ApertureIris — the today card's lens. Six blades meet over the card,
 * leaving a small hexagonal pupil, while the camera sleeps; when the
 * picture is ready they slide out of the frame like an iris opening.
 *
 * Driven by one shared value (0 closed → 1 open) owned by the card. Each
 * blade reads its own slice of that value, so they leave one after another
 * and at different speeds (the first is quick, the last lingers) instead of
 * moving as one sheet.
 *
 * Each blade is a single SVG path in its own full-card view, moved only by
 * transforms on the UI thread: no re-render while the iris moves.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, Extrapolation, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const BLADES = 6;
const SECTOR = (Math.PI * 2) / BLADES;
/** Each blade reaches a little past its neighbours so no seam opens while closed. */
const OVERLAP = 0.05;
/** How far each blade turns as it leaves, for the twist of a real iris. */
const TWIST_DEG = 24;

interface ApertureIrisProps {
  width: number;
  height: number;
  /** 0 closed, 1 fully open. */
  open: SharedValue<number>;
  /** Radius of the hexagonal pupil left while closed. */
  pupil?: number;
}

/** One blade: the sector around `angle`, from the pupil's edge out past the card. */
function bladePath(cx: number, cy: number, angle: number, pupil: number, reach: number): string {
  const a0 = angle - SECTOR / 2 - OVERLAP;
  const a1 = angle + SECTOR / 2 + OVERLAP;
  // The inner edge is a straight chord at `pupil` from the centre: six of them make the hexagon.
  const inner = pupil / Math.cos(SECTOR / 2 + OVERLAP);
  const point = (a: number, r: number) => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  return `M${point(a0, inner)} L${point(a0, reach)} L${point(a1, reach)} L${point(a1, inner)} Z`;
}

const Blade = memo(function Blade({ index, width, height, open, pupil }: ApertureIrisProps & { index: number }) {
  const theme = useTheme();
  const angle = -Math.PI / 2 + index * SECTOR;
  const reach = Math.hypot(width, height);
  const d = bladePath(width / 2, height / 2, angle, pupil ?? 30, reach);
  // Staggered windows of the shared progress: later blades start later and take longer.
  const start = index * 0.07;
  const end = 0.55 + index * 0.075;
  const travel = reach * 0.62;

  const style = useAnimatedStyle(() => {
    const t = interpolate(open.value, [start, end], [0, 1], Extrapolation.CLAMP);
    // Ease out by hand: fast away from the centre, settling at the edge.
    const e = 1 - (1 - t) * (1 - t) * (1 - t);
    return {
      opacity: 1 - interpolate(t, [0.7, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: Math.cos(angle) * travel * e },
        { translateY: Math.sin(angle) * travel * e },
        { rotate: `${e * TWIST_DEG}deg` },
      ],
    };
  });

  // Alternate two close tones so the blades read as overlapping leaves.
  const fill = index % 2 === 0 ? theme.backgroundElement : theme.backgroundSelected;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        <Path d={d} fill={fill} stroke={theme.border} strokeWidth={1} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
});

export function ApertureIris(props: ApertureIrisProps) {
  return (
    <>
      {Array.from({ length: BLADES }, (_, i) => (
        <Blade key={i} index={i} {...props} />
      ))}
    </>
  );
}
