/**
 * Dev-only: every template drawn twice, in today's feed card shape (left)
 * and in 9:16 (right), with sample photos, so the feed shape can be chosen
 * by eye and templates checked visually. Not reachable in release builds.
 */

import React, { useState } from 'react';
import { Image as RNImage, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasView } from '@/canvas/render/canvas-view';
import { CANVAS_ASPECT } from '@/canvas/geometry';
import type { CanvasDoc, Layer, StickerShape, TemplateId, TextLayer } from '@/canvas/types';
import { CloseButton } from '@/components/round-button';
import { StampView } from '@/components/stamps/stamp-view';
import { AddButton } from '@/components/add-button';
import { KeyCaption } from '@/components/home/key-caption';
import type { KeyGesture } from '@/home/key-hints';
import { useTheme } from '@/hooks/use-theme';
import { BASE_TEMPLATES, GRID_TEMPLATES, newDoc } from '@/templates/registry';
import type { MediaElement } from '@/types/journal';

const uri = (source: number) => RNImage.resolveAssetSource(source)?.uri ?? '';
const SAMPLES = [
  require('../../../assets/images/guide-sample-1.jpg'),
  require('../../../assets/images/guide-sample-2.jpg'),
];
const MEDIA: MediaElement[] = Array.from({ length: 6 }, (_, i) => ({
  id: `m${i}`,
  uri: uri(SAMPLES[i % 2]),
  type: 'image',
  x_pos: 0,
  y_pos: 0,
  width: i % 2 ? 4 : 3,
  height: i % 2 ? 3 : 4,
}));

/** Fixed once, so render stays pure. */
const SAMPLE_DATE = Date.now();

const SHAPES: StickerShape[] = ['heart', 'star', 'arch', 'stamp', 'circle', 'polaroid'];

const TEXT: TextLayer = { id: 't', kind: 'text', text: 'a good day.', font: 'JetBrainsMono-Medium', color: '#FFFFFF', align: 'center', style: 'highlight', size: 0.06, x: 0.5, y: 0.82, scale: 1, rotation: 0 };
const DATE: Layer = { id: 'd', kind: 'date', style: 'stamp', x: 0.8, y: 0.14, scale: 1, rotation: 6 };
/** A pen doodle (a heart and a squiggle), to check the draw-in and boil. */
const heart = Array.from({ length: 40 }, (_, k) => {
  const t = (k / 39) * Math.PI * 2;
  return [0.006 * 16 * Math.sin(t) ** 3, -0.006 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
}).flat();
const squiggle = Array.from({ length: 30 }, (_, k) => [-0.12 + k * 0.008, 0.13 + Math.sin(k * 0.7) * 0.02]).flat();
const DOODLE: Layer = { id: 'p', kind: 'doodle', strokes: [{ points: heart }, { points: squiggle }], color: '#F2600C', width: 0.014, x: 0.24, y: 0.2, scale: 1, rotation: -8 };

function docFor(template: TemplateId): CanvasDoc {
  const media = template === 'text' ? [] : template === 'story' ? MEDIA.slice(0, 1) : MEDIA;
  const base = newDoc(media, template);
  // Stickers show every shape, so each one can be checked by eye.
  let i = 0;
  const doc = template === 'stickers' ? { ...base, layers: base.layers.map((l) => (l.kind === 'media' ? { ...l, shape: SHAPES[i++ % SHAPES.length] } : l)) } : base;
  const text: TextLayer = template === 'text' ? { ...TEXT, color: null, style: 'plain', y: 0.5, size: 0.08 } : TEXT;
  return { ...doc, layers: [...doc.layers, text, DATE, DOODLE] };
}

function KeyHintSample() {
  const [demo, setDemo] = useState<{ gesture: KeyGesture; n: number } | null>(null);
  return (
    <View style={{ alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <KeyCaption date="tue  10.11.2026" unlearned={['tap', 'hold', 'swipe']} active onDemo={(gesture) => setDemo((d) => ({ gesture, n: (d?.n ?? 0) + 1 }))} style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: '#878787' }} />
      <AddButton onPress={() => undefined} demo={demo} />
    </View>
  );
}

export default function CanvasGallery() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // ?from=N starts at the Nth template (screenshots without scrolling).
  const { from } = useLocalSearchParams<{ from?: string }>();
  if (!__DEV__) return <Redirect href="/" />;

  const w = (width - 48) / 2;
  const feedH = Math.min(width * 1.618, height * 0.78) * (w / (width - 42));
  const storyH = w / CANVAS_ASPECT;
  const memory = { id: -1, mediaElements: MEDIA, createdAt: SAMPLE_DATE, location: { latitude: 0, longitude: 0, name: 'Pune' } };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60, paddingHorizontal: 16, gap: 28 }}>
      {/* The orange key teaching all three gestures, to check the hint and the key's act-outs. */}
      <KeyHintSample />
      {/* A stamp (collection tile and hover size), to check the paper and postmark. */}
      <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-end' }}>
        <StampView imageUri={MEDIA[0].uri} place="Pune" createdAt={SAMPLE_DATE} width={160} />
        <StampView imageUri={MEDIA[1].uri} place="Goa" createdAt={SAMPLE_DATE} width={64} postmark={false} />
      </View>
      {[...BASE_TEMPLATES, ...GRID_TEMPLATES].slice(Number(from) || 0).map((t) => {
        const doc = docFor(t.id);
        return (
          <View key={t.id} style={{ gap: 8 }}>
            <Text style={[styles.label, { color: theme.text }]}>{t.name.toUpperCase()}  ·  feed now / 9:16</Text>
            <View style={styles.row}>
              <View style={[styles.card, { borderColor: theme.border }]}>
                <CanvasView doc={doc} memory={memory} width={w} height={feedH} animated={false} />
              </View>
              <View style={[styles.card, { borderColor: theme.border }]}>
                {/* Live, so template motion (Ring, Deck, Slideshow…) can be checked here. */}
                <CanvasView doc={doc} memory={memory} width={w} height={storyH} live />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
      {/* Pinned, so it's reachable however far down the page is scrolled. */}
      <CloseButton style={{ position: 'absolute', top: insets.top + 8, right: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
});
