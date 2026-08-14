import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function PrivacyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground opacity={0.03} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>PRIVACY POLICY</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.heading, { color: theme.text }]}>1. Data Collection</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Fold is designed with privacy as a core principle. All of your memories, media, and journal entries are stored entirely locally on your device. We do not have access to your personal data.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>2. Analytics & Telemetry</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          To help us improve Fold, we collect anonymous usage data and crash reports using PostHog. This data includes screen views, feature usage (like when a memory is created or shared), and stack traces for app crashes. This data is strictly anonymous and cannot be traced back to your personal identity or your journal contents. You can opt out of non-essential analytics in the Settings menu.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>3. Third-Party Services</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          We use the iTunes Search API to provide music search functionality. When you search for music, your query (and your device's region code) is sent directly to Apple's servers to retrieve results.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>4. Changes</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          We may update this Privacy Policy from time to time. Any changes will be reflected in the app.
        </ThemedText>
      </ScrollView>
    </View>
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
  },
  heading: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
  }
});
