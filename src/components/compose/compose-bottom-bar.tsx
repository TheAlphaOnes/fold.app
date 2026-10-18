/**
 * ComposeBottomBar — the story chip, sitting just above the keyboard.
 *
 * Keeping it out of the header leaves the top of the page to the toolbar,
 * the date and the attach row, so a long story name never reflows them.
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Book } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

/** Bottom safe-area padding is only needed while the keyboard is down. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

interface ComposeBottomBarProps {
  storyLabel: string;
  hasStory: boolean;
  onOpenStories: () => void;
  bottomInset: number;
}

export function ComposeBottomBar({ storyLabel, hasStory, onOpenStories, bottomInset }: ComposeBottomBarProps) {
  const theme = useTheme();
  const keyboardShown = useKeyboardShown();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: keyboardShown ? 10 : Math.max(bottomInset, 12) },
      ]}
    >
      <Pressable
        onPress={() => {
          haptic.tap();
          onOpenStories();
        }}
        accessibilityRole="button"
        accessibilityLabel={hasStory ? `Story: ${storyLabel}` : 'Add to a story'}
        style={({ pressed }) => [
          styles.chip,
          hasStory ? { backgroundColor: theme.text, borderColor: theme.text } : { borderColor: theme.border },
          { transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        <Book size={13} color={hasStory ? theme.background : theme.text} />
        <ThemedText
          style={[styles.chipText, { color: hasStory ? theme.background : theme.text }]}
          numberOfLines={1}
        >
          {storyLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    flexShrink: 1,
  },
});
