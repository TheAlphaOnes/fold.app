import React, { useState } from 'react';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';

import { CleanInput } from '@/components/clean-input';
import { OnboardingFrame } from '@/components/onboarding/onboarding-frame';
import { track } from '@/services/analytics';

export default function OnboardingNameScreen() {
  const [name, setName] = useState('');
  const isValid = name.trim().length > 0;

  const handleNext = () => {
    if (!isValid) return;
    Keyboard.dismiss();
    track('onboarding_name_entered', {});
    router.push({ pathname: '/onboarding/dob', params: { name: name.trim() } });
  };

  return (
    <OnboardingFrame
      step={1}
      title="YOUR NAME"
      subtitle={'WHAT SHOULD FOLD\nCALL YOU?'}
      footnote={'Only you see it. Change it\nanytime in settings.'}
      cta={{ text: 'CONTINUE', onPress: handleNext, disabled: !isValid }}
    >
      <CleanInput
        value={name}
        onChangeText={setName}
        hint="type your first name"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={12}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={handleNext}
      />
    </OnboardingFrame>
  );
}
