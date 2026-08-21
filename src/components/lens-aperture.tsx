import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withSequence, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function LensAperture({ color, onComplete }: { color: string, onComplete?: () => void }) {
  const aperture = useSharedValue(0);

  useEffect(() => {
    // The aperture closes quickly (shutter click) and then opens
    aperture.value = withSequence(
      withSpring(1, { damping: 15, stiffness: 400 }),
      withTiming(0, { duration: 150, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // 0 = fully open (no border), 1 = fully closed (solid circle in middle)
    const size = 800; // Large enough to cover the card
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
      opacity: aperture.value > 0 ? 0.9 : 0,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 999, borderRadius: 24 }]} pointerEvents="none">
      <Animated.View style={animatedStyle} />
    </View>
  );
}
