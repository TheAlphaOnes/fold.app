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

/** Scrim behind the flight; black in both themes so the badge and streaks always stand out. */
const SCRIM_OPACITY = 0.5;
/** The bird and its streaks: white on the dim, with a soft glow. */
const INK = '#FFFFFF';

const DATA_PARTICLES = 8;

/**
 * LogoUploadFlight — the bird that carries a shared card away.
 *
 * It reads over any photo or the list because the screen dims briefly and
 * the bird flies in white with a soft glow, the same in both themes. Three
 * clocks: the dim settles first, the bird scales in and hangs, then it
 * accelerates off the top trailing streaks while the dim clears.
 */
export function LogoUploadFlight() {
  const scrim = useSharedValue(0);
  const flightY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scrim.value = withSequence(
      withTiming(SCRIM_OPACITY, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withDelay(1050, withTiming(0, { duration: 380 })),
    );
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
      zIndex: 10,
    };
  });
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />

      <Animated.View style={[styles.bird, logoStyle]}>
        <Logo size={72} color={INK} />
      </Animated.View>

      {/* Streaks trailing the bird. */}
      {Array.from({ length: DATA_PARTICLES }).map((_, i) => {
        return <DataParticle key={i} index={i} color={INK} />;
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
  },
  scrim: {
    backgroundColor: '#000',
  },
  bird: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
});
