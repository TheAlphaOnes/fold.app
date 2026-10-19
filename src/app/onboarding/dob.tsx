import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ActionLink } from '@/components/action-link';
import { CleanInput } from '@/components/clean-input';
import { formatDobInput, getAgeRange, isValidDob } from '@/utils/dob';
import { AsciiArt } from '@/components/ascii-art';
import { haptic } from '@/services/haptics';
import { track } from '@/services/analytics';

export default function OnboardingDobScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSetting } = useSettingsStore();
  const params = useLocalSearchParams();
  const providedName = params.name as string | undefined;

  const [dob, setDob] = useState('');

  // A deep link can land here without a name — send the user back to step one.
  useEffect(() => {
    if (!providedName || !providedName.trim()) {
      router.replace('/onboarding/name');
    }
  }, [providedName]);

  const isValid = isValidDob(dob);
  const hasFullDigits = dob.replace(/\D/g, '').length === 8;
  const errorText = hasFullDigits ? 'INVALID DATE' : 'ENTER FULL DATE - DD.MM.YYYY';

  const handleComplete = async () => {
    Keyboard.dismiss();
    if (!isValid || !providedName) return;

    haptic.success();
    await updateSetting('name', providedName);
    await updateSetting('dob', dob);
    await updateSetting('hasOnboarded', true);
    track('onboarding_completed', { age_range: getAgeRange(dob) });

    router.replace('/');
  };

  const handleChangeText = (text: string) => {
    setDob(formatDobInput(text));
  };

  // Waiting on the redirect above — render nothing rather than flash a
  // form that has no name to save.
  if (!providedName || !providedName.trim()) {
    return null;
  }

  const bg = theme.background;
  const fg = theme.text;
  const mutedText = '#878787';

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <GrainBackground />
          
          <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            
            <View style={styles.topSpacer} />

            

            <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.centerSection}>
              <View style={styles.header}>
                <ThemedText style={[styles.title, { color: fg }]}>ORIGIN</ThemedText>
                <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                  WHEN DID YOUR STORY BEGIN?
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <CleanInput
                  value={dob}
                  onChangeText={handleChangeText}
                  placeholder="DD.MM.YYYY"
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
                {dob.length > 0 && !isValid && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <ThemedText style={[styles.errorText, { color: '#FF3B30' }]}>
                      {errorText}
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            <View style={styles.bottomSpacer} />

            <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.ctaContainer}>
              <ActionLink 
                text="CONTINUE" 
                onPress={handleComplete}
                disabled={!isValid}
              />
            </Animated.View>

          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topSpacer: {
    flex: 1,
  },
  bottomSpacer: {
    flex: 1.5,
  },
  asciiContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  centerSection: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 32,
    lineHeight: 44,
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
  },
  errorText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ctaContainer: {
    marginBottom: 60,
  },
});
