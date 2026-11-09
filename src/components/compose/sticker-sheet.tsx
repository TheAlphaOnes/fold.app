/**
 * StickerSheet — everything you can put on top of a canvas, in one tray:
 * a photo sticker, a GIF, a song, a voice note, the place, the date.
 * Same floating card as the share tray and hold menu.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, FadeInDown, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { CalendarDays, Image as ImageIcon, MapPin, Mic, Music, Smile, type LucideIcon } from 'lucide-react-native';

import { CloseButton } from '@/components/round-button';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

export type StickerKind = 'photo' | 'gif' | 'music' | 'voice' | 'location' | 'date';

const ITEMS: { kind: StickerKind; icon: LucideIcon; label: string }[] = [
  { kind: 'photo', icon: ImageIcon, label: 'Photo' },
  { kind: 'gif', icon: Smile, label: 'GIF' },
  { kind: 'music', icon: Music, label: 'Song' },
  { kind: 'voice', icon: Mic, label: 'Voice' },
  { kind: 'location', icon: MapPin, label: 'Place' },
  { kind: 'date', icon: CalendarDays, label: 'Date' },
];

const rise = (delay: number) => FadeInDown.delay(delay).duration(300).withInitialValues({ transform: [{ translateY: 10 }] });

export function StickerSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (kind: StickerKind) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  // Mount as soon as it's asked for (render-time, the allowed pattern);
  // unmount only after the slide-out finishes.
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, { damping: 22, stiffness: 280, mass: 0.8 }));
    } else {
      progress.set(
        withTiming(0, { duration: 180 }, (done) => {
          if (done) runOnJS(setMounted)(false);
        }),
      );
    }
  }, [visible, progress]);

  const overlay = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 1], [0, 0.5], Extrapolation.CLAMP) }));
  const tray = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(progress.get(), [0, 1], [400, 0], Extrapolation.CLAMP) }] }));

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlay]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close stickers" />
      </Animated.View>
      <Animated.View style={[styles.tray, tray, { bottom: Math.max(insets.bottom - 14, 10), backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Animated.View entering={rise(60)} style={styles.header}>
          <Text style={[Type.rail, { color: theme.textMuted }]}>ADD</Text>
          <CloseButton onPress={onClose} accessibilityLabel="Close stickers" />
        </Animated.View>
        <View style={styles.grid}>
          {ITEMS.map(({ kind, icon: Icon, label }, i) => (
            <Animated.View key={kind} entering={rise(100 + i * 35)} style={styles.cellWrap}>
              <Pressable
                onPress={() => {
                  haptic.tap();
                  onClose();
                  onPick(kind);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.cell, { borderColor: theme.border, backgroundColor: theme.background }, pressed && styles.pressed]}
              >
                <Icon size={22} color={theme.text} />
                <Text style={[styles.cellLabel, { color: theme.text }]}>{label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 600 },
  overlay: { backgroundColor: '#000' },
  tray: { position: 'absolute', left: 10, right: 10, borderRadius: 34, borderWidth: 1, padding: 21, paddingTop: 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cellWrap: { width: '31%' },
  cell: { height: 88, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  cellLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12 },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.75 },
});
