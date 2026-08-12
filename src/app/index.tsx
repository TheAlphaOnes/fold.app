import React from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { MemoryCard } from '@/components/memory-card';

// Mock data array of 5 items
const MOCK_DATA = Array.from({ length: 5 }, (_, i) => i + 1);
const CARD_GAP = 24;

export default function HomeScreen() {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Available height taking safe area into account for perfect centering
  const availableHeight = height - insets.top - insets.bottom;
  
  // The card takes up ~80% of the available screen height
  const cardHeight = availableHeight * 0.80;
  
  // The snap interval is the card height + gap
  const snapInterval = cardHeight + CARD_GAP;
  
  // Padding to perfectly center the first and last items
  const verticalPadding = (availableHeight - snapInterval) / 2;

  const renderItem = ({ item }: { item: number }) => (
    // We wrap the card in a container exactly the size of the snapInterval
    // so that the card itself is perfectly visually centered in the layout box
    <View style={{ height: snapInterval, justifyContent: 'center', paddingHorizontal: 20 }}>
      <MemoryCard index={item} height={cardHeight} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        data={MOCK_DATA}
        keyExtractor={(item) => item.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        // Snapping physics
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        // iOS specific fixes for double padding
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        // Center the first and last cards perfectly
        contentContainerStyle={{
          paddingTop: verticalPadding,
          paddingBottom: verticalPadding,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
