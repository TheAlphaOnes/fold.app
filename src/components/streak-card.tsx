import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Flame, Trophy, Target } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface StreakCardProps {
  compositions: Composition[];
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
    <Svg width={size} height={size} style={styles.ringAbsolute}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={trackColor} strokeWidth={strokeWidth} fill="none"
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

export function StreakCard({ compositions }: StreakCardProps) {
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

  const RING_SIZE = 80;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.ringWrapper, { width: 56, height: 56 }]}>
            <ProgressRing
              progress={milestone.progress}
              size={56}
              strokeWidth={2.5}
              color={flameColor}
              trackColor={theme.border}
            />
            <View style={styles.ringContent}>
              <Flame size={20} color={flameColor} />
            </View>
          </View>
          
          <View style={styles.headerText}>
            <View style={styles.streakValueRow}>
              <ThemedText style={[styles.streakNumber, { color: isActive ? flameColor : theme.text }]}>
                {currentStreak}
              </ThemedText>
              <ThemedText style={[styles.streakLabel, { color: theme.textMuted }]}>
                DAY STREAK
              </ThemedText>
            </View>
            <ThemedText style={[styles.rankTitle, { color: isActive ? flameColor : theme.textMuted }]}>
              {rank.title}
            </ThemedText>
          </View>
        </View>
        
        <View style={[styles.bestBadge, { backgroundColor: theme.border }]}>
          <Trophy size={12} color="#E45B00" />
          <ThemedText style={[styles.bestText, { color: theme.text }]}>
            {longestStreak}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.message, { color: theme.textMuted }]}>
        {rank.message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 4,
    gap: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringAbsolute: {
    position: 'absolute',
  },
  ringContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    gap: 4,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakNumber: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 24,
    lineHeight: 28,
  },
  streakLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    marginTop: 2, // optical alignment
  },
  rankTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
  },
  message: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
