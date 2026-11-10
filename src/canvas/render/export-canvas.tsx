/**
 * ExportCanvas — an offscreen 9:16 copy of a memory, captured as a full
 * 2160×3840 story image when sharing "as a card". Fold's crane sits in the
 * bottom corner as a quiet signature (the mark only, no name).
 */

import React, { forwardRef } from 'react';
import { PixelRatio, Platform, StyleSheet, View } from 'react-native';
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
          <Logo size={MARK} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
});

/**
 * Captures an ExportCanvas as a JPEG and returns its file URI (JPEG: a
 * 2160×3840 PNG took seconds to encode). On iOS the card, parked off
 * screen, is drawn with renderInContext at the device's scale, which fills
 * the whole image; the fast snapshot refuses views outside the window, and
 * forcing an output size on the fallback drew the card into one corner.
 */
export function captureExport(ref: React.RefObject<View | null>): Promise<string> {
  if (Platform.OS === 'ios') return captureRef(ref, { format: 'jpg', quality: 0.92, useRenderInContext: true });
  return captureRef(ref, { format: 'jpg', quality: 0.92, width: EXPORT_SIZE.width, height: EXPORT_SIZE.height });
}

const styles = StyleSheet.create({
  // Laid out and fully drawn, but parked past the right edge of the screen:
  // iOS won't snapshot a view at opacity 0 ("drawViewHierarchyInRect was not
  // successful"), and off-screen keeps it out of sight.
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
