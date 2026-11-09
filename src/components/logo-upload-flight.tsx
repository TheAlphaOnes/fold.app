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
const SCRIM_OPACITY = 0.38;
const BADGE = 84;

const DATA_PARTICLES = 8;

/**
 * LogoUploadFlight — the bird that carries a shared card away.
 *
 * It flies on its own surface so it reads over any photo or the list:
 * the screen dims briefly, and the bird sits in a round badge of the page
 * colour with a hairline border and shadow. Three clocks: the dim settles
 * first, the badge scales in and hangs, then it accelerates off the top
 * trailing white streaks while the dim clears.
 */
export function LogoUploadFlight({ color, surface, border }: { color: string; surface: string; border: string }) {
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

      <Animated.View style={[styles.badge, { backgroundColor: surface, borderColor: border }, logoStyle]}>
        <Logo size={44} color={color} />
      </Animated.View>

      {/* Streaks trailing the badge, white on the dim in either theme. */}
      {Array.from({ length: DATA_PARTICLES }).map((_, i) => {
        return <DataParticle key={i} index={i} color="#FFFFFF" />;
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
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
});
