/**
 * The last onboarding step: Fold in one gesture. Today's doodle waits,
 * ghosted; a tap "keeps" today and it draws itself in, which is the whole
 * idea of the app. Then START finishes onboarding and lands on home.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { DoodleView } from '@/canvas/render/doodle-view';
import type { DoodleLayer } from '@/canvas/types';
import { BalancedText } from '@/components/balanced-text';
import { OnboardingFrame } from '@/components/onboarding/onboarding-frame';
import { DayDoodle, POP } from '@/doodles/day-doodle';
import { doodleForDate } from '@/doodles/library';
import { hueOf, strokeHex } from '@/doodles/palette';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { getAgeRange } from '@/utils/dob';
import { goBack, navigate } from '@/utils/navigation';

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const [kept, setKept] = useState(false);
  const size = Math.min(240, width - 120);
  const [doodle] = useState(() => doodleForDate(new Date()));

  // The same layer the spotlight draws, so the draw-in is the app's own.
  const layer = useMemo<DoodleLayer>(() => {
    const hue = hueOf(doodle.strokes);
    return {
      id: 'intro-doodle',
      kind: 'doodle',
      x: 0.5,
      y: 0.5,
      scale: 0.8,
      rotation: 0,
      color: null,
      width: 0.024,
      strokes: doodle.strokes.map((s) => ({ points: s.points, color: strokeHex(s.ink, hue) })),
    };
  }, [doodle]);

  const keep = () => {
    if (kept) return;
    haptic.success();
    setKept(true);
  };

  const start = async () => {
    const { settings, updateSetting } = useSettingsStore.getState();
    haptic.success();
    await updateSetting('hasOnboarded', true);
    track('onboarding_completed', { age_range: getAgeRange(settings.dob) });
    navigate.replace('/');
  };

  return (
    <OnboardingFrame
      step={3}
      title="FOLD"
      subtitle={'A JOURNAL FOR\nYOUR EVERY DAY.'}
      onBack={() => goBack('/onboarding/dob')}
      cta={{ text: 'START', onPress: start, disabled: !kept }}
    >
      <View style={styles.stage}>
        <Pressable
          onPress={keep}
          disabled={kept}
          accessibilityRole="button"
          accessibilityLabel={kept ? `Today's doodle: ${doodle.name}` : "Tap to keep today and reveal its doodle"}
          style={[styles.doodle, { width: size, height: size }]}
        >
          {kept ? (
            <Animated.View entering={reduced ? undefined : POP}>
              <DoodleView layer={layer} width={size} moving />
            </Animated.View>
          ) : (
            <Animated.View exiting={FadeOut.duration(160)} style={{ opacity: 0.16 }}>
              <DayDoodle doodle={doodle} size={size} moving={false} />
            </Animated.View>
          )}
        </Pressable>

        <View style={styles.caption}>
          <Animated.View key={kept ? 'kept' : 'waiting'} entering={FadeIn.delay(kept ? 500 : 200).duration(300)}>
            <BalancedText style={[styles.line, { color: kept ? theme.text : theme.textMuted }]}>
              {kept ? 'one doodle for every day you keep.' : 'tap to keep today.'}
            </BalancedText>
          </Animated.View>
        </View>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'stretch', alignItems: 'center' },
  doodle: { alignItems: 'center', justifyContent: 'center' },
  // Fixed height, so the swap between the two lines never moves the layout.
  caption: { height: 48, marginTop: 20, alignSelf: 'stretch', justifyContent: 'center' },
  line: { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
