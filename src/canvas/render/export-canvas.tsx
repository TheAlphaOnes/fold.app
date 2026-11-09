/**
 * ExportCanvas — an offscreen 9:16 copy of a memory, captured as a full
 * 1080×1920 story image when sharing "as a card". Fold's crane sits in the
 * bottom corner as a quiet signature.
 */

import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CanvasView } from '@/canvas/render/canvas-view';
import { EXPORT_SIZE } from '@/canvas/geometry';
import { useCanvasOf } from '@/canvas/use-canvas-of';
import { Logo } from '@/components/logo';
import type { Composition } from '@/types/journal';

/** Layout size of the offscreen view; the capture scales it to EXPORT_SIZE. */
const LAYOUT = { width: 360, height: 640 };

export const ExportCanvas = forwardRef<View, { memory: Composition }>(function ExportCanvas({ memory }, ref) {
  const doc = useCanvasOf(memory);
  if (!doc) return null;
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={LAYOUT}>
        <CanvasView doc={doc} memory={memory} width={LAYOUT.width} height={LAYOUT.height} animated={false} />
        <View style={styles.signature}>
          <Logo size={28} color="#FFFFFF" />
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
    right: 14,
    bottom: 14,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
});
