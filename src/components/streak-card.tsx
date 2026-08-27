import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
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

function getStreakRank(streak: number): { title: string; message: string } {
  if (streak === 0) return { title: 'Dormant', message: 'Capture something today' };
  if (streak === 1) return { title: 'Ignited', message: 'The first spark' };
  if (streak === 2) return { title: 'Kindling', message: 'Keep the fire alive' };
  if (streak < 7) return { title: 'Burning', message: 'Building momentum' };
  if (streak < 14) return { title: 'Blazing', message: 'One week strong' };
  if (streak < 30) return { title: 'Inferno', message: 'You are relentless' };
  if (streak < 60) return { title: 'Eternal', message: 'A month of discipline' };
  if (streak < 100) return { title: 'Mythic', message: 'Few reach this far' };
  if (streak < 365) return { title: 'Legendary', message: 'You are unstoppable' };
  return { title: 'Immortal', message: 'A full year. Respect.' };
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
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={trackColor} strokeWidth={strokeWidth} fill="none"
        opacity={0.4}
      />
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
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      activeDays.add(dateStr);
    });

    const sortedDays = Array.from(activeDays).sort((a, b) => b.localeCompare(a));
    if (sortedDays.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let maxSoFar = 1;
    let longest = 1;

    for (let i = 0; i < sortedDays.length - 1; i++) {
      const d1 = new Date(sortedDays[i]);
      const d2 = new Date(sortedDays[i + 1]);
      const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) { maxSoFar++; }
      else { longest = Math.max(longest, maxSoFar); maxSoFar = 1; }
    }
    longest = Math.max(longest, maxSoFar);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let current = 0;
    if (activeDays.has(todayStr) || activeDays.has(yesterdayStr)) {
      let checkDate = activeDays.has(todayStr) ? today : yesterday;
      while (true) {
        const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (activeDays.has(checkStr)) {
          current++;
          checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        } else { break; }
      }
    }

    return { currentStreak: current, longestStreak: longest };
  }, [compositions]);

  const flameColor = getFlameColor(currentStreak);
  const rank = getStreakRank(currentStreak);
  const milestone = getMilestoneProgress(currentStreak);
  const isActive = currentStreak > 0;

  const RING_SIZE = 64;

  return (
    <View style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      
      {/* ── Row 1 ── */}
      <View style={s.topRow}>
        <View style={[s.ringBox, { width: RING_SIZE, height: RING_SIZE }]}>
          <ProgressRing
            progress={milestone.progress}
            size={RING_SIZE}
            strokeWidth={2}
            color={flameColor}
            trackColor={theme.border}
          />
          <Flame size={24} color={flameColor} />
        </View>

        <View style={s.numberRow}>
          <ThemedText style={[s.hugeNumber, { color: isActive ? theme.text : theme.textMuted }]}>
            {currentStreak}
          </ThemedText>

          <View style={s.textCol}>
            <ThemedText style={[s.streakUnit, { color: theme.textMuted }]}>
              day streak
            </ThemedText>
            <ThemedText style={[s.rankText, { color: isActive ? flameColor : theme.textMuted }]}>
              {rank.title}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* ── Row 2 ── */}
      <View style={s.bottomRow}>
        {longestStreak > 0 ? (
          <View style={[s.bestPill, { backgroundColor: theme.border }]}>
            <ThemedText style={[s.bestText, { color: theme.text }]}>
              BEST {longestStreak}
            </ThemedText>
          </View>
        ) : (
          <View />
        )}

        <View style={s.metricsRow}>
          <Text>
            <ThemedText style={[s.metricNum, { color: theme.text }]}>{todayCount}</ThemedText>
            <ThemedText style={[s.metricUnit, { color: theme.textMuted }]}> today</ThemedText>
          </Text>
          <Text>
            <ThemedText style={[s.metricNum, { color: theme.text }]}>{totalWords.toLocaleString()}</ThemedText>
            <ThemedText style={[s.metricUnit, { color: theme.textMuted }]}> words</ThemedText>
          </Text>
          <Text>
            <ThemedText style={[s.metricNum, { color: theme.text }]}>{audioCount}</ThemedText>
            <ThemedText style={[s.metricUnit, { color: theme.textMuted }]}> clips</ThemedText>
          </Text>
        </View>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12, // match other UI elements better
    padding: 24,
    gap: 28, // slight reduction from 32
    marginBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  ringBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textCol: {
    alignItems: 'flex-start',
    gap: 2, // tighter line spacing
    marginBottom: 10, // optical adjustment to align baseline nicely with the big number
  },
  streakUnit: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
  },
  rankText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11, // slightly smaller rank
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  hugeNumber: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 64,
    lineHeight: 72,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Center aligns the pill with the text blocks natively
  },
  bestPill: {
    paddingHorizontal: 10,
    paddingVertical: 6, // tighter vertical padding
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14, // scaled down to be proportionate to the metrics
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricNum: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
  },
  metricUnit: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    opacity: 0.7, // slightly more visible
  },
});
