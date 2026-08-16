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
        <ThemedText style={[styles.heading, { color: theme.text }]}>1. Terms of Use</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          By using Fold, you agree to these terms. Fold is provided "as is", without warranty of any kind, express or implied.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>2. User Content</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          You retain all rights to any content you create using Fold. We do not claim ownership of your memories, media, or entries. Since data is stored locally, you are solely responsible for backing up your content.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>3. Limitation of Liability</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          In no event shall the developers of Fold be liable for any claim, damages, or other liability arising from the use of the app or loss of data.
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
