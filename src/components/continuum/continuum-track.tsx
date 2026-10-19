/**
 * ContinuumTrack — the last 21 days as marks in three weeks. Days in the
 * current streak take the accent; other written days stay quiet.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/constants/motion';
import { toDayKey } from '@/utils/format-date';

const WINDOW_DAYS = 21;
const WEEK_SIZE = 7;
const WEEK_COUNT = WINDOW_DAYS / WEEK_SIZE;

export interface DayMark {
  key: string;
  written: boolean;
  inStreak: boolean;
  isToday: boolean;
}

function buildWindow(activeDays: Set<string>, currentStreak: number): DayMark[] {
  const today = new Date();
  const todayStr = toDayKey(today);
  const marks: DayMark[] = [];

  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = toDayKey(date);
    const written = activeDays.has(key);
    const daysAgo = Math.round((today.getTime() - date.getTime()) / 86400000);
    const inStreak = currentStreak > 0 && written && daysAgo < currentStreak;
    marks.push({ key, written, inStreak, isToday: key === todayStr });
  }

  return marks;
}

function ContinuumMark({
  mark,
  color,
  idleColor,
  delay,
  reduceMotion,
}: {
  mark: DayMark;
  color: string;
  idleColor: string;
  delay: number;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(reduceMotion ? 1 : 0.16);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 240, easing: EASE_OUT }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 180, easing: EASE_OUT }),
    );
  }, [delay, opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
    opacity: opacity.value,
  }));

  const fill = mark.inStreak ? color : mark.written ? idleColor : 'transparent';
  const border = mark.written ? 'transparent' : idleColor;

  // Animated values and data-driven colours live on separate views. When the
  // journal loads and a mark's colour changes, React re-commits only the inner
  // view; if both shared one view, that commit could overwrite the running
  // entrance with its initial props (opacity 0, squashed) and the mark vanished.
  return (
    <Animated.View style={[s.mark, mark.isToday && s.markToday, animatedStyle]}>
      <View style={[s.markFill, { backgroundColor: fill, borderColor: border }]} />
    </Animated.View>
  );
}

export function ContinuumTrack({
  days,
  color,
  idleColor,
  reduceMotion,
}: {
  days: DayMark[];
  color: string;
  idleColor: string;
  reduceMotion: boolean;
}) {
  return (
    <View style={s.trackBlock}>
      <View style={s.track}>
        {Array.from({ length: WEEK_COUNT }, (_, week) => (
          <View key={`week-${week}`} style={s.week}>
            {days.slice(week * WEEK_SIZE, week * WEEK_SIZE + WEEK_SIZE).map((mark, i) => (
              <ContinuumMark
                key={mark.key}
                mark={mark}
                color={color}
                idleColor={idleColor}
                delay={40 + (week * WEEK_SIZE + i) * 22}
                reduceMotion={reduceMotion}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={[s.rule, { backgroundColor: idleColor }]} />
    </View>
  );
}

/** Builds the 21-day window from the store's active days. */
export function useContinuumWindow(activeDays: Set<string>, currentStreak: number): DayMark[] {
  return useMemo(() => buildWindow(activeDays, currentStreak), [activeDays, currentStreak]);
}

const s = StyleSheet.create({
  trackBlock: {
    paddingHorizontal: 16,
    gap: 12,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    height: 28,
  },
  week: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  mark: {
    width: 3,
    height: 18,
    transformOrigin: 'bottom',
  },
  markFill: {
    flex: 1,
    borderRadius: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  markToday: {
    height: 28,
    width: 3,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
