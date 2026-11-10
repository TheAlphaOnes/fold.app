/**
 * ExportCanvas — an offscreen 9:16 copy of a memory, captured as a full
 * 2160×3840 story image when sharing "as a card". Fold's crane and name
 * sit in the bottom corner as a signature that promotes the app.
 */

import React, { forwardRef } from 'react';
import { PixelRatio, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CanvasView } from '@/canvas/render/canvas-view';
import { EXPORT_SIZE } from '@/canvas/geometry';
import { useCanvasOf } from '@/canvas/use-canvas-of';
import { Logo } from '@/components/logo';
import type { Composition } from '@/types/journal';

/**
 * Layout size of the offscreen view: EXPORT_SIZE in points, so the native
 * snapshot is already full size and nothing is upscaled (which blurred
 * the crane and photos). Everything inside scales with the width.
 */
const LAYOUT = { width: EXPORT_SIZE.width / PixelRatio.get(), height: EXPORT_SIZE.height / PixelRatio.get() };
/** The signature's size as a share of the card width. */
const MARK = LAYOUT.width * 0.16;

export const ExportCanvas = forwardRef<View, { memory: Composition }>(function ExportCanvas({ memory }, ref) {
  const doc = useCanvasOf(memory);
  if (!doc) return null;
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={LAYOUT}>
        <CanvasView doc={doc} memory={memory} width={LAYOUT.width} height={LAYOUT.height} animated={false} />
        <View style={styles.signature}>
          <Logo size={MARK} color="#FFFFFF" style={styles.crane} />
          <Text style={styles.wordmark}>fold</Text>
        </View>
      </View>
    </View>
  );
});

/** Captures an ExportCanvas as a 1080×1920 PNG and returns its file URI. */
export function captureExport(ref: React.RefObject<View | null>): Promise<string> {
  return captureRef(ref, { format: 'png', quality: 1, width: EXPORT_SIZE.width, height: EXPORT_SIZE.height });
}

const styles = StyleSheet.create({
  // Invisible but laid out, so view-shot can capture it.
  offscreen: { position: 'absolute', top: 0, left: 0, opacity: 0, zIndex: -100 },
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
  // The crane's viewBox has wide margins; pull the name in close to it.
  crane: { marginRight: -MARK * 0.12 },
  wordmark: {
    color: '#FFFFFF',
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: MARK * 0.36,
    letterSpacing: MARK * 0.02,
  },
});
