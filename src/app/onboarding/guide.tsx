import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AddButton } from '@/components/add-button';

// ─── Success flash overlay ────────────────────────────────────────────────────
// A brief full-screen flash + scale pop on the check mark that fires when a
// phase is completed, giving the user clear positive feedback before advancing.
function SuccessFlash({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Kick off the animation immediately on mount
  const run = useCallback(() => {
    // Flash overlay in
    overlayOpacity.value = withSequence(
      withTiming(0.18, { duration: 80 }),
      withDelay(260, withTiming(0, { duration: 220 }))
    );
    // Check mark spring-pops in then fades out, then calls onDone
    opacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withDelay(300, withTiming(0, { duration: 200, }, () => runOnJS(onDone)()))
    );
    scale.value = withSequence(
      withSpring(1, { damping: 10, stiffness: 260 }),
      withDelay(300, withTiming(0.6, { duration: 200 }))
    );
  }, []);

  React.useEffect(() => { run(); }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <>
      {/* dim flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }, overlayStyle]}
        pointerEvents="none"
      />
      {/* check mark */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flashCenter]} pointerEvents="none">
        <Animated.View style={[styles.checkCircle, { backgroundColor: theme.text }, checkStyle]}>
          <ThemedText style={[styles.checkMark, { color: theme.background }]}>✓</ThemedText>
        </Animated.View>
      </Animated.View>
    </>
  );
}

export default function OnboardingGuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSetting } = useSettingsStore();

  const [phase, setPhase] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<number | null>(null);

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSetting('hasOnboarded', true);
    router.replace('/');
  };

  const advancePhase = useCallback(() => {
    setShowSuccess(false);
    if (pendingPhase !== null) {
      if (pendingPhase === 4) {
        handleComplete();
      } else {
        setPhase(pendingPhase);
        setPendingPhase(null);
      }
    }
  }, [pendingPhase]);

  const handleAction = (action: 'tap' | 'hold' | 'swipe') => {
    const correctAction =
      (phase === 1 && action === 'tap') ||
      (phase === 2 && action === 'hold') ||
      (phase === 3 && action === 'swipe');

    if (correctAction) {
      // Strong success haptics: two pulses, staggered
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 90);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 180);

      const next = phase + 1;
      setPendingPhase(next); // will be consumed after success flash
      setShowSuccess(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const bg = theme.background;
  const fg = theme.text;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />

      {showSuccess && <SuccessFlash onDone={advancePhase} />}

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

  // ── Success flash ──────────────────────────────────────────────────────────
  flashCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 34,
    lineHeight: 38,
  },
});
