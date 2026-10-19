import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { goBack } from '@/utils/navigation';

export default function PrivacyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground opacity={0.03} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>PRIVACY POLICY</ThemedText>
        <Pressable 
          onPress={() => goBack()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.heading, { color: theme.text }]}>1. Local Storage First</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Fold is architected with a strict privacy-by-design approach. All of your memories, journal entries, audio recordings, and media are stored securely and exclusively on your local device storage. We do not transmit, access, or store any of your generated content on our servers.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>2. Telemetry and Usage Data</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          To keep Fold stable and learn what helps, we collect anonymous usage data via PostHog. That covers crash reports, which screens are opened, and how features are used: for example that a memory was saved, whether it held text, a photo or a voice note, roughly how long the text was, and the time of day. It also covers your streak and ink totals, which reminder wording was tapped, and your settings choices.{'\n\n'}
          We also collect an age bracket derived from your date of birth (e.g. "18-24"), and the region, language and timezone your phone is set to. PostHog also estimates country and city from your connection.{'\n\n'}
          We never collect what you write or capture: no memory text, photos, audio, place names, story titles, your name, or your date of birth. There are no accounts, and your device is identified only by a random ID. You can turn this off at any time in Settings → Share Usage Data.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>3. Third-Party Integrations</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          We utilize the Apple iTunes Search API strictly to facilitate the music tagging features within the app. Search queries made in the music picker are routed to Apple's servers. No internal journal data is ever attached to these external requests.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>4. Children's Privacy</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Fold is not directed towards children under the age of 13. By utilizing the demographic bucket features (Date of Birth verification), we actively avoid profiling or collecting data from underage users.
        </ThemedText>
        
        <ThemedText style={[styles.heading, { color: theme.text }]}>5. Policy Updates</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          We reserve the right to modify this privacy policy at any time. Material changes will be communicated via in-app notifications.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 21, paddingBottom: 21 },
  title: { fontFamily: 'JetBrainsMono-Bold', fontSize: 18, letterSpacing: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 21, paddingBottom: 40 },
  heading: { fontFamily: 'JetBrainsMono-Bold', fontSize: 14, letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  paragraph: { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, lineHeight: 22, letterSpacing: -0.2 }
});
