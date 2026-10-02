import React, { useState } from 'react';
import { StyleSheet, View, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ActionLink } from '@/components/action-link';
import { CleanInput } from '@/components/clean-input';
import { AsciiArt } from '@/components/ascii-art';
import { MASTER_SWORD_ART } from '@/constants/ascii-art';

export default function OnboardingNameScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);

  const isValid = name.trim().length > 0;

  const handleNext = () => {
    Keyboard.dismiss();
    if (!isValid) {
      setShowError(true);
      return;
    }
    router.push({
      pathname: '/onboarding/dob',
      params: { name: name.trim() }
    });
  };

  const handleChangeText = (text: string) => {
    setName(text);
    setShowError(false);
  };

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

            {/* Easter Egg ASCII: Master Sword */}
            <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.asciiContainer}>
              <AsciiArt art={MASTER_SWORD_ART} color={mutedText} fontSize={14} />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.centerSection}>
              <View style={styles.header}>
                <ThemedText style={[styles.title, { color: fg }]}>IDENTIFY</ThemedText>
                <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                  WHAT IS YOUR DESIGNATION?
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <CleanInput
                  value={name}
                  onChangeText={handleChangeText}
                  placeholder="NOLLAN"
                  autoCapitalize="characters"
                  maxLength={12}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                {showError && !isValid && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <ThemedText style={[styles.errorText, { color: '#FF3B30' }]}>
                      DESIGNATION REQUIRED
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            <View style={styles.bottomSpacer} />

            <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.ctaContainer}>
              <ActionLink 
                text="CONTINUE" 
                onPress={handleNext}
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
