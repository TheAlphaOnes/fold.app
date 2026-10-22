import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import { DobField } from '@/components/onboarding/dob-field';
import { OnboardingFrame } from '@/components/onboarding/onboarding-frame';
import { ThemedText } from '@/components/themed-text';
import { fadeIn } from '@/constants/motion';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { isValidDob, parseDob } from '@/utils/dob';
import { goBack } from '@/utils/navigation';

/** Whole years since the date of birth. */
function ageFrom(dob: string): number | null {
  const parts = parseDob(dob);
  if (!parts) return null;
  const now = new Date();
  const hadBirthday =
    now.getMonth() + 1 > parts.month || (now.getMonth() + 1 === parts.month && now.getDate() >= parts.day);
  return now.getFullYear() - parts.year - (hadBirthday ? 0 : 1);
}

export default function OnboardingDobScreen() {
  const theme = useTheme();
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [dob, setDob] = useState('');

  // A deep link can land here without a name — send the user back to step one.
  const hasName = !!name?.trim();
  useEffect(() => {
    if (!hasName) router.replace('/onboarding/name');
  }, [hasName]);

  const complete = dob.replace(/\D/g, '').length === 8;
  const isValid = isValidDob(dob);
  const age = isValid ? ageFrom(dob) : null;

  // A full, valid date is a finished answer: a small tick of haptics.
  useEffect(() => {
    if (isValid) haptic.select();
  }, [isValid]);

  const handleNext = async () => {
    if (!isValid || !name) return;
    Keyboard.dismiss();
    // Saved now, so the tour step can never lose them; onboarding itself is
    // marked done on the next step.
    await updateSetting('name', name.trim());
    await updateSetting('dob', dob);
    router.push('/onboarding/tour');
  };

  if (!hasName) return null;

  return (
    <OnboardingFrame
      step={2}
      title="BIRTHDAY"
      subtitle={'WHEN DID YOUR\nSTORY BEGIN?'}
      footnote={'Stays on your phone. We only\never see an age range.'}
      onBack={() => goBack('/onboarding/name')}
      cta={{ text: 'CONTINUE', onPress: handleNext, disabled: !isValid }}
    >
      <DobField value={dob} onChange={setDob} invalid={complete && !isValid} autoFocus />

      {/* One fixed-height line under the field, so it never pushes the layout. */}
      <View style={styles.status}>
        {complete && (
          <Animated.View key={isValid ? 'ok' : 'bad'} entering={fadeIn(220)}>
            <ThemedText style={[styles.statusText, { color: isValid ? theme.textMuted : '#FF3B30' }]}>
              {isValid ? `${age} years of story so far` : 'that date doesn’t exist'}
            </ThemedText>
          </Animated.View>
        )}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  status: {
    height: 20,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
