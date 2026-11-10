/**
 * CanvasEditor — the interactive canvas in the composer. Same base and
 * layer looks as CanvasView, with:
 *   - the Story background and grid cells framed by pinch/pan;
 *   - grid cells filled by a tap, swapped by hold-then-tap;
 *   - layers moved/resized/rotated, tapped to select or edit text;
 *   - centre guides while dragging, and a trash target at the bottom.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Plus, Trash2 } from 'lucide-react-native';

import { CanvasBase, type FrameRenderers } from '@/canvas/render/canvas-base';
import { LayerContent } from '@/canvas/render/canvas-view';
import { EditableFrame } from '@/canvas/edit/editable-frame';
import { EditableLayer, type DragSignals } from '@/canvas/edit/editable-layer';
import { useTwist } from '@/canvas/edit/use-twist';
import type { CanvasDoc, Crop, Layer } from '@/canvas/types';
import { haptic } from '@/services/haptics';
import type { Composition, MediaElement } from '@/types/journal';

interface CanvasEditorProps {
  doc: CanvasDoc;
  media: MediaElement[];
  memory: Pick<Composition, 'id' | 'createdAt' | 'location'>;
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** The photo frame selected for Replace / Flip / Remove ('background' or a cell id). */
  selectedFrame?: string | null;
  /** Without it (the guide's sample canvas) a tap on a photo selects nothing. */
  onSelectFrame?: (target: string | null) => void;
  onLayerChange: (id: string, patch: Partial<Layer>) => void;
  onLayerDelete: (id: string) => void;
  onEditText: (id: string) => void;
  onCrop: (target: string, crop: Crop) => void;
  onFillCell: (cellId: string) => void;
  onSwapCells: (a: string, b: string) => void;
  /** Tap on empty canvas (no layer hit): deselect, or start typing. */
  onBackgroundTap: () => void;
}

export function CanvasEditor(props: CanvasEditorProps) {
  const { doc, media, memory, width, height, selectedId, onSelect, selectedFrame = null, onSelectFrame } = props;
  const mediaMap = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);
  const [pickedCell, setPickedCell] = useState<string | null>(null);

  const signals: DragSignals = {
    dragging: useSharedValue(false),
    overTrash: useSharedValue(false),
    snapX: useSharedValue(false),
    snapY: useSharedValue(false),
  };

  const renderers: FrameRenderers = {
    frame: (target, m, crop, w, h, mirrored, origin = { left: 0, top: 0 }) => (
      <EditableFrame
        key={`${target}-${m.id}`}
        media={m}
        crop={crop}
        width={w}
        height={h}
        mirrored={mirrored}
        onCrop={(next) => props.onCrop(target, next)}
        highlighted={pickedCell === target || selectedFrame === target}
        // The outline follows the canvas's rounded corners wherever this frame reaches one.
        highlightRadii={cornerRadii(origin.left, origin.top, w, h, width, height, CANVAS_RADIUS)}
        onTap={() => {
          // Holding a cell, a tap on another swaps them.
          if (pickedCell && pickedCell !== target) {
            haptic.select();
            props.onSwapCells(pickedCell, target);
            setPickedCell(null);
            return;
          }
          setPickedCell(null);
          // With a sticker selected, a tap on the photo just lets go of it.
          if (selectedId) {
            onSelect(null);
            return;
          }
          // Otherwise a tap selects the photo itself (tap again to let go).
          if (!onSelectFrame) return;
          haptic.select();
          onSelectFrame(selectedFrame === target ? null : target);
        }}
        onLongPress={
          target === 'background'
            ? undefined
            : () => {
                haptic.thud();
                onSelectFrame?.(null);
                setPickedCell(target);
              }
        }
      />
    ),
    emptyCell: (cellId, w, h) => (
      <Pressable
        onPress={() => {
          if (pickedCell) {
            props.onSwapCells(pickedCell, cellId);
            setPickedCell(null);
            return;
          }
          props.onFillCell(cellId);
        }}
        accessibilityRole="button"
        accessibilityLabel="Add a photo here"
        style={[StyleSheet.absoluteFill, styles.emptyCell, { width: w, height: h }]}
      >
        <View style={styles.addBadge}>
          <Plus size={18} color="#111111" />
        </View>
      </Pressable>
    ),
  };

  // Two fingers anywhere turn and resize the selected (or nearest) layer.
  const twist = useTwist({
    layers: doc.layers,
    selectedId,
    width,
    height,
    onSelect,
    onCommit: (id, patch) => props.onLayerChange(id, patch),
  });

  const guideX = useAnimatedStyle(() => ({ opacity: withTiming(signals.dragging.value && signals.snapX.value ? 1 : 0, { duration: 120 }) }));
  const guideY = useAnimatedStyle(() => ({ opacity: withTiming(signals.dragging.value && signals.snapY.value ? 1 : 0, { duration: 120 }) }));
  const trash = useAnimatedStyle(() => ({
    opacity: withTiming(signals.dragging.value ? 1 : 0, { duration: 160 }),
    transform: [{ scale: withTiming(signals.overTrash.value ? 1.25 : 1, { duration: 140 }) }],
    backgroundColor: signals.overTrash.value ? '#FF3B30' : '#00000088',
  }));

  return (
    <GestureDetector gesture={twist.gesture}>
    <View style={[styles.canvas, { width, height }]} collapsable={false}>
      {/* Taps that reach the bare canvas deselect / start typing. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onBackgroundTap} accessible={false} />
      <CanvasBase doc={doc} media={mediaMap} width={width} height={height} playing={false} animated renderers={renderers} />

      {doc.layers.map((layer) => (
        <EditableLayer
          key={layer.id}
          layer={layer}
          width={width}
          height={height}
          selected={selectedId === layer.id}
          signals={signals}
          twist={twist.signals}
          onDragStart={() => onSelect(layer.id)}
          onMove={(patch) => props.onLayerChange(layer.id, patch)}
          onDelete={() => {
            haptic.warning();
            props.onLayerDelete(layer.id);
          }}
          onTap={() => {
            // Text opens for editing; stickers toggle selection (for shape / front).
            if (layer.kind === 'text') props.onEditText(layer.id);
            else onSelect(selectedId === layer.id ? null : layer.id);
          }}
        >
          <LayerContent layer={layer} media={mediaMap} memory={{ ...memory, mediaElements: media }} width={width} live={false} moving />
        </EditableLayer>
      ))}

      <Animated.View pointerEvents="none" style={[styles.guideV, { left: width / 2 }, guideX]} />
      <Animated.View pointerEvents="none" style={[styles.guideH, { top: height / 2 }, guideY]} />
      <Animated.View pointerEvents="none" style={[styles.trash, { left: width / 2 - 26 }, trash]}>
        <Trash2 size={22} color="#FFFFFF" />
      </Animated.View>
    </View>
    </GestureDetector>
  );
}

/** The editing canvas's corner radius. */
const CANVAS_RADIUS = 24;

/** Rounded corners for a frame inside the canvas: only the corners that touch the canvas's own corners. */
function cornerRadii(left: number, top: number, w: number, h: number, cw: number, ch: number, r: number) {
  const atLeft = left <= 0.5;
  const atTop = top <= 0.5;
  const atRight = left + w >= cw - 0.5;
  const atBottom = top + h >= ch - 0.5;
  return {
    borderTopLeftRadius: atTop && atLeft ? r : 0,
    borderTopRightRadius: atTop && atRight ? r : 0,
    borderBottomRightRadius: atBottom && atRight ? r : 0,
    borderBottomLeftRadius: atBottom && atLeft ? r : 0,
  };
}

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden', borderRadius: CANVAS_RADIUS },
  emptyCell: { alignItems: 'center', justifyContent: 'center' },
  addBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#F27A1A' },
  guideH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#F27A1A' },
  trash: {
    position: 'absolute',
    bottom: 22,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
