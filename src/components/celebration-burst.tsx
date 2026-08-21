import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';

interface CelebrationBurstProps {
  color: string;
  onComplete?: () => void;
}

export function CelebrationBurst({ color, onComplete }: CelebrationBurstProps) {
  const progress = useSharedValue(0);
  
  useEffect(() => {
    progress.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.cubic) 
    }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });
  }, []);

  const particles = Array.from({ length: 12 });
  const distance = 140; // Burst radius

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
       {particles.map((_, i) => {
          const angle = (i / particles.length) * Math.PI * 2;
          
          const style = useAnimatedStyle(() => {
             const dist = (0.2 + progress.value * 0.8) * distance;
             return {
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: color,
                opacity: 1 - progress.value,
                transform: [
                   { translateX: Math.cos(angle) * dist },
                   { translateY: Math.sin(angle) * dist },
                   { scale: 1 - progress.value }
                ]
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
