import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  FadeOut, 
  runOnJS,
  useAnimatedStyle,
  withDelay,
  withTiming,
  useSharedValue,
  Easing,
  interpolate
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import { Logo } from '@/components/logo';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

interface AnimatedSplashScreenProps {
  isAppReady: boolean;
  children: React.ReactNode;
}

export function AnimatedSplashScreen({ isAppReady, children }: AnimatedSplashScreenProps) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const opacity = useSharedValue(1);
  const progress = useSharedValue(0);
  
  const { width, height } = useWindowDimensions();
  
  // Position the base of the wave comfortably below the logo
  const baseY = height / 2 + 70;

  // A parametric function allows the path to loop back on itself in X (a cursive loop).
  // We use the elegant phase-shifted base wave, and inject a localized circular motion.
  const getParametricPoint = (t: number) => {
    'worklet';
    // 1. Base sweeping wave (crosses zero at center)
    const base_x = t;
    const base_y = baseY - Math.sin((t / width - 0.5) * Math.PI * 2) * 35;

    // 2. Localized loop slightly to the left of the logo
    const loopCenter = width * 0.35; 
    const dist = t - loopCenter;
    
    // Gaussian envelope for the loop radius so it fades out smoothly.
    const radius = 35 * Math.exp(-Math.pow(dist / 80, 2));

    // The angle spins completely around once, forming the cursive loop.
    const angle = (dist / 120) * Math.PI * 2;

    // Subtracting sine/cosine creates the counter-clockwise loop going backwards in X.
    const x = base_x - Math.sin(angle) * radius;
    const y = base_y - Math.cos(angle) * radius;

    return { x, y };
  };

  const pathData = useMemo(() => {
    let d = '';
    // Use 't' as the parametric time variable, stepping by 2px for high-res curves
    for (let t = -60; t <= width + 60; t += 2) {
      const { x, y } = getParametricPoint(t);
      if (t === -60) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }
    return d;
  }, [width, height, baseY]);

  useEffect(() => {
    if (isAppReady) {
      // Hide the native splash screen immediately, revealing this identical RN component
      SplashScreen.hideAsync().catch(() => {});

      // Launch the traveling dot animation!
      // Make it 2.5 seconds so the user can enjoy the interaction
      progress.value = withTiming(1, { 
        duration: 2500, 
        easing: Easing.inOut(Easing.ease) 
      }, (finished) => {
        if (finished) {
          // Fade out the entire splash screen after the dot crosses
          opacity.value = withTiming(0, { duration: 500 }, (f) => {
            if (f) runOnJS(setIsAnimationComplete)(true);
          });
        }
      });
    }
  }, [isAppReady, opacity, progress]);

  const splashStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    // 't' is our parametric time variable traveling across the screen
    const currentT = interpolate(progress.value, [0, 1], [-60, width + 60]);
    
    // The dot accurately traces the parametric cursive loop!
    const { x, y } = getParametricPoint(currentT);
    
    return {
      transform: [
        { translateX: x - 5 }, // -5 offsets half the 10px width to perfectly center the dot on the line
        { translateY: y - 5 }  // -5 offsets half the 10px height
      ]
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
          {/* 1. Background dashed wavy line */}
          <Svg style={StyleSheet.absoluteFill}>
            <Path 
              d={pathData} 
              stroke="#D1D1D1" 
              strokeWidth="1.5" 
              strokeDasharray="6 6" 
              fill="none" 
            />
          </Svg>

          {/* 2. Traveling technical dot */}
          <Animated.View style={[styles.travelingDot, dotStyle]} />

          {/* 3. Centered logo (keeps handoff from native splash seamless) */}
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
  },
  travelingDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E45B00', // TE Orange
    // Slight shadow to lift it off the line
    shadowColor: '#E45B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  }
});
