import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
  const [isSuccess, setIsSuccess] = useState(false);

  // Quick scale bump for the text to make it feel tactile
  const textScale = useSharedValue(1);

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSetting('hasOnboarded', true);
    router.replace('/');
  };

  const handleAction = (action: 'tap' | 'hold' | 'swipe') => {
    if (isSuccess) return; // prevent spamming

    const correctAction =
      (phase === 1 && action === 'tap') ||
      (phase === 2 && action === 'hold') ||
      (phase === 3 && action === 'swipe');

    if (correctAction) {
      // Systemic, fast haptics
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), 60);

      // Trigger visual success state
      setIsSuccess(true);
      
      // Sharp, mechanical scale pop
      textScale.value = withSequence(
        withTiming(0.92, { duration: 50 }),
        withTiming(1, { duration: 150 })
      );

      // Advance after brief pause
      setTimeout(() => {
        setIsSuccess(false);
        if (phase === 3) {
          handleComplete();
        } else {
          setPhase(phase + 1);
        }
      }, 400);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const bg = theme.background;
  const fg = theme.text;
  const accent = '#FF4B00'; // System accent color

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
  }));

  const renderInstruction = (text: string) => {
    if (isSuccess) {
      return (
        <Animated.View style={animatedTextStyle}>
          <ThemedText style={[styles.instruction, { color: accent, fontFamily: 'JetBrainsMono-Bold' }]}>
            [ ACCEPTED ]
          </ThemedText>
        </Animated.View>
      );
    }
    return (
      <Animated.View style={animatedTextStyle}>
        <ThemedText style={[styles.instruction, { color: fg }]}>
          {text}
        </ThemedText>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.textContainer}>
          {phase === 1 && (
            <Animated.View key="phase1" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 1</ThemedText>
              {renderInstruction('tap to write.')}
            </Animated.View>
          )}

          {phase === 2 && (
            <Animated.View key="phase2" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 2</ThemedText>
              {renderInstruction('press and hold to record.')}
            </Animated.View>
          )}

          {phase === 3 && (
            <Animated.View key="phase3" entering={SlideInRight} exiting={SlideOutLeft} style={styles.phaseBlock}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 3</ThemedText>
              {renderInstruction('swipe up to capture.')}
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
    marginTop: -100,
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
