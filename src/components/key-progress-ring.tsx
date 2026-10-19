/**
 * KeyProgressRing — the daily goal, drawn as a segmented ring around the
 * orange key. Each memory today draws on one segment.
 *
 * A fill is three motions finishing at different rates: the stroke draws on,
 * a soft bloom swells after it and fades, and the readout digits roll. Fills
 * only play while the home screen is in view, so a memory saved from compose
 * lands when you return rather than behind the sheet.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { EASE_IN, EASE_OUT } from '@/constants/motion';
import { splitPerimeter, type PerimeterSegment, type RoundedRect } from '@/utils/perimeter-path';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Space between the key's edge and the ring. */
const OFFSET = 5;
const STROKE = 2;
const SEGMENT_GAP = 7;
/** Extra room so the bloom stroke is not clipped by the canvas. */
const BLEED = 4;

const DRAW_MS = 520;
const DRAW_DELAY_MS = 140;
const STAGGER_MS = 90;

interface KeyProgressRingProps {
  /** Size of the key the ring wraps. */
  keyWidth: number;
  keyHeight: number;
  keyRadius: number;
  count: number;
  goal: number;
}

function RingSegment({
  segment,
  filled,
  delay,
  color,
  trackColor,
  reduceMotion,
}: {
  segment: PerimeterSegment;
  filled: boolean;
  delay: number;
  color: string;
  trackColor: string;
  reduceMotion: boolean;
}) {
  const fill = useSharedValue(0);
  const bloom = useSharedValue(0);
  // The stagger only matters at the moment a segment fills; a later delay
  // change (the parent catching up) must not replay the fill.
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => {
    const delay = delayRef.current;
    if (!filled) {
      fill.value = withTiming(0, { duration: 140, easing: EASE_IN });
      return;
    }
    if (reduceMotion) {
      fill.value = 1;
      return;
    }
    fill.value = withDelay(delay, withTiming(1, { duration: DRAW_MS, easing: EASE_OUT }));
    // The bloom starts as the stroke nears its end and outlasts it.
    bloom.value = withDelay(
      delay + DRAW_MS * 0.6,
      withSequence(
        withTiming(1, { duration: 160, easing: EASE_OUT }),
        withTiming(0, { duration: 420, easing: EASE_IN }),
      ),
    );
  }, [filled, reduceMotion, fill, bloom]);

  const drawProps = useAnimatedProps(() => ({
    strokeDashoffset: segment.length * (1 - fill.value),
  }));
  const bloomProps = useAnimatedProps(() => ({
    strokeOpacity: bloom.value * 0.32,
  }));

  const dash = `${segment.length} ${segment.length}`;
  return (
    <>
      <Path d={segment.d} stroke={trackColor} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      <AnimatedPath
        d={segment.d}
        stroke={color}
        strokeWidth={STROKE + 5}
        strokeLinecap="round"
        fill="none"
        strokeOpacity={0}
        animatedProps={bloomProps}
      />
      <AnimatedPath
        d={segment.d}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={dash}
        animatedProps={drawProps}
      />
    </>
  );
}

export function KeyProgressRing({ keyWidth, keyHeight, keyRadius, count, goal }: KeyProgressRingProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const focused = useIsFocused();

  // What the ring last showed; it only advances while the screen is in view.
  const shownRef = useRef(0);
  const shown = focused ? count : shownRef.current;
  const previous = shownRef.current;
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  const width = keyWidth + OFFSET * 2;
  const height = keyHeight + OFFSET * 2;
  const segments = useMemo(() => {
    const rect: RoundedRect = { x: BLEED, y: BLEED, width, height, radius: keyRadius + OFFSET };
    return splitPerimeter(rect, goal, SEGMENT_GAP);
  }, [width, height, keyRadius, goal]);

  const complete = shown >= goal;
  const color = theme.accentWarm;
  // Capped at the goal: past it, the closed ring is the message.
  const readout = `${String(Math.min(shown, goal)).padStart(2, '0')}/${String(goal).padStart(2, '0')}`;

  return (
    <View pointerEvents="none" style={[styles.frame, { width: width + BLEED * 2, height: height + BLEED * 2 }]}>
      <Svg width={width + BLEED * 2} height={height + BLEED * 2}>
        {segments.map((segment, i) => (
          <RingSegment
            key={`${goal}-${i}`}
            segment={segment}
            filled={i < shown}
            delay={DRAW_DELAY_MS + Math.max(0, i - previous) * STAGGER_MS}
            color={color}
            trackColor={theme.border}
            reduceMotion={reduceMotion}
          />
        ))}
      </Svg>
      <View style={[styles.readout, { left: width + BLEED * 2 + 6 }]}>
        <Animated.Text
          key={readout}
          entering={reduceMotion ? undefined : FadeInDown.delay(DRAW_DELAY_MS + 120).duration(260).easing(EASE_OUT)}
          exiting={reduceMotion ? undefined : FadeOutUp.duration(140).easing(EASE_IN)}
          style={[styles.readoutText, { color: complete ? color : theme.textMuted }]}
          allowFontScaling={false}
        >
          {readout}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    left: -(OFFSET + BLEED),
    top: -(OFFSET + BLEED),
  },
  readout: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  readoutText: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 13,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
});
