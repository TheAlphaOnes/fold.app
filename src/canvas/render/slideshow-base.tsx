/**
 * SlideshowBase — the Slideshow template's base: every photo full-bleed in
 * turn. Live, each slide fades in over the last while slowly zooming and
 * drifting (a gentle Ken Burns), alternating direction slide to slide so
 * the run never feels mechanical. Still (feed behind, editor, export), it
 * shows the first slide; in the editor that slide can be framed, replaced
 * or removed like any photo.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import type { FrameRenderers } from '@/canvas/render/canvas-base';
import { MediaFill } from '@/canvas/render/media-fill';
import { StripesSurface } from '@/canvas/render/stripes-surface';
import type { CanvasDoc, CellFill } from '@/canvas/types';
import type { MediaElement } from '@/types/journal';

/** How long each slide holds before the next fades in. */
export const SLIDE_MS = 3600;
const FADE_MS = 900;
const ZOOM = 0.08;

interface SlideshowBaseProps {
  doc: CanvasDoc;
  media: Map<string, MediaElement>;
  width: number;
  height: number;
  playing: boolean;
  muted?: boolean;
  renderers?: FrameRenderers;
}

export function SlideshowBase({ doc, media, width, height, playing, muted = true, renderers }: SlideshowBaseProps) {
  const slides = (doc.cells ?? []).filter((c): c is CellFill & { mediaId: string } => !!c.mediaId && media.has(c.mediaId));
  const [index, setIndex] = useState(0);
  const cycling = playing && !renderers && slides.length > 1;

  useEffect(() => {
    if (!cycling) return;
    const timer = setInterval(() => setIndex((i) => i + 1), SLIDE_MS);
    return () => clearInterval(timer);
  }, [cycling]);

  if (slides.length === 0) return <StripesSurface />;

  // The editor frames the first slide like any photo.
  if (renderers) {
    const first = slides[0];
    return <>{renderers.frame(first.cellId, media.get(first.mediaId)!, first.crop, width, height, first.mirrored)}</>;
  }

  if (!cycling) {
    const first = slides[0];
    return <MediaFill media={media.get(first.mediaId)!} crop={first.crop} width={width} height={height} mirrored={first.mirrored} playing={playing} muted={muted} />;
  }

  // The slide fading in sits over the one before it; older ones are gone.
  const current = index % slides.length;
  const previous = (index - 1 + slides.length) % slides.length;
  const shown = index === 0 ? [current] : [previous, current];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shown.map((i) => (
        <Slide key={`${slides[i].cellId}-${i === current ? index : index - 1}`} fill={slides[i]} media={media.get(slides[i].mediaId)!} width={width} height={height} drift={i % 2 === 0 ? 1 : -1} active={i === current} muted={muted} first={index === 0} />
      ))}
    </View>
  );
}

interface SlideProps {
  fill: CellFill;
  media: MediaElement;
  width: number;
  height: number;
  /** Which way this slide drifts; alternates slide to slide. */
  drift: 1 | -1;
  active: boolean;
  muted: boolean;
  /** The very first slide is already showing; it doesn't fade in. */
  first: boolean;
}

function Slide({ fill, media, width, height, drift, active, muted, first }: SlideProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(first ? 1 : 0);
  const zoom = useSharedValue(0);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }));
    if (!reduced) zoom.set(withTiming(1, { duration: SLIDE_MS + FADE_MS * 2, easing: Easing.linear }));
  }, [opacity, zoom, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: 1 + zoom.get() * ZOOM }, { translateX: drift * zoom.get() * width * 0.02 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <MediaFill media={media} crop={fill.crop} width={width} height={height} mirrored={fill.mirrored} playing={active} muted={muted} />
    </Animated.View>
  );
}
