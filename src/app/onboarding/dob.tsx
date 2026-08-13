import React, { useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ActionLink } from '@/components/action-link';
import { CleanInput } from '@/components/clean-input';

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
          
          <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            
            {/* Easter Egg ASCII: Robot */}
            <View style={styles.asciiContainer}>
              <ThemedText style={[styles.asciiText, { color: mutedText }]}>
{`  .-------.
  |  o o  |
  |   ^   |
  |  ___  |
  '-------'`}
              </ThemedText>
            </View>

            <View style={styles.centerSection}>
              <View style={styles.header}>
                <ThemedText style={[styles.title, { color: fg }]}>ACTIVATION</ThemedText>
                <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                  DATE OF BIRTH
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <CleanInput
                  value={dob}
                  onChangeText={formatDOB}
                  placeholder="DD.MM.YYYY"
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.ctaContainer}>
              <ActionLink 
                text="INITIALIZE SYSTEM" 
                onPress={handleComplete} 
              />
            </View>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  asciiContainer: {
    position: 'absolute',
    top: 100,
    alignItems: 'center',
    width: '100%',
  },
  asciiText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
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
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 32,
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
    position: 'absolute',
    bottom: 60,
  },
});
