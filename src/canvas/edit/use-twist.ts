/**
 * useTwist — the canvas's two-finger gesture: pinch to resize and twist to
 * turn a layer, with fingers anywhere on the canvas (like Instagram's
 * editor), instead of both having to land on a small sticker.
 *
 * It targets the selected layer, or else the one nearest the fingers
 * (pickTwistTarget). With no layer in reach it steps aside, so a pinch on
 * a photo still frames that photo. Rotation snaps level near straight,
 * with a tick. Layers draw the live values while `id` names them; the
 * result is committed once, when the fingers lift.
 */

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { clamp, pickTwistTarget, snapRotation } from '@/canvas/geometry';
import type { Layer } from '@/canvas/types';
import { haptic } from '@/services/haptics';

export interface TwistSignals {
  /** The layer being turned, or '' for none. */
  id: SharedValue<string>;
  /** Live absolute scale and rotation (degrees) of that layer. */
  scale: SharedValue<number>;
  rotation: SharedValue<number>;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 6;

interface UseTwistOptions {
  layers: readonly Layer[];
  selectedId: string | null;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onCommit: (id: string, patch: Pick<Layer, 'scale' | 'rotation'>) => void;
}

export function useTwist({ layers, selectedId, width, height, onSelect, onCommit }: UseTwistOptions) {
  const signals: TwistSignals = {
    id: useSharedValue(''),
    scale: useSharedValue(1),
    rotation: useSharedValue(0),
  };
  const base = useSharedValue({ scale: 1, rotation: 0 });
  // The target chosen for this touch sequence, shared by pinch and rotation.
  const target = useSharedValue('');
  const running = useSharedValue(0);
  const level = useSharedValue(false);

  // Plain data for the UI thread: where each layer is and how it sits now.
  const candidates = layers.map((l) => ({ id: l.id, x: l.x, y: l.y, scale: l.scale, rotation: l.rotation }));

  /** Two fingers down: pick a layer, or fail so photos can be framed. */
  const decide = (
    e: { numberOfTouches: number; allTouches: { x: number; y: number }[] },
    manager: { activate: () => void; fail: () => void },
  ) => {
    'worklet';
    if (e.numberOfTouches < 2) return;
    if (target.get() !== '') {
      manager.activate();
      return;
    }
    const [a, b] = e.allTouches;
    const focal = { x: (a.x + b.x) / 2 / width, y: (a.y + b.y) / 2 / height };
    const id = pickTwistTarget(candidates, selectedId, focal, width / height);
    const layer = id ? candidates.find((c) => c.id === id) : undefined;
    if (!layer) {
      manager.fail();
      return;
    }
    target.set(layer.id);
    base.set({ scale: layer.scale, rotation: layer.rotation });
    signals.scale.set(layer.scale);
    signals.rotation.set(layer.rotation);
    signals.id.set(layer.id);
    level.set(false);
    if (layer.id !== selectedId) runOnJS(onSelect)(layer.id);
    manager.activate();
  };

  const begin = () => {
    'worklet';
    running.set(running.get() + 1);
  };

  const end = () => {
    'worklet';
    running.set(Math.max(0, running.get() - 1));
    if (running.get() > 0 || target.get() === '') return;
    const id = target.get();
    target.set('');
    // `signals.id` stays on this layer until its committed values arrive.
    runOnJS(onCommit)(id, { scale: signals.scale.get(), rotation: signals.rotation.get() });
  };

  const pinch = Gesture.Pinch()
    .manualActivation(true)
    .onTouchesDown((e, manager) => decide(e, manager))
    .onStart(begin)
    .onUpdate((e) => {
      signals.scale.set(clamp(base.get().scale * e.scale, MIN_SCALE, MAX_SCALE));
    })
    .onEnd(end);

  const rotate = Gesture.Rotation()
    .manualActivation(true)
    .onTouchesDown((e, manager) => decide(e, manager))
    .onStart(begin)
    .onUpdate((e) => {
      const next = snapRotation(base.get().rotation + (e.rotation * 180) / Math.PI);
      signals.rotation.set(next.rotation);
      if (next.snapped && !level.get()) runOnJS(haptic.select)();
      level.set(next.snapped);
    })
    .onEnd(end);

  return { gesture: Gesture.Simultaneous(pinch, rotate), signals };
}
