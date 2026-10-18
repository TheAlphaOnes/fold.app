import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';

/** Shared geometry for every right-docked shelf tab on the home screen. */
export const EDGE_TAB_WIDTH = 56;
export const EDGE_TAB_HEIGHT = 44;
export const EDGE_TAB_GAP = 8;
const EDGE_TAB_RADIUS = 16;

interface EdgeTabProps {
  /** Stack position from the top: 0 is the first tab, 1 sits directly below it. */
  slot: number;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}

/**
 * EdgeTab — the single source of truth for the shelf-tab shape docked to the
 * right screen edge. Profile and Field Guide both render through it so their
 * size, radius, border and pressed state can never drift apart.
 */
export function EdgeTab({ slot, onPress, accessibilityLabel, children }: EdgeTabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, 20) + slot * (EDGE_TAB_HEIGHT + EDGE_TAB_GAP);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: EDGE_TAB_GAP / 2, bottom: EDGE_TAB_GAP / 2, left: 8, right: 0 }}
      style={({ pressed }) => [
        styles.tab,
        {
          top,
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    right: 0,
    zIndex: 100,
    width: EDGE_TAB_WIDTH,
    height: EDGE_TAB_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: EDGE_TAB_RADIUS,
    borderBottomLeftRadius: EDGE_TAB_RADIUS,
    borderWidth: 1,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
