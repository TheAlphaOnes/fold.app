/**
 * GuideComplete — the finish beat. Deliberately quiet: one mark, one line,
 * one action. The pieces arrive in a short cascade on their own curves so
 * the moment still lands without adding anything to look at.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { ThemedText } from '@/components/themed-text';
import { SPRING_BOUNCE, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const MARK = 44;

const markIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: SPRING_BOUNCE },
}).duration(320);

interface GuideCompleteProps {
  onFinish: () => void;
}

export function GuideComplete({ onFinish }: GuideCompleteProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Animated.View entering={markIn} style={[styles.mark, { borderColor: theme.accentWarm }]}>
        <Check size={20} color={theme.accentWarm} strokeWidth={2.5} />
      </Animated.View>

      <View style={styles.copy}>
        <Animated.View entering={riseIn(300, 90)}>
          <ThemedText style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {"YOU'RE READY"}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={riseIn(320, 130, 6)}>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            your journal is waiting.
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View entering={riseIn(280, 220)}>
        <ActionLink text="OPEN JOURNAL" onPress={onFinish} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 32,
    // Optical centre: sit slightly above the true middle of the screen.
    paddingBottom: 64,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
