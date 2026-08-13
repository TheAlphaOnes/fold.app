import React, { useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { TerminalButton } from '@/components/terminal-button';

export default function OnboardingDobScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSetting } = useSettingsStore();
  const params = useLocalSearchParams();
  const providedName = (params.name as string) || 'Nollan';

  const [dob, setDob] = useState('');

  const formatDOB = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 4)}.${cleaned.slice(4, 8)}`;
    }
    
    setDob(formatted);
  };

  const handleComplete = async () => {
    Keyboard.dismiss();
    
    // Save both values
    await updateSetting('name', providedName);
    
    // If empty, generate a fallback hex ID like '0x4a7B...Cef1'
    const finalDob = dob.trim() || '0x4a7B...Cef1';
    await updateSetting('dob', finalDob);
    
    // Mark as onboarded
    await updateSetting('hasOnboarded', true);
    
    // Route to main app
    router.replace('/');
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
              <ThemedText style={[styles.title, { color: fg }]}>ACTIVATION</ThemedText>
              <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                ENTER YOUR DATE OF BIRTH
              </ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { color: fg }]}
                placeholder="DD.MM.YYYY"
                placeholderTextColor={mutedText}
                value={dob}
                onChangeText={formatDOB}
                keyboardType="number-pad"
                maxLength={10} // DD.MM.YYYY = 10 chars
                autoFocus
                selectionColor={theme.accentWarm}
              />
              <View style={[styles.inputUnderline, { backgroundColor: fg }]} />
            </View>

            <View style={styles.spacer} />

            <TerminalButton 
              text="INITIALIZE SYSTEM" 
              onPress={handleComplete} 
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
    fontSize: 38,
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
    letterSpacing: 4,
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
