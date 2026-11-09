/**
 * EditableLayer — a text or sticker on the composer canvas: drag with one
 * finger to move, tap to select (and, for text, to edit). While dragging,
 * the centre guides light up and the layer snaps to them; dropping it on
 * the trash at the bottom deletes it.
 *
 * Turning and resizing are two-finger gestures owned by the canvas (see
 * useTwist), so they work with fingers anywhere, not only on the layer.
 * While a twist targets this layer it draws the twist's live values.
 *
 * Gestures run on the UI thread with shared values; the doc is updated
 * once, when the gesture ends. This layer commits only its position; the
 * twist commits scale and rotation, so neither overwrites the other.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { clamp, snapToCentre } from '@/canvas/geometry';
import type { Layer } from '@/canvas/types';
import { anchorBox } from '@/canvas/render/canvas-view';
import type { TwistSignals } from '@/canvas/edit/use-twist';

/** Normalised area at the bottom centre that counts as the trash. */
export const TRASH_ZONE = { y: 0.9, halfWidth: 0.16 } as const;

export interface DragSignals {
  /** A layer is being dragged (shows the trash). */
  dragging: SharedValue<boolean>;
  overTrash: SharedValue<boolean>;
  snapX: SharedValue<boolean>;
  snapY: SharedValue<boolean>;
}

interface EditableLayerProps {
  layer: Layer;
  width: number;
  height: number;
  selected: boolean;
  signals: DragSignals;
  twist: TwistSignals;
  onMove: (patch: Pick<Layer, 'x' | 'y'>) => void;
  onTap: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  children: React.ReactNode;
}

export function EditableLayer({ layer, width, height, selected, signals, twist, onMove, onTap, onDelete, onDragStart, children }: EditableLayerProps) {
  const x = useSharedValue(layer.x);
  const y = useSharedValue(layer.y);
  const panStart = useSharedValue({ x: layer.x, y: layer.y });
  // This layer is being dragged (the drag signals are shared by all layers).
  const active = useSharedValue(false);

  useEffect(() => {
    x.set(layer.x);
    y.set(layer.y);
  }, [layer.x, layer.y, x, y]);

  // A finished twist keeps drawing its values until the committed ones
  // arrive here; then hand back to the layer's own, with no flicker.
  useEffect(() => {
    if (twist.id.get() === layer.id) twist.id.set('');
  }, [layer.scale, layer.rotation, layer.id, twist.id]);

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      panStart.set({ x: x.get(), y: y.get() });
      active.set(true);
      signals.dragging.set(true);
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      const raw = { x: panStart.get().x + e.translationX / width, y: panStart.get().y + e.translationY / height };
      const snapped = snapToCentre(clamp(raw.x, 0, 1), clamp(raw.y, 0, 1.05));
      x.set(snapped.x);
      y.set(snapped.y);
      signals.snapX.set(snapped.snappedX);
      signals.snapY.set(snapped.snappedY);
      signals.overTrash.set(raw.y > TRASH_ZONE.y && Math.abs(raw.x - 0.5) < TRASH_ZONE.halfWidth);
    })
    .onFinalize(() => {
      if (!active.get()) return;
      const deleting = signals.overTrash.get();
      active.set(false);
      signals.dragging.set(false);
      signals.overTrash.set(false);
      signals.snapX.set(false);
      signals.snapY.set(false);
      if (deleting) runOnJS(onDelete)();
      else runOnJS(onMove)({ x: x.get(), y: y.get() });
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const box = anchorBox(width, height);
  const baseScale = layer.scale;
  const baseRotation = layer.rotation;
  const style = useAnimatedStyle(() => {
    const twisting = twist.id.get() === layer.id;
    const shrink = active.get() && signals.overTrash.get() ? 0.6 : 1;
    return {
      left: x.get() * width - box / 2,
      top: y.get() * height - box / 2,
      transform: [
        { rotate: `${twisting ? twist.rotation.get() : baseRotation}deg` },
        { scale: (twisting ? twist.scale.get() / baseScale : 1) * shrink },
      ],
      opacity: shrink < 1 ? 0.6 : 1,
    };
  });

  return (
    <Animated.View style={[styles.anchor, { width: box, height: box }, style]} pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <Animated.View style={selected ? styles.selected : undefined} collapsable={false}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 1,
    borderColor: '#FFFFFFAA',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 4,
  },
});
