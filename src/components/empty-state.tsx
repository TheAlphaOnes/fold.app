import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState() {
  const theme = useTheme();

  return (
    <Animated.View 
      entering={FadeIn.duration(600).delay(200).easing((t) => t)} 
      style={styles.container}
    >
      <View style={[styles.box, { borderColor: theme.borderStrong }]}>
        <View style={styles.iconContainer}>
          <Logo size={48} color={theme.textMuted} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>Nothing here yet</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
          Tap + to write your first thought
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
  },
});
