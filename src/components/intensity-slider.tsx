/**
 * IntensitySlider — Fold's own 0–1 slider, identical on iOS and Android.
 *
 * Drawn to match ToggleSwitch: the same pill track, the same hatched accent
 * fill for the "on" portion, the same knob with its grip. Values snap to
 * 5% steps; a selection tick plays at every 10%.
 *
 * Drag follows the finger 1:1 on the UI thread (no React renders while
 * moving); React only hears about step changes (for the live readout) and
 * the final value on release (to persist). A tap on the track glides the
 * knob there.
 *
 * Motion is split into segments: the knob grows on a spring when grabbed,
 * the fill tracks the finger directly, and a tap-jump eases over 240ms.
 *
 * Inside a vertical ScrollView, the pan only activates on horizontal travel,
 * so the page still scrolls when the gesture starts on the slider.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { EASE_OUT, SPRING_GESTURE } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const TRACK_HEIGHT = 28;
const BORDER = 1;
const INSET = 2;
const KNOB = TRACK_HEIGHT - BORDER * 2 - INSET * 2;
const STEP = 0.05;
const TICK_EVERY = 2; // steps, i.e. a tick at every 10%
const TAP_GLIDE_MS = 240;

interface IntensitySliderProps {
  value: number;
  /** Fires on every 5% step while dragging, for live readouts. */
  onChange?: (next: number) => void;
  /** Fires once when the finger lifts (or a tap lands), with the final value. */
  onCommit: (next: number) => void;
  accessibilityLabel: string;
}

function snap(v: number): number {
  'worklet';
  return Math.round(Math.min(1, Math.max(0, v)) / STEP) * STEP;
}

export function IntensitySlider({ value, onChange, onCommit, accessibilityLabel }: IntensitySliderProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  const progress = useSharedValue(value);
  const lastStep = useSharedValue(Math.round(value / STEP));
  const grabbed = useSharedValue(0);
  // Usable travel for the knob's left edge.
  const travel = Math.max(0, width - BORDER * 2 - INSET * 2 - KNOB);

  useEffect(() => {
    progress.set(value);
    lastStep.set(Math.round(value / STEP));
  }, [value, progress, lastStep]);

  const emitStep = (step: number) => {
    if (step % TICK_EVERY === 0) haptic.select();
    onChange?.(step * STEP);
  };

  const valueAt = (x: number): number => {
    'worklet';
    if (travel <= 0) return progress.get();
    return snap((x - BORDER - INSET - KNOB / 2) / travel);
  };

  const track = (x: number) => {
    'worklet';
    const next = valueAt(x);
    progress.set(next);
    const step = Math.round(next / STEP);
    if (step !== lastStep.get()) {
      lastStep.set(step);
      runOnJS(emitStep)(step);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onStart((e) => {
      grabbed.set(reduceMotion ? 1 : withSpring(1, SPRING_GESTURE));
      track(e.x);
    })
    .onUpdate((e) => {
      track(e.x);
    })
    .onFinalize(() => {
      grabbed.set(reduceMotion ? 0 : withSpring(0, SPRING_GESTURE));
      runOnJS(onCommit)(progress.get());
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const next = valueAt(e.x);
    progress.set(reduceMotion ? next : withTiming(next, { duration: TAP_GLIDE_MS, easing: EASE_OUT }));
    const step = Math.round(next / STEP);
    if (step !== lastStep.get()) {
      lastStep.set(step);
      runOnJS(emitStep)(step);
    }
    runOnJS(onCommit)(next);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    width: INSET + KNOB + progress.get() * travel + INSET,
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.get() * travel },
      { scale: 1 + grabbed.get() * 0.1 },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const nudge = (direction: 1 | -1) => {
    const next = snap(value + direction * STEP * TICK_EVERY);
    if (next === value) return;
    haptic.select();
    onChange?.(next);
    onCommit(next);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)}%` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        hitSlop={{ top: 10, bottom: 10 }}
        style={[styles.track, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}
      >
        <Animated.View style={[styles.fill, { backgroundColor: theme.accentWarm }, fillStyle]} pointerEvents="none">
          {/* Hatching is laid out at full track width and clipped by the fill,
              so it never re-renders (or stretches) while the fill moves. */}
          <View style={[styles.hatch, { width }]}>
            <DiagonalStripes color="#863800" opacity={0.55} />
          </View>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.knob, { backgroundColor: theme.background, borderColor: theme.border }, knobStyle]}
        >
          <View style={[styles.grip, { backgroundColor: theme.border }]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: BORDER,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  hatch: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  knob: {
    position: 'absolute',
    left: INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  grip: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
});
