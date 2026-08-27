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

export default function OnboardingNameScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const handleNext = () => {
    Keyboard.dismiss();
    router.push({
      pathname: '/onboarding/dob',
      params: { name: name.trim() || 'Nollan' }
    });
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
              <ThemedText style={[styles.asciiText, { color: mutedText }]}>
{`o=={::::::::::>`}
              </ThemedText>
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
                  onChangeText={setName}
                  placeholder="NOLLAN"
                  autoCapitalize="characters"
                  maxLength={12}
                  autoFocus
                />
              </View>
            </Animated.View>

            <View style={styles.bottomSpacer} />

            <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.ctaContainer}>
              <ActionLink 
                text="CONTINUE" 
                onPress={handleNext} 
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
  asciiText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    letterSpacing: 0,
    textAlign: 'center',
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
  ctaContainer: {
    marginBottom: 60,
  },
});
