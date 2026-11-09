/** The page indicator: a dash for the page showing, small squares for the rest. */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function SlideBeads({ count, index }: { count: number; index: number }) {
  const theme = useTheme();
  if (count < 2) return null;
  return (
    <View style={styles.row} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const current = i === index;
        return (
          <View
            key={i}
            style={[
              styles.bead,
              current ? styles.current : styles.other,
              { backgroundColor: current ? theme.accent : 'transparent', borderColor: current ? theme.accent : theme.text },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 16, justifyContent: 'center' },
  bead: { height: 4, borderWidth: 1, borderRadius: 2 },
  current: { width: 16 },
  other: { width: 4, opacity: 0.4 },
});
