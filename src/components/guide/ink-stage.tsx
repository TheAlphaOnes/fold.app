/**
 * InkStage — HABIT chapter, step 1. Explains the Continuum card with the
 * user's own numbers: the streak, this month's ink and the record, then
 * the four ways a day earns ink.
 *
 * Segments finish at different rates: the card rises first, its numbers
 * fade in a beat later, the earning rows slide in one after another, and
 * the footnote and action arrive last.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { ActionLink } from '@/components/action-link';
import { ThemedText } from '@/components/themed-text';
import { INK_FACTORS, WORDS_MIN_CHARS, type InkFactorId } from '@/constants/ink';
import { fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';
import type { GuideStageProps } from './types';

/** What each factor asks for, short enough to share its row with the label. */
const FACTOR_COPY: Record<InkFactorId, string> = {
  day: 'any memory',
  moments: 'morning · noon · night',
  words: `${WORDS_MIN_CHARS}+ characters`,
  photo: 'your own',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function InkStage({ status, onSuccess }: Pick<GuideStageProps, 'status' | 'onSuccess'>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const streak = useProgressionStore((state) => state.streak);
  const ink = useProgressionStore((state) => state.ink);
  const enter = (duration: number, delay: number, distance?: number) =>
    reduceMotion ? undefined : riseIn(duration, delay, distance);

  return (
    <View style={styles.container}>
      <Animated.View
        entering={enter(320, 0, 16)}
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        accessible
        accessibilityLabel={`Your Continuum: ${streak.current} day streak, best ${streak.longest}. ${ink.month} ink this month, record ${ink.record}.`}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>CONTINUUM</ThemedText>
        <Animated.View entering={reduceMotion ? undefined : fadeIn(360, 180)} style={styles.figures}>
          <View style={styles.figure}>
            <View style={styles.figureLine}>
              <ThemedText style={[styles.count, { color: theme.text }]}>{pad2(streak.current)}</ThemedText>
              <ThemedText style={[styles.unit, { color: theme.accentWarm }]}>days</ThemedText>
            </View>
            <ThemedText style={[styles.caption, { color: theme.textMuted }]}>in a row</ThemedText>
          </View>
          <View style={[styles.figure, styles.figureEnd]}>
            <View style={styles.figureLine}>
              <ThemedText style={[styles.count, { color: theme.text }]}>{ink.month}</ThemedText>
              <ThemedText style={[styles.unit, { color: theme.accentWarm }]}>ink</ThemedText>
            </View>
            <ThemedText style={[styles.caption, { color: theme.textMuted }]}>{`this month · record ${ink.record}`}</ThemedText>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={styles.rows}>
        {INK_FACTORS.map((factor, i) => (
          <Animated.View
            key={factor.id}
            entering={enter(280, 380 + i * 90, 10)}
            style={[styles.row, { borderBottomColor: theme.border }]}
          >
            <ThemedText style={[styles.points, { color: theme.accentWarm }]}>
              {factor.perDay > 1 ? `+${factor.points}×${factor.perDay}` : `+${factor.points}`}
            </ThemedText>
            <ThemedText style={[styles.rowLabel, { color: theme.text }]}>{factor.label}</ThemedText>
            <ThemedText style={[styles.rowCopy, { color: theme.textMuted }]} numberOfLines={1}>
              {FACTOR_COPY[factor.id]}
            </ThemedText>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={reduceMotion ? undefined : fadeIn(320, 820)}>
        <ThemedText style={[styles.footnote, { color: theme.textMuted }]}>resets on the 1st · best month = record</ThemedText>
      </Animated.View>

      <View style={styles.action}>
        {status === 'active' && (
          <Animated.View entering={enter(260, 960)} exiting={fadeOut()}>
            <ActionLink text="GOT IT" onPress={onSuccess} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Content starts under the prompt and the action sits at the foot, so no
  // band of empty space opens up between the title and the page.
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 12,
    gap: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 14,
  },
  figures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  figure: {
    gap: 4,
  },
  figureEnd: {
    alignItems: 'flex-end',
  },
  figureLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  count: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    letterSpacing: 1,
    lineHeight: 16,
  },
  caption: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  rows: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  points: {
    width: 52,
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  rowLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    lineHeight: 14,
  },
  rowCopy: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 14,
  },
  footnote: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  action: {
    marginTop: 'auto',
    minHeight: 48,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
