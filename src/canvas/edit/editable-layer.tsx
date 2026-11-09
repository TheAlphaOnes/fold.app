/**
 * EditableLayer — a text or sticker on the composer canvas: drag to move,
 * pinch to resize, twist to rotate (all at once), tap to select (and, for
 * text, to edit). While dragging, the centre guides light up and the layer
 * snaps to them; dropping it on the trash at the bottom deletes it.
 *
 * Gestures run on the UI thread with shared values; the doc is updated
 * once, when the gesture ends.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { clamp, snapRotation, snapToCentre } from '@/canvas/geometry';
import { haptic } from '@/services/haptics';
import type { Layer } from '@/canvas/types';
import { anchorBox } from '@/canvas/render/canvas-view';

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
  onChange: (patch: Pick<Layer, 'x' | 'y' | 'scale' | 'rotation'>) => void;
  onTap: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  children: React.ReactNode;
}

export function EditableLayer({ layer, width, height, selected, signals, onChange, onTap, onDelete, onDragStart, children }: EditableLayerProps) {
  const x = useSharedValue(layer.x);
  const y = useSharedValue(layer.y);
  // Pinch acts as a live multiplier on the committed scale; reset after commit.
  const pinchScale = useSharedValue(1);
  const rotation = useSharedValue(layer.rotation);
  // Each gesture keeps its own starting point, so one joining mid-way
  // (a twist after a drag began) never re-counts what another already did.
  const panStart = useSharedValue({ x: layer.x, y: layer.y });
  const rotateStart = useSharedValue(layer.rotation);
  // Whether the twist is resting on straight, so the tick plays once on arrival.
  const level = useSharedValue(false);
  // Gestures in progress on this layer; it commits once, when all have ended.
  const running = useSharedValue(0);
  // This layer is being dragged (the drag signals are shared by all layers).
  const active = useSharedValue(false);

  useEffect(() => {
    x.set(layer.x);
    y.set(layer.y);
    rotation.set(layer.rotation);
    pinchScale.set(1);
  }, [layer.x, layer.y, layer.rotation, layer.scale, x, y, rotation, pinchScale]);

  const begin = () => {
    'worklet';
    running.set(running.get() + 1);
  };

  const end = () => {
    'worklet';
    running.set(Math.max(0, running.get() - 1));
    if (running.get() > 0) return;
    const deleting = active.get() && signals.overTrash.get();
    active.set(false);
    signals.dragging.set(false);
    signals.overTrash.set(false);
    signals.snapX.set(false);
    signals.snapY.set(false);
    if (deleting) {
      runOnJS(onDelete)();
      return;
    }
    const scale = clamp(layer.scale * pinchScale.get(), 0.25, 6);
    // Show exactly the committed size now; if the clamp left the scale
    // unchanged no re-render resets it, so it must not stay stretched.
    pinchScale.set(scale / layer.scale);
    runOnJS(onChange)({ x: x.get(), y: y.get(), scale, rotation: rotation.get() });
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      begin();
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
    .onEnd(end);

  const pinch = Gesture.Pinch()
    .onStart(begin)
    .onUpdate((e) => {
      pinchScale.set(e.scale);
    })
    .onEnd(end);

  const rotate = Gesture.Rotation()
    .onStart(() => {
      begin();
      rotateStart.set(rotation.get());
      level.set(false);
    })
    .onUpdate((e) => {
      const next = snapRotation(rotateStart.get() + (e.rotation * 180) / Math.PI);
      rotation.set(next.rotation);
      if (next.snapped && !level.get()) runOnJS(haptic.select)();
      level.set(next.snapped);
    })
    .onEnd(end);

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pan, pinch, rotate), tap);

  const box = anchorBox(width, height);
  const style = useAnimatedStyle(() => ({
    left: x.get() * width - box / 2,
    top: y.get() * height - box / 2,
    transform: [{ rotate: `${rotation.get()}deg` }, { scale: pinchScale.get() * (active.get() && signals.overTrash.get() ? 0.6 : 1) }],
    opacity: active.get() && signals.overTrash.get() ? 0.6 : 1,
  }));

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
