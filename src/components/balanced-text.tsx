/**
 * BalancedText — wrapping copy with even lines. Measures its own width,
 * then breaks the text with balanceLines (exact, as the app's face is
 * monospaced), so a paragraph never ends on one or two stranded words.
 * Use it for any centred or multi-line copy: empty states, notes, hints.
 */

import React, { useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { balanceLines, monoCharsPerLine } from '@/utils/balance-text';

interface BalancedTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export function BalancedText({ children, style }: BalancedTextProps) {
  const [width, setWidth] = useState(0);
  const { fontSize = 14, letterSpacing = 0 } = StyleSheet.flatten(style) ?? {};
  const text = width > 0 ? balanceLines(children, monoCharsPerLine(width, fontSize, letterSpacing)).join('\n') : children;
  return (
    <ThemedText style={[styles.fill, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  // Takes the full width it's given, so the measure is the space available.
  fill: { alignSelf: 'stretch' },
});
