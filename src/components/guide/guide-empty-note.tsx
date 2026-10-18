import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ActionLink } from '@/components/action-link';
import { AsciiArt } from '@/components/ascii-art';
import { ThemedText } from '@/components/themed-text';
import { FLOWER_ART } from '@/constants/ascii-art';
import { fadeIn, riseIn } from '@/constants/motion';
import { BALANCED_TEXT } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GuideEmptyNoteProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/** Shown when a step needs a real memory and the journal has none yet. */
export function GuideEmptyNote({ message, actionLabel, onAction }: GuideEmptyNoteProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Animated.View entering={fadeIn(360)} style={styles.art}>
        <AsciiArt art={FLOWER_ART} color={theme.textMuted} fontSize={9} />
      </Animated.View>
      <Animated.View entering={riseIn(280, 60)}>
        <ThemedText {...BALANCED_TEXT} style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </ThemedText>
      </Animated.View>
      <Animated.View entering={riseIn(260, 120)}>
        <ActionLink text={actionLabel} onPress={onAction} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  art: {
    opacity: 0.5,
  },
  message: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
