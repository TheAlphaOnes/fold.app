/**
 * ShareTray — a slide-up bottom tray with horizontal share options.
 *
 * Renders two primary actions (Export as Canvas, Share Original) plus
 * app shortcuts (WhatsApp, Instagram Stories, X/Twitter). Uses Reanimated
 * spring-driven slide for entrance and ease-in for dismissal — never fade.
 *
 * The tray is self-contained and renders its own backdrop overlay.
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Image as ImageIcon,
  FileText,
  Download,
} from 'lucide-react-native';
import { IconWhatsApp, IconInstagram, IconX } from '@/components/brand-icons';
import { useTheme } from '@/hooks/use-theme';

// ─── Constants ────────────────────────────────────────────────────────────

const TRAY_HEIGHT = 200;

/** Maya spring — snappy, slight overshoot for user-triggered entrance. */
const SPRING_IN = { damping: 22, stiffness: 280, mass: 0.8 };
/** Maya ease-in — exits faster than entrance (150ms feel). */
const TIMING_OUT = { duration: 180 };

// ─── Types ────────────────────────────────────────────────────────────────

interface ShareTrayProps {
  visible: boolean;
  /** Is the current slide a media item (vs text)? */
  currentSlideIsMedia: boolean;
  onClose: () => void;
  onExportCanvas: () => void;
  onShareOriginal: () => void;
}

interface ShareItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

// ─── Share Item ───────────────────────────────────────────────────────────

const ShareItem = memo(function ShareItem({ icon, label, onPress }: ShareItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.item,
        pressed && s.itemPressed,
      ]}
    >
      <View style={[s.itemIcon, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {icon}
      </View>
      <Text
        style={[s.itemLabel, { color: theme.textMuted }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ─── App Helpers ──────────────────────────────────────────────────────────

function openApp(scheme: string, fallback: string) {
  Linking.canOpenURL(scheme)
    .then((supported) => {
      if (supported) {
        Linking.openURL(scheme);
      } else {
        Linking.openURL(fallback);
      }
    })
    .catch(() => {
      Linking.openURL(fallback).catch(() => {});
    });
}

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

  const handleWhatsApp = useCallback(() => {
    onClose();
    openApp('whatsapp://', 'https://wa.me/');
  }, [onClose]);

  const handleInstagram = useCallback(() => {
    onClose();
    const scheme = Platform.OS === 'ios'
      ? 'instagram-stories://share'
      : 'intent://share#Intent;package=com.instagram.android;scheme=instagram-stories;end';
    openApp(scheme, 'https://www.instagram.com/');
  }, [onClose]);

  const handleTwitter = useCallback(() => {
    onClose();
    openApp('twitter://', 'https://x.com/');
  }, [onClose]);

  if (!mounted) return null;

  const bottomPad = Math.max(insets.bottom, 20);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[s.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Tray */}
      <Animated.View
        style={[
          s.tray,
          trayStyle,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            paddingBottom: bottomPad,
          },
        ]}
      >
        {/* Handle */}
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Section: Primary Actions */}
        <Text style={[s.sectionLabel, { color: theme.textMuted }]}>SHARE</Text>

        <View style={s.row}>
          <ShareItem
            icon={<ImageIcon size={20} color={theme.text} />}
            label="Canvas"
            onPress={() => { onClose(); onExportCanvas(); }}
          />
          <ShareItem
            icon={
              currentSlideIsMedia
                ? <Download size={20} color={theme.text} />
                : <FileText size={20} color={theme.text} />
            }
            label="Original"
            onPress={() => { onClose(); onShareOriginal(); }}
          />

          {/* Separator */}
          <View style={[s.separator, { backgroundColor: theme.border }]} />

          {/* App Shortcuts */}
          <ShareItem
            icon={<IconWhatsApp size={22} />}
            label="WhatsApp"
            onPress={handleWhatsApp}
          />
          <ShareItem
            icon={<IconInstagram size={22} />}
            label="Instagram"
            onPress={handleInstagram}
          />
          <ShareItem
            icon={<IconX size={20} color={theme.text} />}
            label="X"
            onPress={handleTwitter}
          />
        </View>
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
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2.5,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    gap: 6,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    marginHorizontal: 6,
    marginTop: 4,
    opacity: 0.5,
  },
  item: {
    alignItems: 'center',
    width: 64,
    gap: 8,
  },
  itemPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.7,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 13,
  },
});
