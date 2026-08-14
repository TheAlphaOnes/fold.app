import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function FeedbackScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    
    setStatus('submitting');
    
    // Simulate network delay for UX
    setTimeout(() => {
      posthog?.capture('user_feedback', { text: feedback.trim() });
      setStatus('success');
      
      // Auto close after success
      setTimeout(() => {
        router.back();
      }, 2000);
    }, 800);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <GrainBackground opacity={0.03} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>FEEDBACK</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {status === 'success' ? (
          <View style={styles.successState}>
            <View style={[styles.successIcon, { backgroundColor: theme.text }]}>
              <Check size={32} color={theme.background} />
            </View>
            <ThemedText style={[styles.successTitle, { color: theme.text }]}>THANK YOU</ThemedText>
            <ThemedText style={[styles.successText, { color: theme.textMuted }]}>
              Your feedback has been submitted.
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText style={[styles.description, { color: theme.textMuted }]}>
              Found a bug? Have a feature request? Let us know! Your feedback helps shape the future of Fold.
            </ThemedText>
            
            <TextInput
              style={[
                styles.input, 
                { 
                  color: theme.text, 
                  borderColor: theme.border, 
                  backgroundColor: theme.backgroundElement 
                }
              ]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <Pressable
              onPress={handleSubmit}
              disabled={!feedback.trim() || status === 'submitting'}
              style={({ pressed }) => [
                styles.submitBtn,
                { 
                  backgroundColor: !feedback.trim() ? theme.border : theme.text,
                  opacity: pressed ? 0.8 : 1 
                }
              ]}
            >
              {status === 'submitting' ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText style={[styles.submitBtnText, { color: theme.background }]}>
                  SUBMIT
                </ThemedText>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 21,
    paddingBottom: 21,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 18,
    letterSpacing: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 21,
    paddingBottom: 40,
    flex: 1,
  },
  description: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 24,
  },
  input: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 200,
    marginBottom: 24,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 8,
  },
  successText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
  }
});
