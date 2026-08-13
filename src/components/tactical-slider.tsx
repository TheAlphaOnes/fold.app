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

interface TacticalSliderProps {
  onConfirm: () => void;
  text?: string;
  width?: number;
}

const THUMB_WIDTH = 64;
const PADDING = 4;

export function TacticalSlider({ onConfirm, text = 'SLIDE TO CONFIRM', width: overrideWidth }: TacticalSliderProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  const sliderWidth = overrideWidth || (windowWidth - 48); // default padding
  const maxTranslate = sliderWidth - THUMB_WIDTH - (PADDING * 2);

  const translateX = useSharedValue(0);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirm();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (confirmed) return;
      
      // Clamp between 0 and maxTranslate
      translateX.value = Math.max(0, Math.min(event.translationX, maxTranslate));
    })
    .onEnd(() => {
      if (confirmed) return;

      if (translateX.value > maxTranslate * 0.85) {
        // Trigger confirm
        translateX.value = withSpring(maxTranslate, { damping: 20, stiffness: 200, mass: 0.5 });
        runOnJS(handleConfirm)();
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.5 });
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
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

      <Animated.Text style={[styles.text, { color: theme.textMuted }, textAnimatedStyle]}>
        {text}
      </Animated.Text>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.thumb, { backgroundColor: theme.text }, thumbAnimatedStyle]}>
          <ChevronRight color={theme.background} size={24} strokeWidth={3} />
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
  },
  fill: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 6,
    opacity: 0.2,
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
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
