/**
 * The last onboarding step: what Fold is, in three short lines, then
 * START. Finishing here marks onboarding done and lands on home, where
 * the camera is already waiting.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BookHeart, Camera, Lock } from 'lucide-react-native';

import { BalancedText } from '@/components/balanced-text';
import { OnboardingFrame } from '@/components/onboarding/onboarding-frame';
import { riseIn } from '@/constants/motion';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { getAgeRange } from '@/utils/dob';
import { goBack, navigate } from '@/utils/navigation';

const LINES = [
  { icon: Camera, text: 'keep one moment a day: a photo, a few words or your voice.' },
  { icon: BookHeart, text: 'each day you keep earns its own little doodle.' },
  { icon: Lock, text: 'your memories stay on this phone.' },
] as const;

export default function OnboardingIntroScreen() {
  const theme = useTheme();

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
      cta={{ text: 'START', onPress: start }}
    >
      <View style={styles.lines}>
        {LINES.map(({ icon: Icon, text }, i) => (
          // Each line rises in on its own beat.
          <Animated.View key={text} entering={riseIn(320, 120 + i * 110)} style={styles.line}>
            <Icon size={18} color={theme.accentWarm} />
            <BalancedText style={[styles.text, { color: theme.text }]}>{text}</BalancedText>
          </Animated.View>
        ))}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  lines: { gap: 22, alignSelf: 'stretch', paddingHorizontal: 8 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  text: { flex: 1, fontFamily: 'JetBrainsMono-Regular', fontSize: 14, lineHeight: 21 },
});
