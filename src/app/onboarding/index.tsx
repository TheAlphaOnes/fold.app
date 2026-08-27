import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';

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
        
        <View style={styles.topSpacer} />

        {/* Easter Egg ASCII: Retro Controller */}
        <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.mascotContainer}>
          <ThemedText style={[styles.mascotText, { color: fg }]}>
{`  +--------------------+
  |   +             _  |
  | + + +    ;;    ( ) |
  |   +      ;;   _    |
  |              ( )   |
  +--------------------+`}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: fg }]}>FOLD</ThemedText>
          <ThemedText style={[styles.description, { color: mutedText }]}>
            OFFLINE MEMORY ENGINE
          </ThemedText>
        </Animated.View>

        <View style={styles.bottomSpacer} />

        {/* Minimalist CTA Link */}
        <Animated.View entering={FadeInUp.delay(600).duration(800).springify()} style={styles.ctaContainer}>
          <ActionLink 
            text="INITIALIZE" 
            onPress={() => router.push('/onboarding/name')} 
          />
        </Animated.View>
        
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
    alignItems: 'center',
  },
  topSpacer: {
    flex: 1,
  },
  bottomSpacer: {
    flex: 1.5,
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
  },
  title: {
    fontFamily: 'BitcountGridDouble-Regular',
    fontSize: 48,
    lineHeight: 64,
    letterSpacing: 8,
    marginLeft: 8,
  },
  description: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 8,
  },
  ctaContainer: {
    marginBottom: 60,
  }
});
