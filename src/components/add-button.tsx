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
}

export function AddButton({ onPress }: AddButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const fireHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const firePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

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
    })
    .onEnd(() => {
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 0.6,
      });
      runOnJS(firePress)();
    });

  const composedGesture = Gesture.Race(tapGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
