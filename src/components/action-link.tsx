import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';

interface ActionLinkProps {
  onPress: () => void;
  text: string;
  /** Renders at 40% opacity and blocks all interaction. */
  disabled?: boolean;
}

export function ActionLink({ onPress, text, disabled = false }: ActionLinkProps) {
  const theme = useTheme();
  
  const arrowOffset = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    arrowOffset.value = withTiming(8, { duration: 150 });
    opacity.value = withTiming(0.6, { duration: 150 });
  };

  const handlePressOut = () => {
    arrowOffset.value = withTiming(0, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowOffset.value }],
  }));

  // 40% resting opacity while disabled (design-system disabled rule). The
  // validity gate flips as the user types, so the level snaps — no tween.
  const containerStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.4 : opacity.value,
  }));

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.container, containerStyle]}>
        <Animated.Text style={[styles.text, { color: theme.text }]}>
          {text}
        </Animated.Text>
        <Animated.View style={arrowStyle}>
          <Animated.Text style={[styles.arrow, { color: theme.text }]}>
            {"->"}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  text: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  arrow: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    marginLeft: 8,
  }
});
