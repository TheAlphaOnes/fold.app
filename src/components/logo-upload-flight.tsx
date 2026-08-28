import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  Easing,
  withDelay,
  withSequence
} from 'react-native-reanimated';
import { Logo } from './logo';

const DATA_PARTICLES = 8;

export function LogoUploadFlight({ color }: { color: string }) {
  const flightY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    // 1. Fade in and scale up subtly at the center
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });

    // 2. HANG in the center so the user sees it, THEN accelerate upwards
    // Changed delay from 150ms to 700ms. Slowed duration from 600ms to 1000ms.
    flightY.value = withDelay(
       700, 
       withTiming(-900, { duration: 1000, easing: Easing.in(Easing.cubic) })
    );
    
    // 3. Fade out as it leaves the top of the screen
    opacity.value = withDelay(
       1300, // Starts fading out late in the flight
       withTiming(0, { duration: 400 })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: flightY.value },
        { scale: scale.value }
      ],
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      zIndex: 10,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Animated.View style={logoStyle}>
        <Logo size={48} color={color} />
      </Animated.View>
      
      {/* Glowing data streams following the logo */}
      {Array.from({ length: DATA_PARTICLES }).map((_, i) => {
        return <DataParticle key={i} index={i} color={color} />;
      })}
    </View>
  );
}

function DataParticle({ index, color }: { index: number, color: string }) {
  const opacity = useSharedValue(0);
  const particleY = useSharedValue(0);
  
  // Randomize the particle's X offset to create a "stream" width
  const offsetX = (Math.random() - 0.5) * 40;
  // Increase base delay so they wait for the logo to start flying (700ms)
  const delay = 700 + (index * 45) + (Math.random() * 30);
  // Randomize length to look like data streams
  const height = 12 + Math.random() * 20;

  useEffect(() => {
    // Fade in and out quickly like a glowing streak
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.8, { duration: 200 }),
      withTiming(0, { duration: 400 })
    ));

    // Follow the same upward trajectory
    particleY.value = withDelay(
      delay,
      withTiming(-900, { duration: 1000, easing: Easing.in(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
      opacity: opacity.value,
      position: 'absolute',
      width: 2,
      height: height,
      borderRadius: 2,
      backgroundColor: color,
      transform: [
        { translateX: offsetX },
        // Start them slightly lower than the logo's center
        { translateY: particleY.value + 40 }
      ],
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
      elevation: 4,
  }));

  return <Animated.View style={style} />;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }
});
