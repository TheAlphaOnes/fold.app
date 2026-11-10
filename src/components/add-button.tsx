import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  useAnimatedReaction,
  useReducedMotion,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { haptic } from '@/services/haptics';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import { Camera } from 'lucide-react-native';
import type { KeyGesture } from '@/home/key-hints';

interface AddButtonProps {
  onPress: () => void;
  onSwipeUp?: (type: 'photo') => void;
  /** A long press. Recording starts here and keeps going after release; it is stopped by a tap. */
  onHold?: () => void;
  /**
   * Acts a gesture out on its own (the home hint teaching it): a double
   * press for tap, a long squeeze for hold, a short lift (the camera track
   * peeks) for swipe. `n` changes each time it should play.
   */
  demo?: { gesture: KeyGesture; n: number } | null;
}

const PHOTO_THRESHOLD = -110;

export function AddButton({ onPress, onSwipeUp, onHold, demo }: AddButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const swipeStage = useSharedValue(0); // 0 = none, 1 = photo trigger
  const isActive = useSharedValue(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!demo || reduced || isActive.get()) return;
    if (demo.gesture === 'tap') {
      const press = () => withSequence(withTiming(0.92, { duration: 110 }), withTiming(1, { duration: 170, easing: Easing.out(Easing.back(2)) }));
      scale.set(withSequence(press(), withDelay(140, press())));
    } else if (demo.gesture === 'hold') {
      scale.set(withSequence(withTiming(0.86, { duration: 520, easing: Easing.out(Easing.quad) }), withDelay(600, withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.6)) }))));
    } else {
      translateY.set(withSequence(withTiming(-30, { duration: 420, easing: Easing.out(Easing.cubic) }), withDelay(420, withTiming(0, { duration: 320, easing: Easing.inOut(Easing.cubic) }))));
    }
    // Plays when a new demo is asked for (n changes), not on other renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo?.n]);

  const fireHapticLight = useCallback(() => {
    haptic.tap();
  }, []);

  const fireHapticHeavy = useCallback(() => {
    haptic.thud();
  }, []);

  const firePress = useCallback(() => {
    haptic.press();
    onPress();
  }, [onPress]);

  const fireSwipeUp = useCallback(() => {
    haptic.thud();
    if (onSwipeUp) onSwipeUp('photo');
  }, [onSwipeUp]);

  const fireHold = useCallback(() => {
    if (onHold) onHold();
  }, [onHold]);

  useAnimatedReaction(
    () => swipeStage.get(),
    (current, prev) => {
      if (prev !== null && current !== prev && current === 1) {
        runOnJS(fireHapticLight)();
      }
    }
  );

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      isActive.set(true);
      scale.set(withTiming(0.9, { duration: 80 }));
      runOnJS(fireHapticLight)();
    })
    .onFinalize((_, success) => {
      isActive.set(false);
      scale.set(withTiming(1, { duration: 150 }));
      if (success) {
        runOnJS(firePress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      isActive.set(true);
      scale.set(withTiming(0.85, { duration: 150 }));
      runOnJS(fireHapticHeavy)();
      runOnJS(fireHold)();
    })
    .onFinalize(() => {
      // Letting go only settles the key; a recording it started carries on.
      isActive.set(false);
      scale.set(withTiming(1, { duration: 150 }));
    });

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      isActive.set(true);
    })
    .onUpdate((e) => {
      if (e.translationY < 0) {
        let raw = e.translationY;
        
        if (raw <= PHOTO_THRESHOLD) {
          raw = PHOTO_THRESHOLD + (raw - PHOTO_THRESHOLD) * 0.15;
          if (swipeStage.get() !== 1) swipeStage.set(1);
        } else {
          if (swipeStage.get() !== 0) swipeStage.set(0);
        }
        
        translateY.set(raw);
      }
    })
    .onEnd(() => {
      isActive.set(false);
      if (swipeStage.get() === 1) {
        runOnJS(fireSwipeUp)();
      }
      
      swipeStage.set(0);
      translateY.set(withTiming(0, { duration: 150 }));
    });

  const composedGesture = Gesture.Race(tapGesture, longPressGesture, panGesture);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.get() },
      { scale: scale.get() }
    ],
  }));

  // Track style
  const trackStyle = useAnimatedStyle(() => {
    const isVisible = translateY.get() < -2;
    const progress = withTiming(isVisible ? 1 : 0, { duration: 250 });
    
    return {
      transform: [
        { scaleY: interpolate(progress, [0, 1], [0.001, 1]) },
        { translateY: interpolate(progress, [0, 1], [70, 0]) }
      ]
    };
  });

  const photoIconStyle = useAnimatedStyle(() => {
    const active = swipeStage.get() === 1;
    const isVisible = translateY.get() < -2;
    return {
      opacity: withTiming(isVisible ? (active ? 1 : 0.4) : 0, { duration: 150 }),
      transform: [{ scale: withTiming(active ? 1.25 : 1, { duration: 150 }) }]
    };
  });

  return (
    <View style={styles.wrapper}>
      {/* Mechanical Track Groove */}
      <Animated.View style={[
        styles.trackGroove, 
        { 
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        trackStyle
      ]} />
      
      {/* Threshold Marker: Camera icon at higher threshold */}
      <Animated.View style={[styles.trackIcon, { bottom: 17 + Math.abs(PHOTO_THRESHOLD) }, photoIconStyle]} pointerEvents="none">
        <Camera size={18} color={theme.text} strokeWidth={2.5} />
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: theme.accentWarm },
            buttonAnimatedStyle,
          ]}
        ><DiagonalStripes color="#863800" opacity={1} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 34,
    // Add zIndex to ensure track pops over content
    zIndex: 100, 
  },
  trackGroove: {
    position: 'absolute',
    bottom: 17, // Start at center of the button
    width: 48,
    height: 140, // Extends up to cover the -120 threshold
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    zIndex: 1,
    alignItems: 'center',
    // Anchor the transform to the bottom so it grows upwards
    
  },
  trackIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 150,
    height: 34,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
