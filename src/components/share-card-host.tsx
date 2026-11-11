/**
 * useShareCard — sharing a memory "as a card", the same from every place
 * that offers it (the hold menu on home, a memory's own share button).
 *
 *   1. preparing: the offscreen card is drawn and captured while a small
 *      "preparing" pill shows over a soft dim (the wait is visible, not dead);
 *   2. ready: the bird carries the card off;
 *   3. the share sheet opens with the image.
 *
 * Before, the bird flew first and the image was made after it, so the wait
 * was the whole flight plus the capture, with nothing to say why.
 */

import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ExportCanvas, captureExport } from '@/canvas/render/export-canvas';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { ThemedText } from '@/components/themed-text';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import type { Composition } from '@/types/journal';

/** The bird's hang and flight; the share sheet opens as it leaves. */
const FLIGHT_MS = 1500;
/** A beat after the card mounts for its photos to decode before it's captured. */
const SETTLE_MS = 280;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useShareCard() {
  const cardRef = useRef<View>(null);
  const [memory, setMemory] = useState<Composition | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const busy = useRef(false);

  const share = useCallback(async (target: Composition, onShared?: () => void) => {
    if (busy.current) return;
    busy.current = true;
    haptic.tap();
    setMemory(target);
    setPreparing(true);
    try {
      // Two frames to lay the card out, then a beat for its images.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await wait(SETTLE_MS);
      const uri = await captureExport(cardRef);
      setPreparing(false);
      // The image is ready: now the bird carries it off.
      haptic.thud();
      setFlightKey((k) => k + 1);
      await wait(FLIGHT_MS);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share Memory Card', mimeType: 'image/jpeg' });
        track('memory_shared', { method: 'card' });
        onShared?.();
      }
    } catch (error) {
      console.warn('Failed to share memory card', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setPreparing(false);
      setMemory(null);
      busy.current = false;
    }
  }, []);

  const overlay = (
    <>
      {/* The offscreen copy that becomes the image. */}
      {memory && <ExportCanvas ref={cardRef} memory={memory} />}
      {preparing && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="auto">
          <View style={styles.pill}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <ThemedText style={styles.pillText}>PREPARING</ThemedText>
          </View>
        </Animated.View>
      )}
      {flightKey > 0 && (
        <View style={[StyleSheet.absoluteFill, styles.flight]} pointerEvents="none">
          <LogoUploadFlight key={flightKey} />
        </View>
      )}
    </>
  );

  return { share, preparing, overlay };
}

const styles = StyleSheet.create({
  dim: { zIndex: 9000, backgroundColor: '#00000059', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#000000B3' },
  pillText: { color: '#FFFFFF', fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2 },
  flight: { zIndex: 9000, justifyContent: 'center', alignItems: 'center' },
});
