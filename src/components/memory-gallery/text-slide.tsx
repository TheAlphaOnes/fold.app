/** A gallery page with the memory's words, centred, in its font and ink. */

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { memoryTextMetrics } from '@/utils/memory-text';

interface TextSlideProps {
  text: string;
  width: number;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
}

export function TextSlide({ text, width, fontFamily, fontSize, textColor }: TextSlideProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={[
          styles.text,
          { color: textColor ?? theme.text, fontFamily: fontFamily || 'JetBrainsMono-Regular', ...memoryTextMetrics(fontFamily, fontSize || 24) },
        ]}
      >
        {text}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 32, flexGrow: 1, justifyContent: 'center' },
  text: { textAlign: 'center' },
});
