import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function UserInfoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSetting } = useSettingsStore();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const handleComplete = async () => {
    Keyboard.dismiss();
    
    // Save user settings
    await updateSetting('name', name.trim() || 'Nollan');
    
    // For dob, if empty we can just save a default placeholder or empty string
    await updateSetting('dob', dob.trim() || '0x4a7B...Cef1');
    
    // Mark as onboarded
    await updateSetting('hasOnboarded', true);
    
    // Route to main app
    router.replace('/');
  };

  const bg = theme.background;
  const fg = theme.text;
  const mutedText = '#878787';
  const border = theme.border;

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <GrainBackground />
          
          <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
            
            <ThemedText style={[styles.title, { color: fg }]}>IDENTIFY</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              ENTER SYSTEM CREDENTIALS
            </ThemedText>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: fg }]}>DISPLAY_NAME</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      color: fg, 
                      borderColor: border,
                      backgroundColor: theme.backgroundElement
                    }
                  ]}
                  placeholder="e.g. Nollan"
                  placeholderTextColor={mutedText}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                  autoCapitalize="words"
                  maxLength={30}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: fg }]}>SYSTEM_ID / DOB</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      color: fg, 
                      borderColor: border,
                      backgroundColor: theme.backgroundElement
                    }
                  ]}
                  placeholder="e.g. 1999.04.12"
                  placeholderTextColor={mutedText}
                  value={dob}
                  onChangeText={setDob}
                  autoCorrect={false}
                  maxLength={30}
                />
                <ThemedText style={[styles.helper, { color: mutedText }]}>
                  Optional. Used for your profile badge.
                </ThemedText>
              </View>
            </View>

            <View style={styles.spacer} />

            <Pressable 
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.submitButton,
                { 
                  backgroundColor: fg,
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
            >
              <Text style={[styles.submitText, { color: bg }]}>COMPLETE SETUP</Text>
              <Check size={20} color={bg} strokeWidth={3} />
            </Pressable>

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
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 32,
    letterSpacing: -1,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 40,
  },
  formContainer: {
    gap: 32,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  input: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  helper: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    marginTop: 4,
  },
  spacer: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 8,
    gap: 12,
  },
  submitText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
