/**
 * GuideTabHint — a one-time label beside the Field Guide tab on the home
 * screen: "your guide lives here". It slides out from the tab, waits a few
 * seconds and fades; tapping it dismisses it early. Shown once, ever.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';

import { EDGE_TAB_GAP, EDGE_TAB_HEIGHT, EDGE_TAB_WIDTH } from '@/components/edge-tab';
import { ThemedText } from '@/components/themed-text';
import { EASE_IN, EASE_OUT } from '@/constants/motion';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';

const ENTER_DELAY_MS = 900;
const HOLD_MS = 5200;

export function GuideTabHint({ slot }: { slot: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const introduced = useSettingsStore((state) => state.settings.guideTabIntroduced);
  const hasOnboarded = useSettingsStore((state) => state.settings.hasOnboarded);
  const [visible, setVisible] = useState(false);

  // Three clocks: the label slides, its text fades a beat later, the arrow
  // nudges toward the tab last.
  const slide = useSharedValue(0);
  const text = useSharedValue(0);
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (introduced || !hasOnboarded) return;
    setVisible(true);
    // Marked at once: seen, even if the app closes mid-hint.
    void useSettingsStore.getState().updateSetting('guideTabIntroduced', true);
    slide.value = withDelay(ENTER_DELAY_MS, withTiming(1, { duration: 420, easing: EASE_OUT }));
    text.value = withDelay(ENTER_DELAY_MS + 120, withTiming(1, { duration: 360, easing: EASE_OUT }));
    nudge.value = withDelay(ENTER_DELAY_MS + 380, withTiming(1, { duration: 520, easing: EASE_OUT }));
  }, [introduced, hasOnboarded, slide, text, nudge]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), ENTER_DELAY_MS + HOLD_MS);
    return () => clearTimeout(timer);
    // dismiss only touches shared values and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    text.value = withTiming(0, { duration: 160, easing: EASE_IN });
    slide.value = withDelay(60, withTiming(0, { duration: 260, easing: EASE_IN }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    }));
  };

  const pillStyle = useAnimatedStyle(() => ({
    opacity: slide.value,
    transform: [{ translateX: (1 - slide.value) * 24 }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: nudge.value,
    transform: [{ translateX: (nudge.value - 1) * 6 }],
  }));

  if (!visible) return null;

  const top = Math.max(insets.top, 20) + slot * (EDGE_TAB_HEIGHT + EDGE_TAB_GAP);

  return (
    <Animated.View style={[styles.wrap, { top }, pillStyle]}>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Your guide lives here. Dismiss"
        style={[styles.pill, { backgroundColor: theme.text }]}
      >
        <Animated.View style={textStyle}>
          <ThemedText style={[styles.text, { color: theme.background }]}>your guide lives here</ThemedText>
        </Animated.View>
        <Animated.View style={arrowStyle}>
          <ArrowRight size={14} color={theme.accentWarm} strokeWidth={2.25} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: EDGE_TAB_WIDTH + 8,
    height: EDGE_TAB_HEIGHT,
    justifyContent: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  text: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
