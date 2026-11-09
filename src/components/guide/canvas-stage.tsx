/**
 * CanvasStage — CANVAS chapter (drag · pinch).
 *
 * The real composer canvas with a sample memory (two photo stickers and a
 * note) built from the bundled guide images. It is labelled as a sample and
 * never written to the journal. The ghost finger tracks the first sticker
 * and steps aside once the user touches the canvas.
 */

import React, { useMemo, useState } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';

import { CanvasEditor } from '@/canvas/edit/canvas-editor';
import { fitCanvas } from '@/canvas/geometry';
import type { CanvasDoc, Layer } from '@/canvas/types';
import { GestureHint } from '@/components/guide/gesture-hint';
import type { GuideStageProps } from '@/components/guide/types';
import type { MediaElement } from '@/types/journal';

const STAGE_PADDING = 16;

function sampleUri(source: number): string {
  return RNImage.resolveAssetSource(source)?.uri ?? '';
}

/** Normalised distance that counts as a drag, and scale change that counts as a pinch. */
const MOVE_THRESHOLD = 0.04;
const SCALE_THRESHOLD = 0.15;

const SAMPLE_MEDIA: MediaElement[] = [
  { id: 'guide-sample-1', uri: sampleUri(require('../../../assets/images/guide-sample-1.jpg')), type: 'image', x_pos: 0, y_pos: 0, width: 3, height: 4 },
  { id: 'guide-sample-2', uri: sampleUri(require('../../../assets/images/guide-sample-2.jpg')), type: 'image', x_pos: 0, y_pos: 0, width: 4, height: 3 },
];

const SAMPLE_DOC: CanvasDoc = {
  version: 1,
  template: 'stickers',
  background: { kind: 'stripes' },
  layers: [
    { id: 'note', kind: 'text', text: 'a sample canvas.\nnothing here is saved.', font: 'JetBrainsMono-Regular', color: null, align: 'center', style: 'plain', size: 0.045, x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    { id: 's1', kind: 'media', mediaId: 'guide-sample-1', shape: 'rounded', x: 0.3, y: 0.24, scale: 1, rotation: -5 },
    { id: 's2', kind: 'media', mediaId: 'guide-sample-2', shape: 'polaroid', x: 0.68, y: 0.74, scale: 1, rotation: 4 },
  ],
};

export function CanvasStage({ step, status, area, onSuccess }: GuideStageProps) {
  const size = fitCanvas({ width: area.width - STAGE_PADDING * 2, height: area.height - STAGE_PADDING * 2 });
  const isActive = status === 'active';
  const [doc, setDoc] = useState<CanvasDoc>(SAMPLE_DOC);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touchedStep, setTouchedStep] = useState<string | null>(null);
  const touched = touchedStep === step.id;
  const [createdAt] = useState(() => Date.now());

  // Each step measures from where the stickers stood when it began, so a
  // drag made during "pinch" (or a pinch during "drag") never counts.
  const [baseline, setBaseline] = useState<{ step: string; layers: Layer[] }>({ step: step.id, layers: doc.layers });
  if (baseline.step !== step.id) setBaseline({ step: step.id, layers: doc.layers });

  const onLayerChange = (id: string, patch: Partial<Layer>) => {
    setDoc((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) }));
    setTouchedStep(step.id);
    if (!isActive) return;
    const start = baseline.layers.find((l) => l.id === id);
    if (!start || start.kind !== 'media') return;
    const moved = Math.hypot((patch.x ?? start.x) - start.x, (patch.y ?? start.y) - start.y) > MOVE_THRESHOLD;
    const resized = Math.abs((patch.scale ?? start.scale) - start.scale) >= SCALE_THRESHOLD;
    if ((step.id === 'drag' && moved) || (step.id === 'pinch' && resized)) onSuccess();
  };

  const memory = useMemo(() => ({ id: -1, createdAt, location: undefined }), [createdAt]);
  const target = doc.layers.find((l) => l.id === 's1')!;
  const hint = { left: target.x * size.width - 45, top: target.y * size.height - 60, width: 90, height: 120 };

  return (
    <View style={styles.container}>
      <View style={{ width: size.width, height: size.height }}>
        <CanvasEditor
          doc={doc}
          media={SAMPLE_MEDIA}
          memory={memory}
          width={size.width}
          height={size.height}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onLayerChange={onLayerChange}
          // The sample keeps everything: nothing to delete or edit here.
          onLayerDelete={() => {}}
          onEditText={() => {}}
          onCrop={() => {}}
          onFillCell={() => {}}
          onSwapCells={() => {}}
          onBackgroundTap={() => setSelectedId(null)}
        />
        <View style={[styles.hintBox, hint]} pointerEvents="none">
          <GestureHint gesture={step.gesture} visible={isActive && !touched} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintBox: { position: 'absolute' },
});
