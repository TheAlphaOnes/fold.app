import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface MemoryCardProps {
  index: number;
  height: number;
}

export function MemoryCard({ index, height }: MemoryCardProps) {
  const theme = useTheme();

  return (
    <View 
      style={[
        styles.card, 
        { 
          height,
          backgroundColor: theme.backgroundElement,
          borderColor: '#878787', // The border color requested
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 36, // Extremely rounded as per the sketch
    borderWidth: 1, // Thin crisp border
  }
});
