/**
 * Shown in place of a screen whose native part (camera, maps) isn't in the
 * installed app yet: the JS arrived over the dev server before the app was
 * rebuilt. Explains it instead of crashing, and offers the way back.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalancedText } from '@/components/balanced-text';
import { CloseButton } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';


/** True when the installed app includes this native module. */
export function hasNativeModule(name: string): boolean {
  return requireOptionalNativeModule(name) != null;
}

export function NeedsUpdate({ feature }: { feature: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.close, { top: insets.top + 6 }]}>
        <CloseButton accessibilityLabel="Go back" />
      </View>
      <ThemedText style={[styles.title, { color: theme.text }]}>almost here</ThemedText>
      <BalancedText style={[styles.body, { color: theme.textMuted }]}>{`${feature} comes with the next app update`}</BalancedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  close: { position: 'absolute', left: 16 },
  title: { fontFamily: 'JetBrainsMono-Medium', fontSize: 14, textAlign: 'center' },
  body: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
