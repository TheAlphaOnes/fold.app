/**
 * CanvasStage — CANVAS chapter (drag · pinch).
 *
 * A sample canvas built from the bundled guide images. It is labelled as a
 * sample on the card itself and is never written to the journal. The ghost
 * finger tracks the first sticker and steps aside once the user touches it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';

import { MemoryCard } from '@/components/memory-card';
import { GestureHint } from '@/components/guide/gesture-hint';
import { useFullCardSize } from '@/components/guide/fitted-memory-card';
import type { GuideStageProps } from '@/components/guide/types';
import type { Composition, MediaElement } from '@/types/journal';

const SAMPLE_ID = -1;
const CARD_GUTTER = 21;
const STAGE_PADDING = 16;
/** Sticker frames match DraggableSticker: portrait 90x120, landscape 120x90. */
const PORTRAIT = { width: 90, height: 120 };
const LANDSCAPE = { width: 120, height: 90 };
const MOVE_THRESHOLD = 15;
const SCALE_THRESHOLD = 0.15;

function sampleUri(source: number): string {
  return RNImage.resolveAssetSource(source)?.uri ?? '';
}

function buildSampleStickers(cardWidth: number, cardHeight: number): MediaElement[] {
  return [
    {
      id: 'guide-sample-1',
      uri: sampleUri(require('../../../assets/images/guide-sample-1.jpg')),
      type: 'image',
      x_pos: 24,
      y_pos: 28,
      scale: 1,
      width: PORTRAIT.width,
      height: PORTRAIT.height,
    },
    {
      id: 'guide-sample-2',
      uri: sampleUri(require('../../../assets/images/guide-sample-2.jpg')),
      type: 'image',
      x_pos: Math.max(24, cardWidth - LANDSCAPE.width - 28),
      y_pos: Math.max(160, cardHeight - LANDSCAPE.height - 80),
      scale: 1,
      width: LANDSCAPE.width,
      height: LANDSCAPE.height,
    },
  ];
}

export function CanvasStage({ step, status, area, onSuccess }: GuideStageProps) {
  const full = useFullCardSize();
  const cardHeight = Math.max(280, Math.min(full.height, area.height - STAGE_PADDING * 2));
  const isActive = status === 'active';

  const initialStickers = useMemo(
    () => buildSampleStickers(full.width, cardHeight),
    [full.width, cardHeight],
  );
  const [stickers, setStickers] = useState<MediaElement[]>(initialStickers);
  // The step the user last touched the canvas in; the hint steps aside for it.
  const [touchedStep, setTouchedStep] = useState<string | null>(null);
  const touched = touchedStep === step.id;
  // The label replaces the timestamp, but the card still needs a valid date.
  const [createdAt] = useState(() => Date.now());

  // Each step measures against where things stood when it began, so a drag
  // made during "pinch" (or a pinch during "drag") never counts.
  const baseline = useRef<MediaElement[]>(stickers);
  useEffect(() => {
    baseline.current = stickers;
    // Only re-snapshot when the step changes, not on every sticker update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const sample: Composition = useMemo(() => ({
    id: SAMPLE_ID,
    textContent: 'a sample canvas.\nnothing here is saved.',
    mediaElements: stickers,
    createdAt,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    storyIds: [],
  }), [stickers, createdAt]);

  const handleUpdate = useCallback((_id: number, next: MediaElement[]) => {
    setStickers(next);
    setTouchedStep(step.id);
    if (!isActive) return;

    const before = new Map(baseline.current.map((media) => [media.id, media]));
    const achieved = next.some((media) => {
      const start = before.get(media.id);
      if (!start) return false;
      if (step.id === 'drag') {
        return Math.hypot(media.x_pos - start.x_pos, media.y_pos - start.y_pos) > MOVE_THRESHOLD;
      }
      return Math.abs((media.scale ?? 1) - (start.scale ?? 1)) >= SCALE_THRESHOLD;
    });
    if (achieved) onSuccess();
  }, [isActive, step.id, onSuccess]);

  // Anchor the ghost finger on the first sticker's live position and size.
  const target = stickers[0];
  const targetFrame = target.width && target.height && target.width > target.height ? LANDSCAPE : PORTRAIT;
  const targetScale = target.scale ?? 1;
  const hintBox = {
    left: target.x_pos + (targetFrame.width * (1 - targetScale)) / 2,
    top: target.y_pos + (targetFrame.height * (1 - targetScale)) / 2,
    width: targetFrame.width * targetScale,
    height: targetFrame.height * targetScale,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { height: cardHeight }]}>
        <MemoryCard
          item={sample}
          height={cardHeight}
          onUpdatePositions={handleUpdate}
          label="SAMPLE  ·  NOT SAVED"
        />
        <View style={[styles.hintBox, hintBox]} pointerEvents="none">
          <GestureHint gesture={step.gesture} visible={isActive && !touched} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: CARD_GUTTER,
  },
  hintBox: {
    position: 'absolute',
  },
});
