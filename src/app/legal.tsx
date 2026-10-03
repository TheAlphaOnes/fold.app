import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function LegalScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground opacity={0.03} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>LEGAL TERMS</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.heading, { color: theme.text }]}>1. Acceptance of Terms</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          By downloading, accessing, or using Fold, you enter into a binding agreement and accept these Terms of Service in full. If you do not agree to these terms, you must uninstall the application immediately.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>2. User Content & Liability</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          You retain complete ownership over all media, text, and audio ("Content") recorded within Fold. Because Fold relies exclusively on local device storage, you acknowledge that you are solely responsible for backing up your Content. Fold is not liable for data loss due to device damage, uninstallation, or operating system errors.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>3. "As-Is" Provision</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Fold is provided on an "as is" and "as available" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>4. Limitation of Liability</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          To the maximum extent permitted by applicable law, the developers, maintainers, and affiliates of Fold shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the application.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>5. Dispute Resolution</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Any claims or disputes arising out of the use of Fold will be governed by applicable state and federal laws, and shall be resolved exclusively in a court of competent jurisdiction.
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
