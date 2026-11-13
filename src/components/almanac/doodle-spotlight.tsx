/**
 * DoodleSpotlight — one earned doodle, large. The card pops in and the
 * doodle draws itself stroke by stroke (the canvas engine's own draw-in,
 * which a single doodle can afford), then keeps its boil. Below it: its
 * serial and name, the date it was earned, a way into that day, and a
 * share button: the doodle set on Fold's hatch with the crane in the
 * corner, captured as an image. Tap outside to close.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { DoodleView } from '@/canvas/render/doodle-view';
import type { DoodleLayer } from '@/canvas/types';
import { DiagonalStripes } from '@/components/diagonal-stripes';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import type { AlmanacDay } from '@/doodles/almanac';
import { DayDoodle, POP } from '@/doodles/day-doodle';
import { DOODLES, serialOf } from '@/doodles/library';
import { hueOf, strokeHex } from '@/doodles/palette';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { longDate } from '@/widgets/model';

interface DoodleSpotlightProps {
  day: AlmanacDay | null;
  onClose: () => void;
  onOpenDay: (day: AlmanacDay) => void;
}

export function DoodleSpotlight({ day, onClose, onOpenDay }: DoodleSpotlightProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const size = Math.min(260, width - 120);
  const doodle = day ? DOODLES[day.slot] : null;
  const shareRef = useRef<React.ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);
  const kept = day ? `kept ${longDate(new Date(`${day.key}T12:00:00`).getTime())}` : '';

  const share = async () => {
    if (sharing || !doodle) return;
    setSharing(true);
    haptic.tap();
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: `Share ${doodle.name}`, mimeType: 'image/png' });
    } catch (error) {
      console.warn('Failed to share doodle', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const layer = useMemo<DoodleLayer | null>(() => {
    if (!doodle) return null;
    const hue = hueOf(doodle.strokes);
    return {
      id: `spotlight-${doodle.name}`,
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

  return (
    <Modal visible={day !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        {day && doodle && layer && (
          <Animated.View entering={reduced ? undefined : POP} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Pressable onPress={() => undefined} style={styles.inner}>
              <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <DoodleView layer={layer} width={size} moving />
              </View>
              <Animated.View entering={reduced ? undefined : FadeIn.delay(380).duration(260)} style={styles.caption}>
                <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{serialOf(day.slot)}</ThemedText>
                <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
                <ThemedText style={[styles.date, { color: theme.textMuted }]}>{kept}</ThemedText>
              </Animated.View>
              <Animated.View entering={reduced ? undefined : FadeIn.delay(560).duration(260)} style={styles.actions}>
                <Pressable
                  onPress={() => onOpenDay(day)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.open, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <ThemedText style={[Type.rail, { color: theme.text }]}>OPEN THIS DAY</ThemedText>
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
      {day && doodle && (
        <View ref={shareRef} collapsable={false} style={[styles.shareCard, { backgroundColor: theme.backgroundElement }]}>
          <DiagonalStripes color={theme.textMuted} opacity={0.14} />
          <DayDoodle doodle={doodle} size={250} moving={false} />
          <ThemedText style={[Type.rail, { color: theme.textMuted, marginTop: 6 }]}>{serialOf(day.slot)}</ThemedText>
          <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
          <ThemedText style={[styles.date, { color: theme.textMuted }]}>{kept}</ThemedText>
          <View style={styles.logo}>
            <Logo size={30} color={theme.text} />
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000B3' },
  card: { borderWidth: 1, borderRadius: 18 },
  inner: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 22 },
  caption: { alignItems: 'center', gap: 4, marginTop: 4 },
  name: { fontFamily: 'JetBrainsMono-Medium', fontSize: 16 },
  date: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  open: { height: 38, justifyContent: 'center', borderWidth: 1, borderRadius: 19, paddingHorizontal: 18 },
  share: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 19 },
  shareCard: { position: 'absolute', left: -10000, top: 0, width: 360, height: 400, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { position: 'absolute', right: 20, bottom: 20 },
});
