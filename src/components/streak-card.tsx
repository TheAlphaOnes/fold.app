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
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Type } from '@/constants/theme';
import { useDailyGoal, useProgressionStore } from '@/hooks/use-progression';
import { TodayGoalRow } from './today-goal-row';
import { toDayKey } from '@/utils/format-date';

const WINDOW_DAYS = 21;
const WEEK_SIZE = 7;
const WEEK_COUNT = WINDOW_DAYS / WEEK_SIZE;

const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

interface DayMark {
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

function ContinuumTrack({
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

export function StreakCard() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;

  // Read from the progression store: it sees every memory's day, not just
  // the latest page the profile happens to have loaded.
  const activeDays = useProgressionStore((state) => state.activeDays);
  const { current: currentStreak, longest: longestStreak } = useProgressionStore((state) => state.streak);
  const dailyGoal = useDailyGoal();

  const days = useMemo(
    () => buildWindow(activeDays, currentStreak),
    [activeDays, currentStreak],
  );

  const live = currentStreak > 0;
  const ink = live ? theme.accentWarm : theme.textMuted;
  const wroteToday = days.some((d) => d.isToday && d.written);
  const unit = currentStreak === 1 ? 'day' : 'days';
  // Only say things the user can act on: done today, or what to do next.
  const hint = !live ? 'write today to start' : wroteToday ? 'you wrote today' : 'write today to keep it';

  const litInView = days.filter((d) => d.written).length;
  const yearPrefix = `${new Date().getFullYear()}-`;
  const daysThisYear = Array.from(activeDays).filter((key) => key.startsWith(yearPrefix)).length;
  const metrics = `${litInView} of the last ${WINDOW_DAYS} days  ·  ${daysThisYear} ${daysThisYear === 1 ? 'day' : 'days'} this year`;

  return (
    <View
      style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Continuum, ${currentStreak} ${unit}. Best ${longestStreak} days. ${hint}. Wrote on ${metrics}.`}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220).easing(EASE_OUT)}
        style={s.rail}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>CONTINUUM</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>
          {`BEST ${longestStreak} ${longestStreak === 1 ? 'DAY' : 'DAYS'}`}
        </ThemedText>
      </Animated.View>

      <ContinuumTrack
        days={days}
        color={ink}
        idleColor={theme.border}
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
          <ThemedText style={[s.rank, { color: ink }]}>{unit}</ThemedText>
        </View>
        <ThemedText style={[s.hint, { color: wroteToday ? theme.accentWarm : theme.textMuted }]} numberOfLines={1}>
          {hint}
        </ThemedText>
      </Animated.View>

      {dailyGoal.visible && (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(220).duration(240).easing(EASE_OUT)}>
          <TodayGoalRow
            count={dailyGoal.count}
            goal={dailyGoal.goal}
            color={theme.accentWarm}
            idleColor={theme.border}
            mutedColor={theme.textMuted}
            reduceMotion={reduceMotion}
          />
        </Animated.View>
      )}

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
