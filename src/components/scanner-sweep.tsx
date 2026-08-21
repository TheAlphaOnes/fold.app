import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export function ScannerSweep({ color }: { color: string }) {
  const progress = useSharedValue(0);
  
  useEffect(() => {
    progress.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) });
  }, []);

  const lineStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: color,
      top: `${progress.value * 100}%`,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 5,
      opacity: progress.value > 0.95 ? 0 : 1, // Fade out at the very end
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    // The overlay grows from top to bottom following the line
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: `${progress.value * 100}%`,
      backgroundColor: color,
      // The tint starts at 0.15 and fades out completely as the scan finishes
      opacity: (1 - progress.value) * 0.15,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Animated.View style={overlayStyle} />
      <Animated.View style={lineStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 999,
  }
});
