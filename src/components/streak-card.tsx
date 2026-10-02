import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface StreakCardProps {
  compositions: Composition[];
  todayCount?: number;
  totalWords?: number;
  audioCount?: number;
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 365];

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

function getMilestoneProgress(streak: number): { next: number; progress: number } {
  const prev = MILESTONES.filter(m => m <= streak).pop() ?? 0;
  const next = MILESTONES.find(m => m > streak) ?? MILESTONES[MILESTONES.length - 1];
  if (streak >= next) return { next, progress: 1 };
  const range = next - prev;
  const current = streak - prev;
  return { next, progress: range > 0 ? current / range : 0 };
}

function getFlameColor(streak: number): string {
  if (streak === 0) return '#4A4A4A';
  if (streak < 3) return '#E45B00';
  if (streak < 7) return '#FF6B1A';
  if (streak < 14) return '#FF7F33';
  if (streak < 30) return '#FF944D';
  return '#FFAA66';
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Milestone gauge. The arc is its own animation segment: it sweeps in after
 * the readouts have landed, on a slower curve, so the card assembles in
 * layers instead of appearing all at once.
 */
function FlameGauge({
  progress, size, strokeWidth, color, trackColor,
}: {
  progress: number; size: number; strokeWidth: number; color: string; trackColor: string;
}) {
  const arc = useSharedValue(0);

  useEffect(() => {
    arc.value = withDelay(
      300,
      withTiming(progress, { duration: 1400, easing: Easing.out(Easing.cubic) }),
    );
  }, [arc, progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - arc.value),
  }));

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <AnimatedCircle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${circumference}`}
        animatedProps={animatedProps}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function StreakCard({ compositions, todayCount = 0, totalWords = 0, audioCount = 0 }: StreakCardProps) {
  const theme = useTheme();

  const { currentStreak, longestStreak } = useMemo(() => {
    if (compositions.length === 0) return { currentStreak: 0, longestStreak: 0 };
    const activeDays = new Set<string>();
    compositions.forEach(c => {
      const date = new Date(c.createdAt);
      activeDays.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    });
    const sortedDays = Array.from(activeDays).sort((a, b) => b.localeCompare(a));
    if (sortedDays.length === 0) return { currentStreak: 0, longestStreak: 0 };
    let maxSoFar = 1, longest = 1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const diff = Math.round((new Date(sortedDays[i]).getTime() - new Date(sortedDays[i + 1]).getTime()) / 86400000);
      if (diff === 1) { maxSoFar++; } else { longest = Math.max(longest, maxSoFar); maxSoFar = 1; }
    }
    longest = Math.max(longest, maxSoFar);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today.getTime() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    let current = 0;
    if (activeDays.has(todayStr) || activeDays.has(yesterdayStr)) {
      let checkDate = activeDays.has(todayStr) ? today : yesterday;
      while (true) {
        const s = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (activeDays.has(s)) { current++; checkDate = new Date(checkDate.getTime() - 86400000); } else { break; }
      }
    }
    return { currentStreak: current, longestStreak: longest };
  }, [compositions]);

  const flameColor = getFlameColor(currentStreak);
  const rank = getStreakRank(currentStreak);
  const milestone = getMilestoneProgress(currentStreak);
  const isActive = currentStreak > 0;

  const GAUGE_SIZE = 64;
  const nextCaption = milestone.progress >= 1 ? 'MAX' : `NEXT ${pad2(milestone.next)}`;

  return (
    <View
      style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityLabel={`Streak ${currentStreak} days, ${rank}. Best ${longestStreak} days. ${todayCount} today, ${totalWords} words, ${audioCount} clips.`}
    >
      {/* ── Rail: panel labels ── */}
      <Animated.View entering={FadeIn.duration(350)} style={s.rail}>
        <ThemedText style={[s.railLabel, { color: theme.textMuted }]}>STREAK</ThemedText>
        <ThemedText style={[s.railLabel, { color: theme.textMuted }]}>BEST {pad2(longestStreak)}</ThemedText>
      </Animated.View>

      {/* ── Hero: readout left, gauge right ── */}
      <View style={s.heroRow}>
        <View style={s.readout}>
          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <ThemedText style={[s.heroNumber, { color: isActive ? theme.text : theme.textMuted }]}>
              {pad2(currentStreak)}
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(220).duration(450)} style={s.heroCaption}>
            <ThemedText style={[s.caption, { color: theme.textMuted }]}>DAYS</ThemedText>
            <ThemedText style={[s.caption, { color: theme.textMuted }]}>·</ThemedText>
            <ThemedText style={[s.caption, { color: isActive ? flameColor : theme.textMuted }]}>
              {rank.toUpperCase()}
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(160).duration(450)} style={s.gaugeBlock}>
          <View style={[s.gaugeBox, { width: GAUGE_SIZE, height: GAUGE_SIZE }]}>
            <FlameGauge
              progress={milestone.progress}
              size={GAUGE_SIZE}
              strokeWidth={3}
              color={flameColor}
              trackColor={theme.border}
            />
            <Flame size={22} color={flameColor} />
          </View>
          <ThemedText style={[s.caption, { color: theme.textMuted }]}>{nextCaption}</ThemedText>
        </Animated.View>
      </View>

      {/* ── Stat columns ── */}
      <Animated.View entering={FadeIn.delay(380).duration(500)} style={s.metricsRow}>
        <View style={[s.metricItem, { borderTopColor: theme.border }]}>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>TODAY</ThemedText>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{todayCount}</ThemedText>
        </View>
        <View style={[s.metricItem, { borderTopColor: theme.border }]}>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>WORDS</ThemedText>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{totalWords.toLocaleString()}</ThemedText>
        </View>
        <View style={[s.metricItem, { borderTopColor: theme.border }]}>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>CLIPS</ThemedText>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{audioCount}</ThemedText>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  railLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 3,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  readout: {
    alignItems: 'flex-start',
    gap: 6,
  },
  heroNumber: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 64,
    lineHeight: 68,
    includeFontPadding: false,
  } as any,
  heroCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caption: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 3,
  },
  gaugeBlock: {
    alignItems: 'center',
    gap: 8,
  },
  gaugeBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  metricItem: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    alignItems: 'flex-start',
    gap: 2,
  },
  metricNum: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 26,
    lineHeight: 32,
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 3,
  },
});
