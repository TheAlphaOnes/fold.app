/**
 * TodayMomentsRow — morning, afternoon and evening on the Continuum card.
 * A moment fills once anything is captured in it.
 *
 * A fill is two motions finishing at different rates: the ink sweeps across
 * the bar first, then the bar settles down into its slot. The moment that is
 * open right now reads brighter than the rest.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { EASE_IN, EASE_OUT, SPRING_BOUNCE } from '@/constants/motion';
import { MOMENTS, momentAt, type Moment, type MomentsDone } from '@/constants/progression';

/** Lets the card's own entrance land before the bars fill. */
const ENTRANCE_DELAY_MS = 360;
const STAGGER_MS = 80;

interface TodayMomentsRowProps {
  moments: MomentsDone;
  color: string;
  idleColor: string;
  textColor: string;
  mutedColor: string;
  reduceMotion: boolean;
}

function MomentCell({
  moment,
  done,
  isNow,
  delay,
  color,
  idleColor,
  textColor,
  mutedColor,
  reduceMotion,
}: {
  moment: Moment;
  done: boolean;
  isNow: boolean;
  delay: number;
  color: string;
  idleColor: string;
  textColor: string;
  mutedColor: string;
  reduceMotion: boolean;
}) {
  const sweep = useSharedValue(0);
  const settle = useSharedValue(0);
  // The delay applies when the bar fills, not to later re-renders.
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => {
    if (!done) {
      sweep.value = withTiming(0, { duration: 140, easing: EASE_IN });
      settle.value = 0;
      return;
    }
    if (reduceMotion) {
      sweep.value = 1;
      settle.value = 1;
      return;
    }
    const at = delayRef.current;
    sweep.value = withDelay(at, withTiming(1, { duration: 300, easing: EASE_OUT }));
    settle.value = withDelay(at + 60, withTiming(1, { duration: 400, easing: SPRING_BOUNCE }));
  }, [done, reduceMotion, settle, sweep]);

  const inkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: sweep.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: done ? -3 * (1 - settle.value) : 0 }],
  }));

  const labelColor = done ? color : isNow ? textColor : mutedColor;
  const borderColor = isNow && !done ? textColor : idleColor;

  return (
    <View style={s.cell}>
      <Animated.View style={[s.bar, { borderColor }, barStyle]}>
        <Animated.View style={[s.ink, { backgroundColor: color }, inkStyle]} />
      </Animated.View>
      <ThemedText style={[s.label, { color: labelColor }]} numberOfLines={1}>
        {moment.label}
      </ThemedText>
    </View>
  );
}

export function TodayMomentsRow({ moments, color, idleColor, textColor, mutedColor, reduceMotion }: TodayMomentsRowProps) {
  const now = momentAt(new Date());

  // Bars filling on the card's first draw wait for its entrance; one filled
  // while the card is already up (a restore, a day change) fills at once.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);
  const base = mountedRef.current ? 0 : ENTRANCE_DELAY_MS;

  const spoken = MOMENTS.map((m) => {
    if (moments[m.id]) return `${m.label.toLowerCase()} captured`;
    if (m.id === now.id) return `${m.label.toLowerCase()} open now`;
    return `${m.label.toLowerCase()} not captured`;
  }).join(', ');

  return (
    <View style={s.row} accessible accessibilityLabel={`Today: ${spoken}`}>
      {MOMENTS.map((moment, i) => (
        <MomentCell
          key={moment.id}
          moment={moment}
          done={moments[moment.id]}
          isNow={moment.id === now.id}
          delay={base + i * STAGGER_MS}
          color={color}
          idleColor={idleColor}
          textColor={textColor}
          mutedColor={mutedColor}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cell: {
    flex: 1,
    gap: 8,
  },
  bar: {
    height: 6,
    borderRadius: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ink: {
    flex: 1,
    transformOrigin: 'left',
  },
  label: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 14,
  },
});
