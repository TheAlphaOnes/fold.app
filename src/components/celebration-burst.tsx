import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';

interface CelebrationBurstProps {
  color: string;
  onComplete?: () => void;
}

export function CelebrationBurst({ color, onComplete }: CelebrationBurstProps) {
  const progress = useSharedValue(0);
  
  useEffect(() => {
    // Trigger the burst snappier (300ms scroll delay + 100ms)
    progress.value = withDelay(
      400, 
      withTiming(1, { 
        duration: 1400, // Fluid majestic burst
        easing: Easing.out(Easing.cubic) 
      }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const particles = Array.from({ length: 12 });
  const distance = 180; // Larger burst radius so it extends beautifully beyond the card

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
       {particles.map((_, i) => {
          const angle = (i / particles.length) * Math.PI * 2;
          
          const style = useAnimatedStyle(() => {
             const dist = (0.2 + progress.value * 0.8) * distance;
             
             // Invisible at 0 (during the delay), flashes to 1 immediately as it starts, fades to 0 as it expands
             const opacity = interpolate(
               progress.value,
               [0, 0.01, 1],
               [0, 1, 0],
               Extrapolation.CLAMP
             );

             return {
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: color,
                opacity,
                transform: [
                   { translateX: Math.cos(angle) * dist },
                   { translateY: Math.sin(angle) * dist },
                   { scale: 1 - progress.value }
                ],
                // Adds a beautiful light glow to the particles
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 10,
                elevation: 4,
             };
          });
          return <Animated.View key={i} style={style} />;
       })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', 
    justifyContent: 'center', 
    pointerEvents: 'none', 
    zIndex: 999 
  }
});
