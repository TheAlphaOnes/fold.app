import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function DigitalAshOverlay({ color, onComplete }: { color: string, onComplete: () => void }) {
  const { height, width } = useWindowDimensions();
  const scanlineY = useSharedValue(height);
  const fadeOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Initial haptic thud
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // 2. Scanline sweeps up, taking 800ms
    scanlineY.value = withTiming(-100, { duration: 800, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });

    // 3. Screen dims globally behind the line
    fadeOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) });

    // 4. Trail of haptics as it deletes
    let hapticCount = 0;
    const interval = setInterval(() => {
      hapticCount++;
      if (hapticCount > 5) {
        clearInterval(interval);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const scanlineStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      width: width,
      height: 2,
      backgroundColor: '#FFFFFF', // high contrast scanline
      top: scanlineY.value,
      shadowColor: '#FFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 5,
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      width: width,
      height: height,
      top: scanlineY.value + 2, // Follow exactly behind the scanline
      backgroundColor: color, // Covers the memory with the background color
      opacity: fadeOpacity.value,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
      {/* The fill that covers the screen from the bottom up */}
      <Animated.View style={fillStyle} />
      
      {/* The scanline */}
      <Animated.View style={scanlineStyle} />
      
      {/* The Ash Particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <AshParticle key={i} index={i} color={color === '#0F0F0F' ? '#FFF' : '#000'} scanlineY={scanlineY} screenHeight={height} screenWidth={width} />
      ))}
    </View>
  );
}

function AshParticle({ index, color, scanlineY, screenHeight, screenWidth }: { index: number, color: string, scanlineY: Animated.SharedValue<number>, screenHeight: number, screenWidth: number }) {
  const x = Math.random() * screenWidth;
  const initialY = screenHeight * (0.1 + Math.random() * 0.9);
  
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(initialY);

  useEffect(() => {
    // We roughly estimate when the scanline will pass this particle based on its initialY
    // Since scanline goes from height to -100 over 800ms
    const totalDistance = screenHeight + 100;
    const distanceToParticle = screenHeight - initialY;
    const timeToReach = (distanceToParticle / totalDistance) * 800;

    opacity.value = withDelay(
      timeToReach,
      withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 400 + Math.random() * 300 })
      )
    );

    translateY.value = withDelay(
      timeToReach,
      withTiming(initialY - (50 + Math.random() * 100), { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: translateY.value,
    width: 2,
    height: 6 + Math.random() * 8,
    backgroundColor: color,
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}
