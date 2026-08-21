import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Logo } from './logo';

export function LogoStamp({ color }: { color: string }) {
  const scale = useSharedValue(3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(0.85, { duration: 100 });
    scale.value = withSpring(1.2, { damping: 14, stiffness: 350 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Animated.View style={animatedStyle}>
        <Logo size={140} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }
});
