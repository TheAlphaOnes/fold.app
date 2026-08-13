import React from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ActionLink } from '@/components/action-link';

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
      
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        
        {/* Easter Egg ASCII: Retro Controller */}
        <View style={styles.mascotContainer}>
          <ThemedText style={[styles.mascotText, { color: fg }]}>
{`  +--------------------+
  |   +             _  |
  | + + +    ;;    ( ) |
  |   +      ;;   _    |
  |              ( )   |
  +--------------------+`}
          </ThemedText>
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: fg }]}>FOLD</ThemedText>
          <ThemedText style={[styles.description, { color: mutedText }]}>
            OFFLINE MEMORY ENGINE
          </ThemedText>
        </View>

        {/* Minimalist CTA Link */}
        <View style={styles.ctaContainer}>
          <ActionLink 
            text="INITIALIZE" 
            onPress={() => router.push('/onboarding/name')} 
          />
        </View>

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
    alignItems: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mascotText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 48,
    letterSpacing: 8,
    marginLeft: 8, // Optical compensation for letterSpacing
  },
  description: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 8,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 60,
  }
});
