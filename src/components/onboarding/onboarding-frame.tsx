/**
 * OnboardingFrame — the shared shell of every onboarding step: step marker
 * and back arrow on top, title and subtitle, the step's field, a quiet
 * footnote, and the call to action at the bottom.
 *
 * Each part enters on its own clock (marker, title, subtitle, field,
 * footnote, button), so a step assembles in small pieces instead of fading
 * in as one block.
 */

import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

export const ONBOARDING_STEPS = 3;

interface OnboardingFrameProps {
  /** 1-based position in the setup flow. */
  step: number;
  title: string;
  subtitle: string;
  /** Shown under the field, muted: why we ask, or where it lives. */
  footnote?: string;
  /** Omit on the first step. */
  onBack?: () => void;
  cta: { text: string; onPress: () => void; disabled?: boolean };
  /** Extra action under the CTA, e.g. a skip. */
  secondary?: { text: string; onPress: () => void };
  children: React.ReactNode;
}

export function OnboardingFrame({ step, title, subtitle, footnote, onBack, cta, secondary, children }: OnboardingFrameProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <GrainBackground />

          <View style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
            <Animated.View entering={fadeIn(260)} style={styles.topBar}>
              {onBack ? (
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    onBack();
                  }}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  style={styles.back}
                >
                  <ArrowLeft size={20} color={theme.text} strokeWidth={1.75} />
                </Pressable>
              ) : (
                <View style={styles.back} />
              )}
              <StepMarker step={step} />
              <View style={styles.back} />
            </Animated.View>

            <View style={styles.topSpacer} />

            <View style={styles.center}>
              <Animated.View entering={riseIn(360, 60, 10)}>
                <ThemedText style={[styles.title, { color: theme.text }]}>{title}</ThemedText>
              </Animated.View>
              <Animated.View entering={riseIn(420, 130, 8)}>
                <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</ThemedText>
              </Animated.View>

              <Animated.View entering={riseIn(480, 200, 14)} style={styles.field}>
                {children}
              </Animated.View>

              {footnote && (
                <Animated.View entering={fadeIn(500, 340)}>
                  <ThemedText style={[styles.footnote, { color: theme.textMuted }]}>{footnote}</ThemedText>
                </Animated.View>
              )}
            </View>

            <View style={styles.bottomSpacer} />

            <Animated.View entering={riseIn(440, 280, 16)} style={styles.cta}>
              <ActionLink text={cta.text} onPress={cta.onPress} disabled={cta.disabled} />
              {secondary && (
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    secondary.onPress();
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  style={styles.secondary}
                >
                  <ThemedText style={[styles.secondaryText, { color: theme.textMuted }]}>{secondary.text}</ThemedText>
                </Pressable>
              )}
            </Animated.View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

/** "02 / 03" plus a row of short bars, the current one in accent. */
function StepMarker({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View
      style={styles.marker}
      accessible
      accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
    >
      <View style={styles.bars}>
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i + 1 <= step ? theme.accentWarm : theme.border, width: i + 1 === step ? 22 : 10 },
            ]}
          />
        ))}
      </View>
      <ThemedText style={[styles.markerText, { color: theme.textMuted }]}>
        {String(step).padStart(2, '0')} / {String(ONBOARDING_STEPS).padStart(2, '0')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  marker: {
    alignItems: 'center',
    gap: 8,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    height: 3,
    borderRadius: 2,
  },
  markerText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  topSpacer: { flex: 1 },
  bottomSpacer: { flex: 1.4 },
  center: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 32,
    lineHeight: 44,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 2,
    marginTop: 8,
    textAlign: 'center',
  },
  field: {
    width: '100%',
    marginTop: 40,
  },
  footnote: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.5,
    marginTop: 28,
    textAlign: 'center',
  },
  cta: {
    alignItems: 'center',
    marginBottom: 48,
    gap: 20,
  },
  secondary: {
    paddingVertical: 4,
  },
  secondaryText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
