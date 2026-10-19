/**
 * TodayGoalRow — today's memories against the daily goal, one tick each,
 * on the Continuum card.
 *
 * A tick fills in two motions that finish at different rates: the ink
 * sweeps across first, then the tick settles down into its slot.
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
import { Type } from '@/constants/theme';
import { EASE_IN, EASE_OUT, SPRING_BOUNCE } from '@/constants/motion';

/** Lets the card's own entrance land before the ticks fill. */
const ENTRANCE_DELAY_MS = 360;
const STAGGER_MS = 70;

interface TodayGoalRowProps {
  count: number;
  goal: number;
  color: string;
  idleColor: string;
  mutedColor: string;
  reduceMotion: boolean;
}

function GoalTick({
  filled,
  delay,
  color,
  idleColor,
  reduceMotion,
}: {
  filled: boolean;
  delay: number;
  color: string;
  idleColor: string;
  reduceMotion: boolean;
}) {
  const sweep = useSharedValue(0);
  const settle = useSharedValue(0);
  // The stagger applies when the tick fills, not to later re-renders.
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => {
    if (!filled) {
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
    sweep.value = withDelay(at, withTiming(1, { duration: 280, easing: EASE_OUT }));
    settle.value = withDelay(at + 60, withTiming(1, { duration: 380, easing: SPRING_BOUNCE }));
  }, [filled, reduceMotion, settle, sweep]);

  const inkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: sweep.value }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: filled ? -3 * (1 - settle.value) : 0 }],
  }));

  return (
    <Animated.View style={[s.tick, { borderColor: idleColor }, tickStyle]}>
      <Animated.View style={[s.ink, { backgroundColor: color }, inkStyle]} />
    </Animated.View>
  );
}

export function TodayGoalRow({ count, goal, color, idleColor, mutedColor, reduceMotion }: TodayGoalRowProps) {
  const shown = Math.min(count, goal);
  const complete = count >= goal;

  // Ticks filling together (first load) stagger from the first new one.
  const previousRef = useRef(0);
  const previous = previousRef.current;
  useEffect(() => {
    previousRef.current = shown;
  }, [shown]);

  return (
    <View
      style={s.row}
      accessible
      accessibilityLabel={`Today, ${shown} of ${goal} ${goal === 1 ? 'memory' : 'memories'}${complete ? ', goal met' : ''}`}
    >
      <ThemedText style={[Type.rail, { color: mutedColor }]}>TODAY</ThemedText>
      <View style={s.ticks}>
        {Array.from({ length: goal }, (_, i) => (
          <GoalTick
            key={`${goal}-${i}`}
            filled={i < shown}
            delay={ENTRANCE_DELAY_MS * (previous === 0 ? 1 : 0) + Math.max(0, i - previous) * STAGGER_MS}
            color={color}
            idleColor={idleColor}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
      <ThemedText style={[s.readout, { color: complete ? color : mutedColor }]}>
        {`${shown}/${goal}`}
      </ThemedText>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  ticks: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  tick: {
    width: 14,
    height: 8,
    borderRadius: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ink: {
    flex: 1,
    transformOrigin: 'left',
  },
  readout: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
