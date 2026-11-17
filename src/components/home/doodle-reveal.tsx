/**
 * DoodleReveal — the moment a day's doodle is earned. After the first memory
 * kept on a day, home shows the doodle drawing itself in, with a little pop
 * and sparkle, its serial and its name. The very first memory ever gets the
 * larger version that explains the almanac.
 *
 * Share sends the doodle card (the same picture as the spotlight's); the
 * other action opens the almanac. Tap outside to close.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Share2, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { DoodleView } from '@/canvas/render/doodle-view';
import type { DoodleLayer } from '@/canvas/types';
import { DoodleShareCard, shareDoodleCard } from '@/components/almanac/doodle-share-card';
import { BalancedText } from '@/components/balanced-text';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { POP } from '@/doodles/day-doodle';
import { doodleForDate, serialOf, slotOf } from '@/doodles/library';
import { hueOf, strokeHex } from '@/doodles/palette';
import { useDoodleRevealStore } from '@/hooks/use-doodle-reveal';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { navigate } from '@/utils/navigation';
import { longDate } from '@/widgets/model';

/** Four sparkles around the doodle, each arriving on its own beat. */
const SPARKLES = [
  { x: -0.42, y: -0.34, size: 14, delay: 520 },
  { x: 0.4, y: -0.2, size: 10, delay: 640 },
  { x: 0.34, y: 0.36, size: 12, delay: 760 },
  { x: -0.36, y: 0.3, size: 9, delay: 880 },
] as const;

export function DoodleReveal() {
  const reveal = useDoodleRevealStore((state) => state.reveal);
  const dismiss = useDoodleRevealStore((state) => state.dismiss);
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<React.ComponentRef<typeof View>>(null);

  const today = new Date();
  const doodle = doodleForDate(today);
  const serial = serialOf(slotOf(today));
  const kept = `kept ${longDate(today.getTime())}`;
  const size = Math.min(reveal?.first ? 280 : 220, width - 120);

  const layer = useMemo<DoodleLayer>(() => {
    const hue = hueOf(doodle.strokes);
    return {
      id: `reveal-${doodle.name}`,
      kind: 'doodle',
      x: 0.5,
      y: 0.5,
      scale: 0.8,
      rotation: 0,
      color: null,
      width: 0.022,
      strokes: doodle.strokes.map((s) => ({ points: s.points, color: strokeHex(s.ink, hue) })),
    };
  }, [doodle]);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    haptic.tap();
    try {
      await shareDoodleCard(shareRef, `Share ${doodle.name}`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={reveal !== null} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close">
        {reveal && (
          <Animated.View
            entering={reduced ? undefined : POP}
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Pressable onPress={() => undefined} style={styles.inner}>
              <ThemedText style={[Type.rail, { color: theme.accentWarm }]}>
                {reveal.first ? 'YOUR FIRST DOODLE' : 'EARNED TODAY'}
              </ThemedText>

              <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <DoodleView layer={layer} width={size} moving />
                {!reduced &&
                  SPARKLES.map((s, i) => (
                    <Animated.View
                      key={i}
                      entering={ZoomIn.delay(s.delay).duration(260)}
                      style={[styles.sparkle, { left: size / 2 + s.x * size, top: size / 2 + s.y * size }]}
                    >
                      <Sparkles size={s.size} color={theme.accentWarm} />
                    </Animated.View>
                  ))}
              </View>

              <Animated.View entering={reduced ? undefined : FadeIn.delay(380).duration(260)} style={styles.caption}>
                <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{serial}</ThemedText>
                <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
                {reveal.first ? (
                  <BalancedText style={[styles.firstLine, { color: theme.textMuted }]}>
                    one for every day you keep. 365 to go.
                  </BalancedText>
                ) : (
                  <ThemedText style={[styles.date, { color: theme.textMuted }]}>{kept}</ThemedText>
                )}
              </Animated.View>

              <Animated.View entering={reduced ? undefined : FadeIn.delay(560).duration(260)} style={styles.actions}>
                <Pressable
                  onPress={() => {
                    haptic.press();
                    dismiss();
                    navigate.push('/almanac');
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.open, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <ThemedText style={[Type.rail, { color: theme.text }]}>SEE YOUR ALMANAC</ThemedText>
                </Pressable>
                <Pressable
                  onPress={share}
                  disabled={sharing}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${doodle.name}`}
                  style={({ pressed }) => [styles.share, { borderColor: theme.border, opacity: pressed || sharing ? 0.6 : 1 }]}
                >
                  <Share2 size={15} color={theme.text} />
                </Pressable>
              </Animated.View>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
      {/* The share image, laid out off screen and captured on demand. */}
      {reveal && <DoodleShareCard ref={shareRef} doodle={doodle} serial={serial} date={kept} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000B3' },
  card: { borderWidth: 1, borderRadius: 18 },
  inner: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 22 },
  sparkle: { position: 'absolute' },
  caption: { alignItems: 'center', gap: 4, marginTop: 4 },
  name: { fontFamily: 'JetBrainsMono-Medium', fontSize: 16 },
  date: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  firstLine: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 240 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  open: { height: 38, justifyContent: 'center', borderWidth: 1, borderRadius: 19, paddingHorizontal: 18 },
  share: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 19 },
});
