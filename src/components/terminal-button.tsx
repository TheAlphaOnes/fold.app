import React, { useEffect } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';

interface TerminalButtonProps {
  onPress: () => void;
  text: string;
}

export function TerminalButton({ onPress, text }: TerminalButtonProps) {
  const theme = useTheme();
  
  // Blinking cursor animation
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: 500 })
      ),
      -1 // infinite
    );
  }, []);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { 
          backgroundColor: pressed ? theme.backgroundElement : theme.text,
          borderColor: theme.text,
        }
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          <Animated.Text 
            style={[
              styles.text, 
              { color: pressed ? theme.text : theme.background }
            ]}
          >
            {text}
          </Animated.Text>
          <Animated.View 
            style={[
              styles.cursor, 
              { backgroundColor: pressed ? theme.text : theme.background },
              cursorStyle
            ]} 
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 64,
    width: '100%',
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: 4,
  },
  cursor: {
    width: 12,
    height: 20,
    marginLeft: 8,
  }
});
