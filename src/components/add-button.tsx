import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';

interface AddButtonProps {
  onPress: () => void;
  onSwipeUp?: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

export function AddButton({ onPress, onSwipeUp, onLongPressStart, onLongPressEnd }: AddButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const fireHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const firePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const fireSwipeUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onSwipeUp) onSwipeUp();
  }, [onSwipeUp]);

  const fireLongPressStart = useCallback(() => {
    if (onLongPressStart) onLongPressStart();
  }, [onLongPressStart]);

  const fireLongPressEnd = useCallback(() => {
    if (onLongPressEnd) onLongPressEnd();
  }, [onLongPressEnd]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withTiming(0.938, { duration: 80 });
      runOnJS(fireHaptic)();
    })
    .onFinalize((_, success) => {
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 0.6,
      });

      if (success) {
        runOnJS(firePress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      scale.value = withSpring(0.854, {
        damping: 10,
        stiffness: 160,
      });
      runOnJS(fireHaptic)();
      runOnJS(fireLongPressStart)();
    })
    .onEnd(() => {
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 0.6,
      });
      runOnJS(fireLongPressEnd)();
    });

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8]) // Activate only on vertical movement
    .onUpdate((e) => {
      if (e.translationY < 0) {
        // Hard clamp at -50px with diminishing resistance beyond -30px
        const raw = e.translationY;
        const CLAMP = -50;
        const EASE_START = -30;
        if (raw > EASE_START) {
          translateY.value = raw;
        } else {
          // Rubber-band effect: moves slower after EASE_START
          translateY.value = EASE_START + (raw - EASE_START) * 0.3;
        }
        // Hard floor
        if (translateY.value < CLAMP) translateY.value = CLAMP;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -50) {
        runOnJS(fireSwipeUp)();
      }
      // Crisp snap back
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 400,
        mass: 0.4,
      });
    });

  const composedGesture = Gesture.Race(tapGesture, longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: theme.accentWarm },
          animatedStyle,
        ]}
      >
        <DiagonalStripes color="#863800" opacity={1} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '38.2%',
    height: 34,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#000000',
    overflow: 'hidden', // Clip stripes to rounded corners
    justifyContent: 'center',
    alignItems: 'center',

    // Align center
    alignSelf: 'center',
  },
});
