/**
 * The doodle pen in the composer.
 *
 * DoodleSurface — lies over the canvas while drawing: one finger draws, each
 *   lift ends a stroke. Strokes are drawn in place, in the chosen ink, as
 *   they'll look once placed.
 * DoodleToolbar — takes the top bar's place while drawing:
 *   ink · pen width · undo stroke · DONE
 *
 * Done turns the strokes into one doodle layer (moved, turned and resized
 * like any sticker), which then draws itself in and starts to boil.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Undo2 } from 'lucide-react-native';

import { PEN_WIDTHS, brushStrands, strokePath } from '@/canvas/doodle';
import { InkButton, InkPalette } from '@/components/compose/ink-palette';
import { ThemedText } from '@/components/themed-text';
import { fadeIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

/** Points closer than this (px) to the last one are skipped: smoother lines, smaller saves. */
const MIN_STEP = 2.5;

export interface PenState {
  color: string | null;
  /** Index into PEN_WIDTHS. */
  widthIndex: number;
}

interface DoodleSurfaceProps {
  width: number;
  height: number;
  pen: PenState;
  /** Finished strokes, in canvas pixels. */
  strokes: number[][];
  onStroke: (points: number[]) => void;
}

export function DoodleSurface({ width, height, pen, strokes, onStroke }: DoodleSurfaceProps) {
  const theme = useTheme();
  // The stroke under the finger, drawn as it grows.
  const [live, setLive] = useState<number[]>([]);

  const extend = (p: number[], x: number, y: number) => {
    const n = p.length;
    return n >= 2 && Math.hypot(x - p[n - 2], y - p[n - 1]) < MIN_STEP ? p : [...p, x, y];
  };

  const draw = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => setLive([e.x, e.y]))
    .onUpdate((e) => setLive((p) => extend(p, e.x, e.y)))
    .onFinalize(() => {
      // A tap with no movement leaves a dot.
      onStroke(live.length >= 4 ? live : live.length === 2 ? [...live, live[0] + 0.5, live[1]] : live);
      setLive([]);
    });

  const ink = pen.color ?? theme.text;
  const strokeWidth = Math.max(1, PEN_WIDTHS[pen.widthIndex] * width);
  const toPath = (points: number[]) => strokePath(points, 1, { x: 0, y: 0 });

  return (
    <GestureDetector gesture={draw}>
      <View style={[StyleSheet.absoluteFill, styles.surface, { width, height }]} accessibilityLabel="Doodle on the card">
        <Svg width={width} height={height}>
          {/* Drawn with the same brush as the placed doodle (in pixels, so unit 1). */}
          {[...strokes, live].map((points, i) =>
            points.length >= 2
              ? brushStrands(points, strokeWidth, i).map((strand, k) => (
                  <Path
                    key={`${i}-${k}`}
                    d={toPath(strand.points)}
                    stroke={ink}
                    strokeOpacity={strand.opacity}
                    strokeWidth={strokeWidth * strand.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))
              : null,
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}

interface DoodleToolbarProps {
  pen: PenState;
  onPen: (pen: PenState) => void;
  canUndo: boolean;
  onUndo: () => void;
  onDone: () => void;
}

export function DoodleToolbar({ pen, onPen, canUndo, onUndo, onDone }: DoodleToolbarProps) {
  const theme = useTheme();
  const [inkOpen, setInkOpen] = useState(false);
  const dot = 6 + pen.widthIndex * 5;
  return (
    <Animated.View entering={fadeIn(200)}>
      <View style={styles.row}>
        <InkButton color={pen.color} open={inkOpen} onPress={() => setInkOpen((o) => !o)} label="Pen colour" onDark={false} />
        <Pressable
          onPress={() => {
            haptic.select();
            onPen({ ...pen, widthIndex: (pen.widthIndex + 1) % PEN_WIDTHS.length });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Pen width, ${['thin', 'medium', 'thick'][pen.widthIndex]}`}
          style={({ pressed }) => [styles.tool, { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }]}
        >
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: pen.color ?? theme.text }} />
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.tap();
            onUndo();
          }}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo stroke"
          style={({ pressed }) => [styles.tool, { borderColor: theme.border, opacity: !canUndo ? 0.3 : pressed ? 0.5 : 1 }]}
        >
          <Undo2 size={18} color={theme.text} />
        </Pressable>
        <View style={styles.flex} />
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Done doodling"
          style={({ pressed }) => [styles.done, { backgroundColor: theme.text, opacity: pressed ? 0.7 : 1 }]}
        >
          <ThemedText style={[styles.doneText, { color: theme.background }]}>DONE</ThemedText>
        </Pressable>
      </View>
      {inkOpen && <InkPalette color={pen.color} onChange={(color) => onPen({ ...pen, color })} onDark={false} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: { zIndex: 50 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  tool: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  done: { paddingHorizontal: 16, height: 40, borderRadius: 20, justifyContent: 'center' },
  doneText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
});
