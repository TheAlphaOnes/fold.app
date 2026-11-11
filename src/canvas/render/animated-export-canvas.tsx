/**
 * AnimatedExportCanvas — the offscreen copy used when a memory shares as a
 * looping GIF (it has a doodle or a GIF sticker). Smaller than the still
 * export (a GIF's file grows with its pixels), and stepped frame by frame:
 * the capture loop sets `frameIndex`, the canvas draws the exact animation
 * state at that moment, and each capture becomes one GIF frame.
 *
 * The whole pipeline is pure JS: decode stickers with gifuct-js, capture
 * the canvas as PNGs, decode those with upng-js, encode with gifenc — no
 * native video machinery anywhere.
 */

import React, { forwardRef } from 'react';
import { PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';

import { GIF_EXPORT_SIZE, type GifFrameSet } from '@/canvas/animated-export';
import { CanvasView } from '@/canvas/render/canvas-view';
import { base64ToBytes, bytesToBase64, decodeGifFrames, encodeAnimatedGif, pngToRgba, rgbaToGifDataUri, type RgbaFrame } from '@/canvas/gif-codec';
import { useCanvasOf } from '@/canvas/use-canvas-of';
import { Logo } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';
import type { Composition, MediaElement } from '@/types/journal';
import { isGifMedia } from '@/utils/media-kind';

/** Layout size in points: the native snapshot lands on GIF_EXPORT_SIZE exactly. */
const LAYOUT = { width: GIF_EXPORT_SIZE.width / PixelRatio.get(), height: GIF_EXPORT_SIZE.height / PixelRatio.get() };
/** The signature's size as a share of the card width (same mark as the still export). */
const MARK = LAYOUT.width * 0.16;

export interface AnimatedExportCanvasProps {
  memory: Composition;
  /** Which step of the timeline is on screen: the moment this capture will film. */
  frameIndex: number;
  stepMs: number;
  /** Pre-decoded GIF stickers, keyed by media id (empty for doodle-only memories). */
  gifs: Map<string, GifFrameSet>;
}

export const AnimatedExportCanvas = forwardRef<View, AnimatedExportCanvasProps>(function AnimatedExportCanvas({ memory, frameIndex, stepMs, gifs }, ref) {
  const doc = useCanvasOf(memory);
  const theme = useTheme();
  if (!doc) return null;
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={LAYOUT}>
        <CanvasView doc={doc} memory={memory} width={LAYOUT.width} height={LAYOUT.height} animated={false} exportFrame={{ tMs: frameIndex * stepMs, gifs }} />
        <View style={styles.signature}>
          <Logo size={MARK} color={theme.text} />
        </View>
      </View>
    </View>
  );
});

/**
 * Pre-decodes the memory's GIF stickers into still frames, so the export
 * can show an exact frame at an exact moment — the live picker plays them
 * on the native clock, which can't be stepped. Each frame becomes a
 * single-frame GIF data URI, the one still-image form that keeps a
 * sticker's transparent pixels. A sticker that fails to decode is simply
 * left out: it keeps playing live during capture, degraded but present.
 */
export async function decodeGifStickers(media: MediaElement[]): Promise<Map<string, GifFrameSet>> {
  const out = new Map<string, GifFrameSet>();
  const stickers = media.filter((m) => isGifMedia(m));
  await Promise.all(
    stickers.map(async (m) => {
      try {
        const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
        const decoded = decodeGifFrames(base64ToBytes(b64));
        const frames = decoded.frames.map((f) => ({ uri: rgbaToGifDataUri(f.rgba, decoded.width, decoded.height), delayMs: f.delayMs }));
        if (frames.length > 0) out.set(m.id, { frames, durationMs: frames.reduce((t, f) => t + f.delayMs, 0) });
      } catch (error) {
        console.warn('Skipping GIF sticker in the animated export', error);
      }
    }),
  );
  return out;
}

/**
 * Captures one frame of the animated export as raw pixels: a PNG snapshot
 * of the offscreen canvas (renderInContext, like the still export — the
 * fast snapshot refuses parked views), decoded back to RGBA for gifenc.
 */
export async function captureAnimatedFrame(ref: React.RefObject<View | null>): Promise<RgbaFrame> {
  const b64 =
    Platform.OS === 'ios'
      ? await captureRef(ref, { format: 'png', result: 'base64', useRenderInContext: true })
      : await captureRef(ref, { format: 'png', result: 'base64', width: GIF_EXPORT_SIZE.width, height: GIF_EXPORT_SIZE.height });
  return pngToRgba(base64ToBytes(b64));
}

/** Encodes the captured frames into the looping GIF that gets shared. */
export function encodeExportGif(frames: RgbaFrame[], stepMs: number): Uint8Array {
  return encodeAnimatedGif(frames, stepMs);
}

/** Writes the encoded GIF to the app cache, ready for the share sheet. */
export async function writeGifFile(bytes: Uint8Array): Promise<string> {
  const path = `${FileSystem.cacheDirectory}memory_card_${Date.now()}.gif`;
  await FileSystem.writeAsStringAsync(path, bytesToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

const styles = StyleSheet.create({
  // Laid out and fully drawn, but parked past the right edge of the
  // screen (iOS won't snapshot an offscreen view the fast way).
  offscreen: { position: 'absolute', top: 0, left: 10000, zIndex: -100 },
  signature: {
    position: 'absolute',
    right: LAYOUT.width * 0.04,
    bottom: LAYOUT.width * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.95,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: LAYOUT.width * 0.012,
    shadowOffset: { width: 0, height: 1 },
  },
});
