/**
 * FoldScoreCard — the one number on the profile. It counts up from the
 * score last seen here, so whatever was earned since reads as movement
 * rather than an announcement. Below it, today's four factors show how
 * the number grows, earned ones in ink.
 *
 * Entrance segments finish at different rates: the rail fades first, the
 * number counts, the factors rise one by one, and today's gain arrives last.
 */

import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SCORE_FACTORS } from '@/constants/fold-score';
import { EASE_OUT, riseIn } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { useCountUp } from '@/hooks/use-count-up';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';

const COUNT_DELAY_MS = 260;
const COUNT_DURATION_MS = 900;

function formatScore(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function FoldScoreCard() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;

  const score = useProgressionStore((state) => state.score);
  const seenScore = useProgressionStore((state) => state.seenScore);
  const markScoreSeen = useProgressionStore((state) => state.markScoreSeen);

  // Count from what this card last showed; fixed for the card's lifetime so
  // marking the score seen does not restart the count.
  const fromRef = useRef<number | null>(null);
  if (fromRef.current === null && seenScore !== null) fromRef.current = Math.min(seenScore, score.total);
  const from = fromRef.current ?? score.total;

  const shown = useCountUp(from, score.total, {
    delay: COUNT_DELAY_MS,
    duration: COUNT_DURATION_MS,
    animate: !reduceMotion && seenScore !== null,
    // Until the stored score is read, there is nothing to mark.
    onDone: seenScore !== null ? markScoreSeen : undefined,
  });

  const factors = SCORE_FACTORS.map((factor) => {
    const earned = score.todayEarned[factor.id] * factor.points;
    const possible = factor.perDay * factor.points;
    return { ...factor, earned, possible };
  });
  const spokenFactors = factors.map((f) => `${f.label.toLowerCase()} ${f.earned} of ${f.possible}`).join(', ');
  const gainDelay = COUNT_DELAY_MS + COUNT_DURATION_MS * 0.6;

  return (
    <View
      style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Fold Score ${score.total}. ${score.today} points today: ${spokenFactors}.`}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220).easing(EASE_OUT)}
        style={s.rail}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>FOLD SCORE</ThemedText>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(gainDelay).duration(320).easing(EASE_OUT)}>
          <ThemedText style={[Type.rail, { color: score.today > 0 ? theme.accentWarm : theme.textMuted }]}>
            {`+${score.today} TODAY`}
          </ThemedText>
        </Animated.View>
      </Animated.View>

      <ThemedText style={[s.total, { color: theme.text }]}>{formatScore(shown)}</ThemedText>

      <View style={[s.factors, { borderTopColor: theme.border }]}>
        {factors.map((factor, i) => {
          const earned = factor.earned > 0;
          return (
            <Animated.View
              key={factor.id}
              entering={reduceMotion ? undefined : riseIn(260, 180 + i * 60, 6)}
              style={s.factor}
            >
              <ThemedText style={[s.factorLabel, { color: theme.textMuted }]} numberOfLines={1}>
                {factor.label}
              </ThemedText>
              <ThemedText style={[s.factorValue, { color: earned ? theme.accentWarm : theme.textMuted }]}>
                {`${factor.earned}/${factor.possible}`}
              </ThemedText>
            </Animated.View>
          );
        })}
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
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  total: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 48,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  factors: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  factor: {
    flex: 1,
    gap: 4,
  },
  factorLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 1,
    lineHeight: 12,
  },
  factorValue: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
