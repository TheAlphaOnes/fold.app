/**
 * ShareTray — the share sheet for a memory.
 *
 * A floating card that springs up from the bottom with the two ways to
 * share: the card as an image, or the original. Both hand the file to the
 * system share sheet, which lists every app that can take it (Instagram
 * Stories, WhatsApp, X…). It sits inset from the screen edges with the memory
 * card's own 34pt corners, so it reads as part of the timeline rather than
 * a system sheet.
 *
 * Motion is split into segments that land at different times: the tray
 * springs in, then the header and the two share tiles each rise on their
 * own short delay. Dismissal is a single quick ease-in.
 *
 * The tray is self-contained and renders its own backdrop overlay.
 */

import React, { memo, useEffect } from 'react';
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
import { Image as ImageIcon, FileText, Download, type LucideIcon } from 'lucide-react-native';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import { CloseButton } from '@/components/round-button';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

// ─── Constants ────────────────────────────────────────────────────────────

const TRAY_HEIGHT = 240;
/** Gap between the floating tray and the screen edges. */
const INSET = 10;

/** Maya spring — snappy, slight overshoot for user-triggered entrance. */
const SPRING_IN = { damping: 22, stiffness: 280, mass: 0.8 };
/** Maya ease-in — exits faster than entrance (150ms feel). */
const TIMING_OUT = { duration: 180 };

/** Each block of the tray rises on its own beat after the tray lands. */
const rise = (delay: number) => FadeInDown.delay(delay).duration(320).withInitialValues({ transform: [{ translateY: 10 }] });

// ─── Types ────────────────────────────────────────────────────────────────

interface ShareTrayProps {
  visible: boolean;
  /** Is the current slide a media item (vs text)? */
  currentSlideIsMedia: boolean;
  onClose: () => void;
  onExportCanvas: () => void;
  onShareOriginal: () => void;
}

// ─── Share Tile ───────────────────────────────────────────────────────────

interface ShareTileProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  /** The primary tile is filled with the ink colour and carries the card's hatching. */
  primary?: boolean;
  onPress: () => void;
}

const ShareTile = memo(function ShareTile({ icon: Icon, label, hint, primary, onPress }: ShareTileProps) {
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
        primary
          ? { backgroundColor: theme.text, borderColor: theme.text }
          : { backgroundColor: theme.background, borderColor: theme.border },
        pressed && s.pressed,
      ]}
    >
      {primary && <DiagonalStripes color={theme.background} opacity={0.08} />}
      <Icon size={20} color={fg} />
      <View style={s.tileText}>
        <Text style={[s.tileLabel, { color: fg }]}>{label}</Text>
        <Text style={[s.tileHint, { color: primary ? theme.background : theme.textMuted }, primary && s.tileHintOnInk]}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── ShareTray ────────────────────────────────────────────────────────────

export const ShareTray = memo(function ShareTray({
  visible,
  currentSlideIsMedia,
  onClose,
  onExportCanvas,
  onShareOriginal,
}: ShareTrayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // 0 = off-screen (below), 1 = fully visible
  const progress = useSharedValue(0);
  // Track mount state for the portal
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, SPRING_IN);
    } else if (mounted) {
      progress.value = withTiming(0, TIMING_OUT, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
  }));

  const trayStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [TRAY_HEIGHT + insets.bottom + 40, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!mounted) return null;

  const bottomGap = Math.max(insets.bottom - 14, INSET);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10000, elevation: 1000 }]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[s.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close share menu" />
      </Animated.View>

      {/* Tray */}
      <Animated.View
        style={[
          s.tray,
          trayStyle,
          { bottom: bottomGap, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <Animated.View entering={rise(60)} style={s.header}>
          <Text style={[Type.rail, { color: theme.textMuted }]}>SHARE</Text>
          <CloseButton onPress={onClose} accessibilityLabel="Close share menu" />
        </Animated.View>

        <Animated.View entering={rise(110)} style={s.tiles}>
          <ShareTile
            primary
            icon={ImageIcon}
            label="Canvas"
            hint="AS AN IMAGE"
            onPress={() => { onClose(); onExportCanvas(); }}
          />
          <ShareTile
            icon={currentSlideIsMedia ? Download : FileText}
            label="Original"
            hint={currentSlideIsMedia ? 'THE FILE ITSELF' : 'JUST THE WORDS'}
            onPress={() => { onClose(); onShareOriginal(); }}
          />
        </Animated.View>

      </Animated.View>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  tray: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    borderRadius: 34,
    borderWidth: 1,
    padding: 21,
    paddingTop: 18,
    gap: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    height: 112,
    padding: 16,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileText: {
    gap: 4,
  },
  tileLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  tileHint: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  tileHintOnInk: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.75,
  },
});
