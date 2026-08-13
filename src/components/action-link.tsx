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
}

export function ActionLink({ onPress, text }: ActionLinkProps) {
  const theme = useTheme();
  
  const arrowOffset = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    arrowOffset.value = withSpring(8, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.6, { duration: 150 });
  };

  const handlePressOut = () => {
    arrowOffset.value = withSpring(0, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowOffset.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.container, containerStyle]}>
        <Animated.Text style={[styles.text, { color: theme.text }]}>
          {text}
        </Animated.Text>
        <Animated.View style={arrowStyle}>
          <Animated.Text style={[styles.arrow, { color: theme.text }]}>
            ->
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
