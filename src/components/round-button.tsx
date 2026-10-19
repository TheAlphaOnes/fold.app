/**
 * RoundButton and CloseButton — the one round control used in every
 * screen header, so close and action buttons look and feel the same
 * everywhere: a 34pt circle with a hairline border, a 16pt icon, a light
 * haptic tap and a fade while pressed (the profile header's original).
 *
 * The fill is the page colour: on a plain page it reads as the bare
 * outlined circle, and over photos (a memory, the time machine, a story)
 * it keeps the icon legible.
 */

import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { X, type LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack } from '@/utils/navigation';

export const ROUND_BUTTON_SIZE = 34;
const ICON_SIZE = 16;

interface RoundButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  /** Tints the icon, e.g. theme.destructive for a delete action. */
  iconColor?: string;
  /** Positioning only (absolute placement, margins); never the button's look. */
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

export function RoundButton({ icon: Icon, onPress, accessibilityLabel, iconColor, style, hitSlop }: RoundButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.5 : 1 },
        style,
      ]}
    >
      <Icon size={ICON_SIZE} color={iconColor ?? theme.text} />
    </Pressable>
  );
}

interface CloseButtonProps {
  /** Defaults to going back (or home when there is no history). */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

export function CloseButton({ onPress, accessibilityLabel = 'Close', style, hitSlop }: CloseButtonProps) {
  return (
    <RoundButton
      icon={X}
      onPress={onPress ?? (() => goBack())}
      accessibilityLabel={accessibilityLabel}
      style={style}
      hitSlop={hitSlop}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: ROUND_BUTTON_SIZE,
    height: ROUND_BUTTON_SIZE,
    borderRadius: ROUND_BUTTON_SIZE / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
