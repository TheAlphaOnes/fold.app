import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function FAQScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground opacity={0.03} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>FAQ & GESTURES</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.heading, { color: theme.text }]}>1. Creating Memories</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>TAP</ThemedText> the Add Button to write a text memory.{'\n'}
          <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>HOLD</ThemedText> the Add Button to instantly record a voice memo.{'\n'}
          <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>SWIPE UP</ThemedText> on the Add Button to capture a photo or video.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>2. Viewing & Interacting</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>DOUBLE TAP</ThemedText> any memory card on your timeline to open it in full-screen mode.{'\n'}
          <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>LONG PRESS</ThemedText> any memory card to instantly export and share it as an image.{'\n'}
          In Canvas Mode, <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>HOLD</ThemedText> a sticker to drag it, and <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold' }}>PINCH</ThemedText> to resize it.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>3. Stories</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          You can create Stories (like "Japan Trip 2026") from your Profile page and attach memories to them. When viewing a specific memory, use the 'Book' icon to tag it to a story.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>4. Timeline Modes</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          In Settings, you can switch between Yearly, Monthly, or Infinite timeline modes to change how your memories are grouped on the home screen.
        </ThemedText>

        <ThemedText style={[styles.heading, { color: theme.text }]}>5. Data & Privacy</ThemedText>
        <ThemedText style={[styles.paragraph, { color: theme.text }]}>
          Fold is completely local. Your memories never leave your device unless you share them. We recommend using your phone's built-in backup features to keep them safe.
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
