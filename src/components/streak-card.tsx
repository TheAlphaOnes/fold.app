import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
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

function ProgressRing({
  progress, size, strokeWidth, color, trackColor,
}: {
  progress: number; size: number; strokeWidth: number; color: string; trackColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" opacity={0.3} />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

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
  const RING_SIZE = 56;

  return (
    <View style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>

      {/* ── Hero row: number + labels on left, flame ring on right ── */}
      <View style={s.heroRow}>
        <View style={s.numberBlock}>
          <ThemedText style={[s.hugeNumber, { color: isActive ? theme.text : theme.textMuted }]}>
            {currentStreak}
          </ThemedText>
          <View style={s.labelStack}>
            <ThemedText style={[s.dayStreakLabel, { color: theme.textMuted }]}>day streak</ThemedText>
            <ThemedText style={[s.rankBadge, { color: isActive ? flameColor : theme.textMuted }]}>
              {rank.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={s.ringWrap}>
          <View style={[s.ringBox, { width: RING_SIZE, height: RING_SIZE }]}>
            <ProgressRing progress={milestone.progress} size={RING_SIZE} strokeWidth={2.5} color={flameColor} trackColor={theme.border} />
            <Flame size={20} color={flameColor} />
          </View>
          {longestStreak > 0 && (
            <ThemedText style={[s.bestLabel, { color: theme.textMuted }]}>BEST {longestStreak}</ThemedText>
          )}
        </View>
      </View>

      {/* ── Hairline divider ── */}
      <View style={[s.divider, { backgroundColor: theme.border }]} />

      {/* ── Metrics row ── */}
      <View style={s.metricsRow}>
        <View style={s.metricItem}>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{todayCount}</ThemedText>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>TODAY</ThemedText>
        </View>
        <View style={[s.metricDivider, { backgroundColor: theme.border }]} />
        <View style={s.metricItem}>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{totalWords.toLocaleString()}</ThemedText>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>WORDS</ThemedText>
        </View>
        <View style={[s.metricDivider, { backgroundColor: theme.border }]} />
        <View style={s.metricItem}>
          <ThemedText style={[s.metricNum, { color: theme.text }]}>{audioCount}</ThemedText>
          <ThemedText style={[s.metricLabel, { color: theme.textMuted }]}>CLIPS</ThemedText>
        </View>
      </View>

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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  numberBlock: {
    flexDirection: 'row',
    alignItems: 'center', // Changed from flex-end to center for optical alignment
    gap: 16,
  },
  hugeNumber: {
    fontFamily: 'BitcountGridDouble-Regular',
    fontSize: 100,
    lineHeight: 100,
    includeFontPadding: false,
    marginBottom: -16, // Optical adjustment for baseline
    marginTop: -8,
  } as any,
  labelStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 4,
  },
  dayStreakLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
  },
  rankBadge: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 2.5,
  },
  ringWrap: {
    alignItems: 'center',
    gap: 8,
  },
  ringBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  metricNum: {
    fontFamily: 'BitcountGridDouble-Regular',
    fontSize: 32,
    marginBottom: -4,
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 1.5,
  },
});
