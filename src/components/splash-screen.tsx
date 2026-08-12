import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  FadeOut, 
  runOnJS,
  useAnimatedStyle,
  withDelay,
  withTiming,
  useSharedValue,
  Easing
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { Logo } from '@/components/logo';

interface AnimatedSplashScreenProps {
  isAppReady: boolean;
  children: React.ReactNode;
}

export function AnimatedSplashScreen({ isAppReady, children }: AnimatedSplashScreenProps) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isAppReady) {
      // Hide the native splash screen immediately, revealing this identical RN component
      SplashScreen.hideAsync().catch(() => {});

      // Hold for a moment to let the user see the seamless handoff, then fade out
      opacity.value = withDelay(
        500, // hold for 500ms
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }, (finished) => {
          if (finished) {
            runOnJS(setIsAnimationComplete)(true);
          }
        })
      );
    }
  }, [isAppReady, opacity]);

  const splashStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {children}
      
      {!isAnimationComplete && (
        <Animated.View 
          style={[styles.splashScreen, splashStyle]} 
          pointerEvents="none"
        >
          <Logo size={76} color="#151419" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FBFBFB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it sits above the entire app
  }
});
