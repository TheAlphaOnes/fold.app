import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AddButton } from '@/components/add-button';

export default function OnboardingGuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSetting } = useSettingsStore();
  
  const [phase, setPhase] = useState(1);

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSetting('hasOnboarded', true);
    router.replace('/');
  };

  const handleAction = (action: 'tap' | 'hold' | 'swipe') => {
    if (phase === 1 && action === 'tap') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setPhase(2);
    } else if (phase === 2 && action === 'hold') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setPhase(3);
    } else if (phase === 3 && action === 'swipe') {
      handleComplete();
    } else {
      // Wrong action for the current phase
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const bg = theme.background;
  const fg = theme.text;
  const mutedText = '#878787';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />
      
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.textContainer}>
          {phase === 1 && (
            <Animated.View key="phase1" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: fg }]}>PHASE 1</ThemedText>
              <ThemedText style={[styles.instruction, { color: fg }]}>
                tap to write.
              </ThemedText>
            </Animated.View>
          )}
          
          {phase === 2 && (
            <Animated.View key="phase2" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: fg }]}>PHASE 2</ThemedText>
              <ThemedText style={[styles.instruction, { color: fg }]}>
                press and hold to record.
              </ThemedText>
            </Animated.View>
          )}

          {phase === 3 && (
            <Animated.View key="phase3" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: fg }]}>PHASE 3</ThemedText>
              <ThemedText style={[styles.instruction, { color: fg }]}>
                swipe up to capture.
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Demo Add Button */}
        <Animated.View 
          entering={FadeIn.delay(400).duration(800)}
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <AddButton 
            onPress={() => handleAction('tap')} 
            onSwipeUp={() => handleAction('swipe')}
            onLongPressStart={() => handleAction('hold')}
            onLongPressEnd={() => {}}
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
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -100, // visually center it above the button
  },
  phaseBlock: {
    alignItems: 'center',
    position: 'absolute',
  },
  phaseTitle: {
    fontFamily: 'BitcountGridDouble-Regular',
    fontSize: 14,
    letterSpacing: 4,
    marginBottom: 16,
    opacity: 0.5,
  },
  instruction: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    lineHeight: 36,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    zIndex: 999,
    alignItems: 'center',
  },
});
