import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { DoubleDiagonalStripes } from '@/components/double-diagonal-stripes';

export function TopBar() {
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container, 
        { 
          // Ultra-slim technical band
          height: insets.top + 8,
          backgroundColor: 'transparent' 
        }
      ]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DoubleDiagonalStripes color="#E45B00" opacity={1} animated={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
});
