import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TextInputProps, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

interface CleanInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  placeholder?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function CleanInput({ value, placeholder, style, onFocus, onBlur, ...props }: CleanInputProps) {
  const theme = useTheme();
  const inputRef = React.useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Blinking cursor opacity
  const cursorOpacity = useSharedValue(1);
  
  useEffect(() => {
    if (isFocused) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 0 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    } else {
      cursorOpacity.value = 0; // Hide cursor when blurred
    }
  }, [isFocused]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const displayString = value.length > 0 ? value : (placeholder || '');
  const showPlaceholder = value.length === 0;

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[styles.container, style]}>
        
        {/* Actual Input - Hidden purely for keyboard handling */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          caretHidden
          {...props}
        />

        {/* Visual Typography Input */}
        <View style={styles.visualContainer}>
          <Animated.Text 
            style={[
              styles.text, 
              { color: showPlaceholder ? theme.textMuted : theme.text }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayString}
          </Animated.Text>
          
          {/* Elegant blinking cursor */}
          <Animated.View 
            style={[
              styles.cursor, 
              { backgroundColor: theme.accentWarm },
              cursorStyle
            ]} 
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
  },
  visualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the text visually
    width: '100%',
  },
  text: {
    fontFamily: 'JetBrainsMono-Regular', // Regular weight for elegance
    fontSize: 48,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cursor: {
    width: 3,
    height: 48, // Match font size
    marginLeft: 8,
    borderRadius: 2,
  }
});
