import React, { useState } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolateColor,
  Extrapolation,
  interpolate
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';
import { DiagonalStripes } from '@/components/diagonal-stripes';

interface TacticalSliderProps {
  onConfirm: () => void;
  text?: string;
  width?: number;
}

const THUMB_WIDTH = 64;
const PADDING = 4;
const HAPTIC_TICK_DISTANCE = 24; // trigger a tick every 24 pixels

// Mechanical spring configs
const SPRING_SNAP = { damping: 14, stiffness: 300, mass: 1 };
const SPRING_CONFIRM = { damping: 18, stiffness: 200, mass: 0.8 };

export function TacticalSlider({ onConfirm, text = 'SLIDE TO CONFIRM', width: overrideWidth }: TacticalSliderProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  const sliderWidth = overrideWidth || (windowWidth - 48); // default padding
  const maxTranslate = sliderWidth - THUMB_WIDTH - (PADDING * 2);

  const translateX = useSharedValue(0);
  const lastHapticX = useSharedValue(0);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 150);
      onConfirm();
    }
  };

  const triggerTick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      if (confirmed) return;
      lastHapticX.value = 0;
      runOnJS(triggerTick)();
    })
    .onUpdate((event) => {
      if (confirmed) return;
      
      const clampedX = Math.max(0, Math.min(event.translationX, maxTranslate));
      translateX.value = clampedX;

      // Mechanical gear ticks
      if (Math.abs(clampedX - lastHapticX.value) >= HAPTIC_TICK_DISTANCE) {
        lastHapticX.value = clampedX;
        runOnJS(triggerTick)();
      }
    })
    .onEnd(() => {
      if (confirmed) return;

      if (translateX.value > maxTranslate * 0.85) {
        // Trigger confirm
        translateX.value = withSpring(maxTranslate, SPRING_CONFIRM);
        runOnJS(handleConfirm)();
      } else {
        // Snap back
        translateX.value = withSpring(0, SPRING_SNAP);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
    });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, maxTranslate * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const fillAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + THUMB_WIDTH,
    };
  });

  return (
    <View style={[styles.container, { width: sliderWidth, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      
      {/* Background Fill when dragging */}
      <Animated.View style={[styles.fill, { backgroundColor: theme.accentWarm }, fillAnimatedStyle]} />

      {/* Internal Track Shadow / Border illusion */}
      <View style={[styles.trackInner, { borderColor: theme.background }]} pointerEvents="none" />

      <Animated.Text style={[styles.text, { color: theme.textMuted }, textAnimatedStyle]}>
        {text}
      </Animated.Text>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.thumb, { backgroundColor: theme.text }, thumbAnimatedStyle]}>
          <DiagonalStripes color={theme.background} opacity={0.3} />
          <View style={styles.chevronContainer}>
            <ChevronRight color={theme.background} size={24} strokeWidth={3} />
          </View>
        </Animated.View>
      </GestureDetector>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: PADDING,
    overflow: 'hidden',
    borderBottomWidth: 3, // Physical depth to the track
  },
  trackInner: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 6,
    opacity: 0.5,
  },
  fill: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 4,
    opacity: 0.3,
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    letterSpacing: 2,
    zIndex: 0,
  },
  thumb: {
    width: THUMB_WIDTH,
    height: '100%',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chevronContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 2,
  },
});
