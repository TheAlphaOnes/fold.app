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

import { clamp, snapToCentre } from '@/canvas/geometry';
import type { Layer } from '@/canvas/types';

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
  const start = useSharedValue({ x: layer.x, y: layer.y, rotation: layer.rotation });
  // This layer is the one being dragged (the drag signals are shared by all layers).
  const active = useSharedValue(false);

  useEffect(() => {
    x.set(layer.x);
    y.set(layer.y);
    rotation.set(layer.rotation);
    pinchScale.set(1);
  }, [layer.x, layer.y, layer.rotation, layer.scale, x, y, rotation, pinchScale]);

  const finish = () => {
    'worklet';
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
    runOnJS(onChange)({ x: x.get(), y: y.get(), scale: clamp(layer.scale * pinchScale.get(), 0.25, 6), rotation: rotation.get() });
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      start.set({ x: x.get(), y: y.get(), rotation: rotation.get() });
      active.set(true);
      signals.dragging.set(true);
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      const raw = { x: start.get().x + e.translationX / width, y: start.get().y + e.translationY / height };
      const snapped = snapToCentre(clamp(raw.x, 0, 1), clamp(raw.y, 0, 1.05));
      x.set(snapped.x);
      y.set(snapped.y);
      signals.snapX.set(snapped.snappedX);
      signals.snapY.set(snapped.snappedY);
      signals.overTrash.set(raw.y > TRASH_ZONE.y && Math.abs(raw.x - 0.5) < TRASH_ZONE.halfWidth);
    })
    .onEnd(finish);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.set(e.scale);
    })
    .onEnd(finish);

  const rotate = Gesture.Rotation()
    .onStart(() => {
      start.set({ ...start.get(), rotation: rotation.get() });
    })
    .onUpdate((e) => {
      rotation.set(start.get().rotation + (e.rotation * 180) / Math.PI);
    })
    .onEnd(finish);

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pan, pinch, rotate), tap);

  const style = useAnimatedStyle(() => ({
    left: x.get() * width,
    top: y.get() * height,
    transform: [{ rotate: `${rotation.get()}deg` }, { scale: pinchScale.get() * (active.get() && signals.overTrash.get() ? 0.6 : 1) }],
    opacity: active.get() && signals.overTrash.get() ? 0.6 : 1,
  }));

  return (
    <Animated.View style={[styles.anchor, style]} pointerEvents="box-none">
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
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  selected: {
    borderWidth: 1,
    borderColor: '#FFFFFFAA',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 4,
  },
});
