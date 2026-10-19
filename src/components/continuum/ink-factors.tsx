/**
 * InkFactors — today's four ways to earn ink, so the number explains
 * itself. Earned ones take the accent; the rest wait in muted grey.
 * Cells rise one after another, each finishing a beat after the last.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { INK_FACTORS } from '@/constants/ink';
import { riseIn } from '@/constants/motion';
import type { DayEarned } from '@/utils/ink';

interface InkFactorsProps {
  earned: DayEarned;
  accent: string;
  muted: string;
  border: string;
  /** When the first cell starts rising, in ms. */
  delay: number;
  reduceMotion: boolean;
}

/** "show up 10 of 10, moments 5 of 15, …" for screen readers. */
export function describeFactors(earned: DayEarned): string {
  return INK_FACTORS.map(
    (f) => `${f.label.toLowerCase()} ${earned[f.id] * f.points} of ${f.perDay * f.points}`,
  ).join(', ');
}

export function InkFactors({ earned, accent, muted, border, delay, reduceMotion }: InkFactorsProps) {
  return (
    <View style={[s.row, { borderTopColor: border }]}>
      {INK_FACTORS.map((factor, i) => {
        const points = earned[factor.id] * factor.points;
        return (
          <Animated.View
            key={factor.id}
            entering={reduceMotion ? undefined : riseIn(260, delay + i * 60, 6)}
            style={s.cell}
          >
            <ThemedText style={[s.label, { color: muted }]} numberOfLines={1}>
              {factor.label}
            </ThemedText>
            <ThemedText style={[s.value, { color: points > 0 ? accent : muted }]}>
              {`${points}/${factor.perDay * factor.points}`}
            </ThemedText>
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cell: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 1,
    lineHeight: 12,
  },
  value: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
