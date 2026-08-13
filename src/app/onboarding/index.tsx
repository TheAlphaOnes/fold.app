import React from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { TacticalSlider } from '@/components/tactical-slider';

export default function OnboardingStartScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bg = theme.background;
  const fg = theme.text;
  const mutedText = '#878787';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />
      
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        
        {/* Mascot / Logo area */}
        <View style={styles.mascotContainer}>
          <ThemedText style={styles.mascotText}>
{`.-----------.
| .-------. |
| |>_     | |
| '-------' |
|       ( ) |
|   _       |
| _| |_  (B)|
||_   _|(A) |
|  |_|      |
'-----------'`}
          </ThemedText>
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: fg }]}>FOLD</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            YOUR OFFLINE MEMORY ENGINE.
          </ThemedText>
          <ThemedText style={[styles.description, { color: mutedText }]}>
            A brutalist canvas for thoughts, visuals, and sounds. 
            Everything stays on your device. Zero cloud. Zero tracking.
          </ThemedText>
        </View>

        <View style={styles.spacer} />

        {/* CTA Button */}
        <TacticalSlider 
          text="INITIALIZE" 
          onConfirm={() => router.push('/onboarding/name')} 
        />

      </View>
    </View>
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
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 40,
  },
  mascotText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 16,
    color: '#878787',
    textAlign: 'left',
  },
  textContainer: {
    gap: 16,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 48,
    letterSpacing: -2,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 16,
    letterSpacing: 2,
  },
  description: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  spacer: {
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 8,
    gap: 12,
  },
  ctaText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: 2,
  },
});
