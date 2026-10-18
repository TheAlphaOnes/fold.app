/**
 * GuidePrompt — the step's eyebrow, title and hint.
 *
 * Each layer enters on its own curve and length (eyebrow 160ms, title 260ms,
 * hint 300ms, offset 40ms apart) so a new step arrives as a cascade. On
 * success the title is replaced by a bracketed past-tense label that springs
 * in; a nudge (wrong gesture, permission off) temporarily replaces the hint.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { GUIDE_CHAPTERS, chapterPosition, type GuideStep } from '@/constants/guide';
import { SPRING_BOUNCE, fadeIn, fadeOut, liftOut, riseIn } from '@/constants/motion';
import { BALANCED_TEXT } from '@/constants/theme';
import type { GuideStatus } from '@/hooks/use-guide-flow';

const successIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: SPRING_BOUNCE },
}).duration(320);

interface GuidePromptProps {
  step: GuideStep;
  status: GuideStatus;
  nudge: string | null;
}

export function GuidePrompt({ step, status, nudge }: GuidePromptProps) {
  const theme = useTheme();
  const { chapterNumber, index, total } = chapterPosition(step);
  const chapterLabel = GUIDE_CHAPTERS[chapterNumber - 1]?.label ?? '';
  const isSuccess = status === 'success';

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {/* Re-keyed per step so every layer re-runs its entrance. */}
      <Animated.View key={step.id} exiting={fadeOut()} style={styles.block}>
        <Animated.View entering={fadeIn(160)}>
          <ThemedText style={[styles.eyebrow, { color: theme.textMuted }]}>
            {`${String(chapterNumber).padStart(2, '0')} ${chapterLabel}  ·  ${index}/${total}`}
          </ThemedText>
        </Animated.View>

        <View style={styles.titleSlot}>
          {isSuccess ? (
            <Animated.View key="success" entering={successIn} exiting={liftOut()}>
              <ThemedText style={[styles.title, { color: theme.accentWarm }]}>
                {`[ ${step.success} ]`}
              </ThemedText>
            </Animated.View>
          ) : (
            <Animated.View key="title" entering={riseIn(260, 40)} exiting={liftOut()}>
              <ThemedText style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                {step.title}
              </ThemedText>
            </Animated.View>
          )}
        </View>

        <View style={styles.hintSlot}>
          {nudge ? (
            <Animated.View key={`nudge-${nudge}`} entering={fadeIn(180)} exiting={fadeOut(120)}>
              <ThemedText {...BALANCED_TEXT} style={[styles.hint, { color: theme.accentWarm }]}>
                {nudge}
              </ThemedText>
            </Animated.View>
          ) : (
            <Animated.View key="hint" entering={riseIn(300, 80, 6)} exiting={fadeOut(120)}>
              <ThemedText
                {...BALANCED_TEXT}
                style={[styles.hint, { color: theme.textSecondary, opacity: isSuccess ? 0.45 : 1 }]}
              >
                {step.hint}
              </ThemedText>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Fixed height: the stage below never jumps when copy length changes.
    height: 112,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  block: {
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
  },
  titleSlot: {
    height: 30,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 3,
    textAlign: 'center',
  },
  hintSlot: {
    minHeight: 40,
    justifyContent: 'flex-start',
  },
  hint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 300,
  },
});
