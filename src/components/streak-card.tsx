import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Type } from '@/constants/theme';

interface StreakCardProps {
  compositions: Composition[];
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 365];
const WINDOW_DAYS = 21;
const WEEK_SIZE = 7;
const WEEK_COUNT = WINDOW_DAYS / WEEK_SIZE;

const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getStreakRank(streak: number): string {
  if (streak === 0) return 'Dormant';
  if (streak === 1) return 'Ignited';
  if (streak === 2) return 'Kindling';
  if (streak < 7) return 'Burning';
  if (streak < 14) return 'Blazing';
  if (streak < 30) return 'Inferno';
  if (streak < 60) return 'Eternal';
  if (streak < 100) return 'Mythic';
  if (streak < 365) return 'Legendary';
  return 'Immortal';
}

function getMilestone(streak: number): { next: number; progress: number; remaining: number } {
  const prev = MILESTONES.filter((m) => m <= streak).pop() ?? 0;
  const next = MILESTONES.find((m) => m > streak) ?? MILESTONES[MILESTONES.length - 1];
  if (streak >= next) return { next, progress: 1, remaining: 0 };
  const range = next - prev;
  return {
    next,
    progress: range > 0 ? (streak - prev) / range : 0,
    remaining: next - streak,
  };
}

function untilCopy(remaining: number, next: number, progress: number): string {
  if (progress >= 1) return 'held';
  const rank = getStreakRank(next).toLowerCase();
  if (remaining === 1) return `one until ${rank}`;
  return `${remaining} until ${rank}`;
}

function computeStreak(compositions: Composition[]): {
  currentStreak: number;
  longestStreak: number;
  activeDays: Set<string>;
} {
  if (compositions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDays: new Set() };
  }

  const activeDays = new Set<string>();
  compositions.forEach((c) => {
    activeDays.add(dayKey(new Date(c.createdAt)));
  });

  const sortedDays = Array.from(activeDays).sort((a, b) => b.localeCompare(a));
  let maxSoFar = 1;
  let longest = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const diff = Math.round(
      (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i + 1]).getTime()) / 86400000,
    );
    if (diff === 1) {
      maxSoFar += 1;
    } else {
      longest = Math.max(longest, maxSoFar);
      maxSoFar = 1;
    }
  }
  longest = Math.max(longest, maxSoFar);

  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const todayStr = dayKey(today);
  const yesterdayStr = dayKey(yesterday);

  let current = 0;
  if (activeDays.has(todayStr) || activeDays.has(yesterdayStr)) {
    let checkDate = activeDays.has(todayStr) ? today : yesterday;
    while (true) {
      const s = dayKey(checkDate);
      if (activeDays.has(s)) {
        current += 1;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  return { currentStreak: current, longestStreak: longest, activeDays };
}

interface DayMark {
  key: string;
  written: boolean;
  inStreak: boolean;
  isToday: boolean;
}

function buildWindow(activeDays: Set<string>, currentStreak: number): DayMark[] {
  const today = new Date();
  const todayStr = dayKey(today);
  const marks: DayMark[] = [];

  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = dayKey(date);
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

  return (
    <Animated.View
      style={[
        s.mark,
        mark.isToday && s.markToday,
        {
          backgroundColor: fill,
          borderColor: border,
        },
        animatedStyle,
      ]}
    />
  );
}

function ContinuumTrack({
  days,
  color,
  idleColor,
  progress,
  reduceMotion,
}: {
  days: DayMark[];
  color: string;
  idleColor: string;
  progress: number;
  reduceMotion: boolean;
}) {
  const fill = useSharedValue(reduceMotion ? progress : 0);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = progress;
      return;
    }
    fill.value = withDelay(
      280,
      withTiming(progress, { duration: 420, easing: Easing.linear }),
    );
  }, [fill, progress, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

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
      <View style={[s.rule, { backgroundColor: idleColor }]}>
        <Animated.View
          style={[
            s.ruleFill,
            { backgroundColor: color },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

export function StreakCard({ compositions }: StreakCardProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;

  const { currentStreak, longestStreak, activeDays } = useMemo(
    () => computeStreak(compositions),
    [compositions],
  );

  const days = useMemo(
    () => buildWindow(activeDays, currentStreak),
    [activeDays, currentStreak],
  );

  const rank = getStreakRank(currentStreak);
  const milestone = getMilestone(currentStreak);
  const live = currentStreak > 0;
  const ink = live ? theme.accentWarm : theme.textMuted;
  const until = untilCopy(milestone.remaining, milestone.next, milestone.progress);

  const litInView = days.filter((d) => d.written).length;
  const yearPrefix = `${new Date().getFullYear()}-`;
  const daysThisYear = Array.from(activeDays).filter((key) => key.startsWith(yearPrefix)).length;
  const metrics = `${pad2(litInView)} / ${WINDOW_DAYS} lit  ·  ${pad2(daysThisYear)} this year`;

  return (
    <View
      style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Continuum. Streak ${currentStreak} days, ${rank}. Best ${longestStreak} days. ${metrics}.`}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220).easing(EASE_OUT)}
        style={s.rail}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>CONTINUUM</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>
          BEST {pad2(longestStreak)}
        </ThemedText>
      </Animated.View>

      <ContinuumTrack
        days={days}
        color={ink}
        idleColor={theme.border}
        progress={milestone.progress}
        reduceMotion={reduceMotion}
      />

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(160).duration(280).easing(EASE_OUT)}
        style={s.readout}
      >
        <View style={s.readoutLead}>
          <ThemedText style={[s.count, { color: live ? theme.text : theme.textMuted }]}>
            {pad2(currentStreak)}
          </ThemedText>
          <ThemedText style={[s.rank, { color: ink }]}>{rank.toLowerCase()}</ThemedText>
        </View>
        <ThemedText style={[s.hint, { color: theme.textMuted }]} numberOfLines={1}>
          {live ? until : 'write today'}
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(280).duration(220).easing(EASE_OUT)}
        style={[s.footer, { borderTopColor: theme.border }]}
      >
        <ThemedText style={[s.metrics, { color: theme.textMuted }]} numberOfLines={1}>
          {metrics}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
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
    borderRadius: 1,
    borderWidth: StyleSheet.hairlineWidth,
    transformOrigin: 'bottom',
  },
  markToday: {
    height: 28,
    width: 3,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ruleFill: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    transformOrigin: 'left',
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  readoutLead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    flexShrink: 0,
  },
  count: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  rank: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 1,
    lineHeight: 18,
  },
  hint: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 16,
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metrics: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 16,
  },
});
