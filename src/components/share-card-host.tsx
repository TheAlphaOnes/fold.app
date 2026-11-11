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
import { ActivityIndicator, Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { animatedPlan, hasAnimatedContent, type AnimatedPlan, type GifFrameSet } from '@/canvas/animated-export';
import { ExportCanvas, captureExport } from '@/canvas/render/export-canvas';
import { AnimatedExportCanvas, captureAnimatedFrame, decodeGifStickers, encodeExportGif, writeGifFile } from '@/canvas/render/animated-export-canvas';
import type { RgbaFrame } from '@/canvas/gif-codec';
import { legacyCardFor } from '@/canvas/use-canvas-of';
import { canvasOf } from '@/templates/legacy';
import type { DoodleLayer } from '@/canvas/types';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { ThemedText } from '@/components/themed-text';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import type { Composition } from '@/types/journal';

/** The bird's hang and flight; the share sheet opens as it leaves. */
const FLIGHT_MS = 1500;
/** A beat after the card mounts for its photos to decode before it's captured. */
const SETTLE_MS = 280;
/** A beat per captured frame for the doodle's paths and a sticker's frame to land. */
const FRAME_SETTLE_MS = 60;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Two frames: the card commits one, the native side draws the next. */
const paint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/** What the share produced: the file to hand over, its type, and how it's counted. */
interface PreparedShare {
  uri: string;
  mimeType: string;
  method: 'card' | 'card_gif';
}

export function useShareCard() {
  const { width, height } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const frameRef = useRef<View>(null);
  const [memory, setMemory] = useState<Composition | null>(null);
  const [animated, setAnimated] = useState<{ plan: AnimatedPlan; gifs: Map<string, GifFrameSet> } | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const busy = useRef(false);

  /** The still card: mount, settle, capture as a 4K JPEG. */
  const shareAsStill = useCallback(async (target: Composition): Promise<PreparedShare> => {
    setMemory(target);
    await paint();
    await wait(SETTLE_MS);
    return { uri: await captureExport(cardRef), mimeType: 'image/jpeg', method: 'card' };
  }, []);

  /** The animated card: film the stepped canvas frame by frame, encode, write. */
  const shareAsGif = useCallback(async (target: Composition, state: { plan: AnimatedPlan; gifs: Map<string, GifFrameSet> }): Promise<PreparedShare> => {
    setAnimated(state);
    setMemory(target);
    await paint();
    await wait(SETTLE_MS);
    const frames: RgbaFrame[] = [];
    for (let i = 0; i < state.plan.frameCount; i++) {
      setFrameIndex(i);
      await paint();
      await wait(FRAME_SETTLE_MS);
      frames.push(await captureAnimatedFrame(frameRef));
    }
    return { uri: await writeGifFile(encodeExportGif(frames, state.plan.stepMs)), mimeType: 'image/gif', method: 'card_gif' };
  }, []);

  const share = useCallback(
    async (target: Composition, onShared?: () => void) => {
      if (busy.current) return;
      busy.current = true;
      haptic.tap();
      setPreparing(true);
      try {
        // The branch is decided before anything mounts: a memory with a
        // doodle or a GIF sticker in it shares as a looping GIF, so the
        // card keeps its life; everything else stays a still photo.
        const doc = canvasOf(target, legacyCardFor(width, height));
        const doodles = doc.layers.filter((l): l is DoodleLayer => l.kind === 'doodle');
        const prepared = hasAnimatedContent(doc, target.mediaElements)
          ? await shareAsGif(target, { plan: animatedPlan(doodles), gifs: await decodeGifStickers(target.mediaElements) })
          : await shareAsStill(target);
        setPreparing(false);
        // The image is ready: now the bird carries it off.
        haptic.thud();
        setFlightKey((k) => k + 1);
        await wait(FLIGHT_MS);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(prepared.uri, { dialogTitle: 'Share Memory Card', mimeType: prepared.mimeType });
          track('memory_shared', { method: prepared.method });
          onShared?.();
        }
      } catch (error) {
        console.warn('Failed to share memory card', error);
        Alert.alert('Couldn’t share', 'Please try again.');
      } finally {
        setPreparing(false);
        setMemory(null);
        setAnimated(null);
        setFrameIndex(0);
        busy.current = false;
      }
    },
    [width, height, shareAsStill, shareAsGif],
  );

  const overlay = (
    <>
      {/* The offscreen copy that becomes the image: the animated canvas when
          the share is a GIF, the still one otherwise. */}
      {memory ? (
        animated ? (
          <AnimatedExportCanvas ref={frameRef} memory={memory} frameIndex={frameIndex} stepMs={animated.plan.stepMs} gifs={animated.gifs} />
        ) : (
          <ExportCanvas ref={cardRef} memory={memory} />
        )
      ) : null}
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
