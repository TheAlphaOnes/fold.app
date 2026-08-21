import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';

export function LensAperture({ color, onComplete }: { color: string, onComplete?: () => void }) {
  const aperture = useSharedValue(0);

  useEffect(() => {
    // 1. Snap closed fast (120ms, no bounce)
    // 2. Fire onComplete the instant the iris is fully shut — screen transitions behind it
    // 3. Flash back open (80ms) — user already sees the new screen
    aperture.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      }),
      withTiming(0, { duration: 80, easing: Easing.in(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const size = 800;
    const borderWidth = aperture.value * (size / 2);
    return {
      position: 'absolute',
      width: size,
      height: size,
      top: '50%',
      left: '50%',
      marginTop: -size / 2,
      marginLeft: -size / 2,
      borderRadius: size / 2,
      borderColor: color,
      borderWidth: borderWidth,
      opacity: aperture.value > 0 ? 0.85 : 0,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 999, borderRadius: 24 }]} pointerEvents="none">
      <Animated.View style={animatedStyle} />
    </View>
  );
}
