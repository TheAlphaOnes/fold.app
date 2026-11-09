/**
 * Dev-only: every template drawn twice, in today's feed card shape (left)
 * and in 9:16 (right), with sample photos, so the feed shape can be chosen
 * by eye and templates checked visually. Not reachable in release builds.
 */

import React from 'react';
import { Image as RNImage, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasView } from '@/canvas/render/canvas-view';
import { CANVAS_ASPECT } from '@/canvas/geometry';
import type { CanvasDoc, Layer, StickerShape, TemplateId, TextLayer } from '@/canvas/types';
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

function docFor(template: TemplateId): CanvasDoc {
  const media = template === 'text' ? [] : template === 'story' ? MEDIA.slice(0, 1) : MEDIA;
  const base = newDoc(media, template);
  // Stickers show every shape, so each one can be checked by eye.
  let i = 0;
  const doc = template === 'stickers' ? { ...base, layers: base.layers.map((l) => (l.kind === 'media' ? { ...l, shape: SHAPES[i++ % SHAPES.length] } : l)) } : base;
  const text: TextLayer = template === 'text' ? { ...TEXT, color: null, style: 'plain', y: 0.5, size: 0.08 } : TEXT;
  return { ...doc, layers: [...doc.layers, text, DATE] };
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
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60, paddingHorizontal: 16, gap: 28 }}>
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
                <CanvasView doc={doc} memory={memory} width={w} height={storyH} animated={false} />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
});
