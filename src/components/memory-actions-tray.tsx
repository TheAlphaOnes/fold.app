/**
 * MemoryActionsTray — the hold menu for a memory, opened by holding a card
 * anywhere in the app.
 *
 * Same floating card as ShareTray (inset from the edges, the memory card's
 * 34pt corners, spring in, quick ease out) so every sheet in Fold feels like
 * one family. Layout: the two things people do most as tiles (share, open),
 * then a short list of the rest, delete last and in red.
 *
 * Motion lands in segments: the tray springs in, then the header, the tiles
 * and each list row rise on their own small delays.
 *
 * Presentational only: MemoryActionsHost owns what each action does.
 */

import React, { memo, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Share as ShareIcon,
  Maximize2,
  Pencil,
  BookPlus,
  Download,
  Trash2,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { CloseButton } from '@/components/round-button';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const INSET = 10;
const SPRING_IN = { damping: 22, stiffness: 280, mass: 0.8 };
const TIMING_OUT = { duration: 180 };
const OFFSCREEN = 520;

const rise = (delay: number) =>
  FadeInDown.delay(delay).duration(320).withInitialValues({ transform: [{ translateY: 10 }] });

interface MemoryActionsTrayProps {
  visible: boolean;
  /** Small line under the rail, e.g. "MON 09.11 · 12:26". */
  subtitle: string;
  /** Offer "Save to photos" only when there's a photo or video to save. */
  canSave: boolean;
  onClose: () => void;
  onShare: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onAddToStory: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export const MemoryActionsTray = memo(function MemoryActionsTray({
  visible,
  subtitle,
  canSave,
  onClose,
  onShare,
  onOpen,
  onEdit,
  onAddToStory,
  onSave,
  onDelete,
}: MemoryActionsTrayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, SPRING_IN);
    } else if (mounted) {
      progress.value = withTiming(0, TIMING_OUT, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
  }));
  const trayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [OFFSCREEN, 0], Extrapolation.CLAMP) }],
  }));

  if (!mounted) return null;

  // Each action closes the menu first, then runs.
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  const rows: { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean }[] = [
    { icon: Pencil, label: 'Edit', onPress: run(onEdit) },
    { icon: BookPlus, label: 'Add to story', onPress: run(onAddToStory) },
    ...(canSave ? [{ icon: Download, label: 'Save to photos', onPress: run(onSave) }] : []),
    { icon: Trash2, label: 'Delete', onPress: run(onDelete), destructive: true },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, s.root]} pointerEvents="box-none">
      <Animated.View style={[s.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close memory menu" />
      </Animated.View>

      <Animated.View
        style={[
          s.tray,
          trayStyle,
          { bottom: Math.max(insets.bottom - 14, INSET), backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <Animated.View entering={rise(60)} style={s.header}>
          <View style={s.headerText}>
            <Text style={[Type.rail, { color: theme.textMuted }]}>MEMORY</Text>
            <Text style={[s.subtitle, { color: theme.text }]}>{subtitle}</Text>
          </View>
          <CloseButton onPress={onClose} accessibilityLabel="Close memory menu" />
        </Animated.View>

        <Animated.View entering={rise(100)} style={s.tiles}>
          <Tile primary icon={ShareIcon} label="Share" hint="AS A CARD" onPress={run(onShare)} />
          <Tile icon={Maximize2} label="Open" hint="FULL VIEW" onPress={run(onOpen)} />
        </Animated.View>

        <View style={[s.list, { borderColor: theme.border }]}>
          {rows.map((row, i) => (
            <Animated.View key={row.label} entering={rise(140 + i * 40)}>
              <Row {...row} first={i === 0} />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

function Tile({ icon: Icon, label, hint, primary, onPress }: { icon: LucideIcon; label: string; hint: string; primary?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const fg = primary ? theme.background : theme.text;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${hint.toLowerCase()}`}
      style={({ pressed }) => [
        s.tile,
        primary ? { backgroundColor: theme.text, borderColor: theme.text } : { backgroundColor: theme.background, borderColor: theme.border },
        pressed && s.pressed,
      ]}
    >
      {primary && <DiagonalStripes color={theme.background} opacity={0.08} />}
      <Icon size={20} color={fg} />
      <View style={s.tileText}>
        <Text style={[s.tileLabel, { color: fg }]}>{label}</Text>
        <Text style={[s.tileHint, { color: primary ? theme.background : theme.textMuted }, primary && s.tileHintOnInk]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function Row({ icon: Icon, label, onPress, destructive, first }: { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean; first: boolean }) {
  const theme = useTheme();
  const color = destructive ? theme.destructive : theme.text;
  return (
    <Pressable
      onPress={() => {
        if (destructive) haptic.warning();
        else haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }, pressed && { opacity: 0.5 }]}
    >
      <Icon size={18} color={color} />
      <Text style={[s.rowLabel, { color }]}>{label}</Text>
      {!destructive && <ChevronRight size={16} color={theme.textMuted} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { zIndex: 10000, elevation: 1000 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  tray: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    borderRadius: 34,
    borderWidth: 1,
    padding: 21,
    paddingTop: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: 4 },
  subtitle: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, letterSpacing: 0.5 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 104, padding: 16, borderRadius: 21, borderWidth: 1, justifyContent: 'space-between', overflow: 'hidden' },
  tileText: { gap: 4 },
  tileLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 16, letterSpacing: -0.2 },
  tileHint: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, letterSpacing: 1.2 },
  tileHintOnInk: { opacity: 0.55 },
  list: { borderRadius: 21, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 52, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontFamily: 'JetBrainsMono-Medium', fontSize: 14 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.75 },
});
