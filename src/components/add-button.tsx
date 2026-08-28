import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import { Camera, Video, Plus } from 'lucide-react-native';

interface AddButtonProps {
  onPress: () => void;
  onSwipeUp?: (type: 'photo' | 'video') => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

const PHOTO_THRESHOLD = -60;
const VIDEO_THRESHOLD = -120;

export function AddButton({ onPress, onSwipeUp, onLongPressStart, onLongPressEnd }: AddButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const swipeStage = useSharedValue(0); // 0 = none, 1 = photo, 2 = video
  const isActive = useSharedValue(false);

  const fireHapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const fireHapticHeavy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const firePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const fireSwipeUp = useCallback((type: 'photo' | 'video') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onSwipeUp) onSwipeUp(type);
  }, [onSwipeUp]);

  const fireLongPressStart = useCallback(() => {
    if (onLongPressStart) onLongPressStart();
  }, [onLongPressStart]);

  const fireLongPressEnd = useCallback(() => {
    if (onLongPressEnd) onLongPressEnd();
  }, [onLongPressEnd]);

  useAnimatedReaction(
    () => swipeStage.value,
    (current, prev) => {
      if (prev !== null && current !== prev) {
        if (current === 1 || current === 2) {
          runOnJS(fireHapticLight)();
        }
      }
    }
  );

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      isActive.value = true;
      scale.value = withTiming(0.9, { duration: 80 });
      runOnJS(fireHapticLight)();
    })
    .onFinalize((_, success) => {
      isActive.value = false;
      scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.6 });
      if (success) {
        runOnJS(firePress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      isActive.value = true;
      scale.value = withSpring(0.85, { damping: 10, stiffness: 160 });
      runOnJS(fireHapticHeavy)();
      runOnJS(fireLongPressStart)();
    })
    .onEnd(() => {
      isActive.value = false;
      scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.6 });
      runOnJS(fireLongPressEnd)();
    });

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      isActive.value = true;
    })
    .onUpdate((e) => {
      if (e.translationY < 0) {
        let raw = e.translationY;
        
        if (raw < -45 && raw > -85) {
          raw = PHOTO_THRESHOLD + (raw - PHOTO_THRESHOLD) * 0.15;
          if (swipeStage.value !== 1) swipeStage.value = 1;
        } 
        else if (raw < -105 && raw > -145) {
          raw = VIDEO_THRESHOLD + (raw - VIDEO_THRESHOLD) * 0.15;
          if (swipeStage.value !== 2) swipeStage.value = 2;
        } 
        else if (raw <= -145) {
          raw = VIDEO_THRESHOLD - 5 + (raw - (-145)) * 0.05;
          if (swipeStage.value !== 2) swipeStage.value = 2;
        } 
        else if (raw <= -85 && raw >= -105) {
          if (swipeStage.value !== 0) swipeStage.value = 0;
        }
        else {
          if (swipeStage.value !== 0) swipeStage.value = 0;
        }
        
        translateY.value = raw;
      }
    })
    .onEnd(() => {
      isActive.value = false;
      if (swipeStage.value === 2) {
        runOnJS(fireSwipeUp)('video');
      } else if (swipeStage.value === 1) {
        runOnJS(fireSwipeUp)('photo');
      }
      
      swipeStage.value = 0;
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
      });
    });

  const composedGesture = Gesture.Race(tapGesture, longPressGesture, panGesture);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  // Track style
  const trackStyle = useAnimatedStyle(() => {
    const isVisible = translateY.value < -2;
    const progress = withTiming(isVisible ? 1 : 0, { duration: 250 });
    
    return {
      transform: [
        { scaleY: interpolate(progress, [0, 1], [0.001, 1]) },
        { translateY: interpolate(progress, [0, 1], [70, 0]) }
      ]
    };
  });

  const photoIconStyle = useAnimatedStyle(() => {
    const active = swipeStage.value === 1;
    const isVisible = translateY.value < -2;
    return {
      opacity: withTiming(isVisible ? (active ? 1 : 0.4) : 0, { duration: 150 }),
      transform: [{ scale: withSpring(active ? 1.2 : 1) }]
    };
  });

  const videoIconStyle = useAnimatedStyle(() => {
    const active = swipeStage.value === 2;
    const isVisible = translateY.value < -2;
    return {
      opacity: withTiming(isVisible ? (active ? 1 : 0.4) : 0, { duration: 150 }),
      transform: [{ scale: withSpring(active ? 1.2 : 1) }]
    };
  });

  const detentsStyle = useAnimatedStyle(() => {
    const isVisible = translateY.value < -2;
    return {
      opacity: withTiming(isVisible ? 1 : 0, { duration: 250 })
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
      
      {/* Threshold Markers: Icons on left, detent dashes on right */}
      <View style={[styles.thresholdRow, { bottom: 17 + Math.abs(PHOTO_THRESHOLD) }]} pointerEvents="none">
        <Animated.View style={[styles.trackIcon, photoIconStyle]}>
          <Camera size={18} color={theme.text} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View style={[styles.detent, { backgroundColor: theme.border }, detentsStyle]} />
      </View>
      
      <View style={[styles.thresholdRow, { bottom: 17 + Math.abs(VIDEO_THRESHOLD) }]} pointerEvents="none">
        <Animated.View style={[styles.trackIcon, videoIconStyle]}>
          <Video size={18} color={theme.text} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View style={[styles.detent, { backgroundColor: theme.border }, detentsStyle]} />
      </View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: theme.accentWarm },
            buttonAnimatedStyle,
          ]}
        >
          <DiagonalStripes color="#863800" opacity={1} />
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
  thresholdRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16, // Distance between icon and dash
  },
  detent: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  trackIcon: {
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
