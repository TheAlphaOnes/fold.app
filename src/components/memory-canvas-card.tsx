/**
 * MemoryCanvasCard — a memory on the timeline: its canvas, edge to edge,
 * inside Fold's rounded card, with the time (and story / place) at the
 * bottom. Read-only: changing a memory happens in the composer (Edit).
 *
 * The footer sits on a soft fade so it stays legible over photos.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Book, MapPin } from 'lucide-react-native';

import { CanvasView } from '@/canvas/render/canvas-view';
import { useCanvasOf } from '@/canvas/use-canvas-of';
import { useStoriesStore } from '@/hooks/use-stories';
import { useTheme } from '@/hooks/use-theme';
import type { Composition } from '@/types/journal';

interface MemoryCanvasCardProps {
  item: Composition;
  width: number;
  height: number;
  /** Video plays and audio may auto-play: the card in focus. */
  live?: boolean;
  /** Replaces the time row (the guide's sample canvas). */
  label?: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatCardTime(createdAt: number): string {
  const d = new Date(createdAt);
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
  if (d.toDateString() === now.toDateString()) return time;
  const day = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? `${day} • ${time}` : `${day}, ${d.getFullYear()} • ${time}`;
}

export const MemoryCanvasCard = memo(function MemoryCanvasCard({ item, width, height, live = false, label }: MemoryCanvasCardProps) {
  const theme = useTheme();
  const doc = useCanvasOf(item);
  const story = useStoriesStore((s) => s.stories.find((st) => item.storyIds?.includes(st.id)));
  if (!doc) return null;

  // Over a photo, grid or colour the footer is white on a fade; on the stripes it's muted ink.
  const onMedia = doc.background.kind !== 'stripes';
  const ink = onMedia ? '#FFFFFF' : theme.textMuted;

  return (
    <View style={[styles.card, { width, height, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <CanvasView doc={doc} memory={item} width={width} height={height} live={live} />

      <View style={styles.footer} pointerEvents="none">
        {onMedia && (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cardFooterFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000" stopOpacity="0.45" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cardFooterFade)" />
          </Svg>
        )}
        <Text style={[styles.time, { color: ink }]}>{label ?? formatCardTime(item.createdAt)}</Text>
        {!label && (item.location?.name || story) && (
          <View style={styles.badges}>
            {story && (
              <View style={styles.badge}>
                <Book size={10} color={ink} />
                <Text style={[styles.time, { color: ink }]} numberOfLines={1}>
                  {story.title.toUpperCase()}
                </Text>
              </View>
            )}
            {item.location?.name && (
              <View style={styles.badge}>
                <MapPin size={10} color={ink} />
                <Text style={[styles.time, { color: ink }]} numberOfLines={1}>
                  {item.location.name.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
    paddingBottom: 18,
    alignItems: 'center',
  },
  time: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  badges: { flexDirection: 'row', gap: 12, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 160 },
});
