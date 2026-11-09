/**
 * The tools bar that floats at the bottom of the canvas for whatever is
 * selected: a photo sticker (shape, front, remove) or a photo
 * in the base (replace, flip, remove). Presentational only; the composer
 * owns the actions.
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowUpToLine, FlipHorizontal2, ImagePlus, Shapes, Trash2, type LucideIcon } from 'lucide-react-native';

import type { MediaSticker } from '@/canvas/types';
import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

function SelectionBar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View entering={riseIn(200, 0, 6)} style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {children}
    </Animated.View>
  );
}

interface ToolProps {
  icon: LucideIcon;
  label?: string;
  accessibilityLabel: string;
  destructive?: boolean;
  onPress: () => void;
}

function Tool({ icon: Icon, label, accessibilityLabel, destructive, onPress }: ToolProps) {
  const theme = useTheme();
  const ink = destructive ? theme.destructive : theme.text;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.tool, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Icon size={16} color={ink} />
      {label ? <ThemedText style={[styles.label, { color: ink }]}>{label}</ThemedText> : null}
    </Pressable>
  );
}

interface StickerToolsProps {
  sticker: MediaSticker;
  onCycleShape: () => void;
  onFront: () => void;
  onRemove: () => void;
}

export function StickerTools({ sticker, onCycleShape, onFront, onRemove }: StickerToolsProps) {
  return (
    <SelectionBar>
      <Tool icon={Shapes} label={sticker.shape.toUpperCase()} accessibilityLabel="Change shape" onPress={onCycleShape} />
      <Tool icon={ArrowUpToLine} accessibilityLabel="Bring to front" onPress={onFront} />
      <Tool icon={Trash2} accessibilityLabel="Remove sticker" destructive onPress={onRemove} />
    </SelectionBar>
  );
}

interface FrameToolsProps {
  /** Grid cells can be mirrored; the full-bleed background can't. */
  canFlip: boolean;
  onReplace: () => void;
  onFlip: () => void;
  onRemove: () => void;
}

export function FrameTools({ canFlip, onReplace, onFlip, onRemove }: FrameToolsProps) {
  return (
    <SelectionBar>
      <Tool icon={ImagePlus} label="REPLACE" accessibilityLabel="Replace photo" onPress={onReplace} />
      {canFlip && <Tool icon={FlipHorizontal2} label="FLIP" accessibilityLabel="Flip photo" onPress={onFlip} />}
      <Tool icon={Trash2} label="REMOVE" accessibilityLabel="Remove photo" destructive onPress={onRemove} />
    </SelectionBar>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, justifyContent: 'center' },
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1.5 },
});
