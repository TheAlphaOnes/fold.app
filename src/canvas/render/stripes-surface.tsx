/** Fold's card surface: the diagonal stripes on the card colour. */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { useTheme } from '@/hooks/use-theme';

export function StripesSurface({ animated = false }: { animated?: boolean }) {
  const theme = useTheme();
  const isDark = theme.background !== '#FFFFFF';
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement }]} pointerEvents="none">
      <DiagonalStripes color={isDark ? theme.border : '#D0D0D0'} opacity={isDark ? 0.12 : 0.5} animated={animated} />
    </View>
  );
}
