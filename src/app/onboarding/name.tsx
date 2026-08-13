import React, { useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { TerminalButton } from '@/components/terminal-button';

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
          
          <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
            
            <View style={styles.header}>
              <ThemedText style={[styles.title, { color: fg }]}>IDENTIFY</ThemedText>
              <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                WHAT IS YOUR DESIGNATION?
              </ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { color: fg }]}
                placeholder="Nollan"
                placeholderTextColor={mutedText}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                autoCapitalize="words"
                maxLength={30}
                autoFocus
                selectionColor={theme.accentWarm}
              />
              <View style={[styles.inputUnderline, { backgroundColor: fg }]} />
            </View>

            <View style={styles.spacer} />

            <TerminalButton 
              text="CONTINUE" 
              onPress={handleNext} 
            />

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
  },
  header: {
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 42,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 32,
    paddingVertical: 16,
    textAlign: 'center',
  },
  inputUnderline: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    opacity: 0.1,
  },
  spacer: {
    flex: 1,
  },
});
