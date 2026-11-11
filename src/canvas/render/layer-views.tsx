/**
 * The look of each layer kind at a given canvas width. Each view is drawn
 * centred on its anchor point (see LayerAnchor in canvas-view), so it only
 * worries about its own size and shape.
 */

import React, { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'lucide-react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, Path } from 'react-native-svg';

import { MusicDisc } from '@/components/stories/music-disc';
import { VinylRecord } from '@/components/vinyl-record';
import { gifFrameAt, type ExportFrameState } from '@/canvas/animated-export';
import type { AudioSticker, DateSticker, MediaSticker, StickerShape, TextLayer } from '@/canvas/types';
import { STICKER_BASE_WIDTH } from '@/canvas/geometry';
import { stampOutline } from '@/canvas/render/stamp-outline';
import { cutHeight, cutPath, isCutShape, type CutShape } from '@/canvas/render/sticker-paths';
import { useMemoryAudio } from '@/canvas/render/use-memory-audio';
import { PHOTO_DISSOLVE } from '@/canvas/render/media-fill';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { MediaElement } from '@/types/journal';
import { getHighResArtwork } from '@/utils/media-attach';
import { memoryTextMetrics } from '@/utils/memory-text';

/** Widths old 90/120pt stickers had on a 348pt card, as fractions of canvas width. */
const AUDIO_DISC = 0.3;
/** Text wraps inside this share of the canvas width. */
const TEXT_MAX_WIDTH = 0.84;

// ─── Text ───────────────────────────────────────────────────────────────

export function TextLayerView({ layer, width }: { layer: TextLayer; width: number }) {
  const theme = useTheme();
  const metrics = memoryTextMetrics(layer.font, layer.size * width * layer.scale);
  const ink = layer.color ?? theme.text;
  const highlighted = layer.style === 'highlight';
  return (
    <View
      style={[
        { maxWidth: TEXT_MAX_WIDTH * width },
        highlighted && {
          backgroundColor: ink === '#FFFFFF' || ink.toUpperCase() === '#FFF' ? '#000000CC' : '#FFFFFFE6',
          paddingHorizontal: metrics.fontSize * 0.5,
          paddingVertical: metrics.fontSize * 0.2,
          borderRadius: metrics.fontSize * 0.4,
        },
      ]}
    >
      <Text style={[metrics, { fontFamily: layer.font, color: ink, textAlign: layer.align }]}>{layer.text}</Text>
    </View>
  );
}

// ─── Photo / video stickers ─────────────────────────────────────────────

function stickerSize(media: MediaElement, width: number, scale: number) {
  const landscape = media.width && media.height ? media.width > media.height : false;
  const w = (landscape ? STICKER_BASE_WIDTH.landscape : STICKER_BASE_WIDTH.portrait) * width * scale;
  const h = landscape ? w * 0.75 : w * (4 / 3);
  return { w, h };
}

/** `fade`: a swapped photo dissolves in (the live card and the composer; never exports). */
export function MediaStickerView({
  layer,
  media,
  width,
  fade = false,
  exportFrame,
}: {
  layer: MediaSticker;
  media: MediaElement;
  width: number;
  fade?: boolean;
  /** Set while the animated export films: hold this GIF sticker at this exact moment. */
  exportFrame?: ExportFrameState | null;
}) {
  const thumb = useVideoThumbnail(media.type === 'video' ? media.uri : undefined);
  let uri = media.type === 'video' ? thumb : media.uri;
  // A GIF sticker plays on the native clock, which can't be stepped; the
  // export swaps in the pre-decoded frame for the moment being captured.
  const gifSet = exportFrame?.gifs.get(media.id);
  if (exportFrame && gifSet) uri = gifSet.frames[gifFrameAt(exportFrame.tMs, gifSet)].uri;
  let { w, h } = stickerSize(media, width, layer.scale);
  if (layer.shape === 'circle' || layer.shape === 'stamp') h = w;
  // A card is always a portrait print, so a fan or pile of them is uniform.
  if (layer.shape === 'card') {
    w = STICKER_BASE_WIDTH.portrait * width * layer.scale;
    h = w * (4 / 3);
  }
  if (isCutShape(layer.shape)) return <CutSticker shape={layer.shape} uri={uri} w={w} h={cutHeight(layer.shape, w)} />;

  const image = uri ? (
    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={fade ? PHOTO_DISSOLVE : 0} />
  ) : null;

  return <ShapeFrame shape={layer.shape} w={w} h={h}>{image}</ShapeFrame>;
}

function ShapeFrame({ shape, w, h, children }: { shape: StickerShape; w: number; h: number; children: React.ReactNode }) {
  if (shape === 'polaroid') {
    const pad = w * 0.06;
    return (
      <View style={[styles.polaroid, { padding: pad, paddingBottom: pad * 4 }]}>
        <View style={{ width: w, height: h, overflow: 'hidden' }}>{children}</View>
      </View>
    );
  }
  if (shape === 'stamp') {
    const pad = w * 0.07;
    const outerW = w + pad * 2;
    const outerH = h + pad * 2;
    return (
      <View style={[styles.stamp, { width: outerW, height: outerH, padding: pad }]}>
        {/* The paper is a real shape with its perforations cut out, so
            whatever is behind shows through the holes on any background. */}
        <Svg width={outerW} height={outerH} style={StyleSheet.absoluteFill}>
          <Path d={stampOutline(outerW, outerH, pad * 0.42, 9)} fill="#FAF7F0" stroke="#00000059" strokeWidth={1} />
        </Svg>
        <View style={{ width: w, height: h, overflow: 'hidden' }}>{children}</View>
      </View>
    );
  }
  if (shape === 'tape') {
    return (
      <View>
        <View style={[styles.photoShadow, { width: w, height: h, overflow: 'hidden' }]}>{children}</View>
        <View style={[styles.tape, { width: w * 0.42, height: w * 0.12, top: -w * 0.05, left: w * 0.29 }]} />
      </View>
    );
  }
  if (shape === 'card') {
    // A print: a thin white border so cards read apart where they overlap.
    const border = Math.max(2, w * 0.03);
    return (
      <View style={[styles.photoShadow, { width: w, height: h, borderRadius: w * 0.07, borderWidth: border, borderColor: '#FFFFFF', overflow: 'hidden' }]}>
        {children}
      </View>
    );
  }
  const radius = shape === 'circle' ? w / 2 : shape === 'square' ? 2 : w * 0.1;
  return <View style={[styles.photoShadow, { width: w, height: h, borderRadius: radius, overflow: 'hidden' }]}>{children}</View>;
}

/**
 * A photo cut to a shape (heart, star, arch) with a white die-cut border,
 * like a printed sticker. The photo is an SVG image under a clip path, so
 * the cut is exact and survives the export capture.
 */
function CutSticker({ shape, uri, w, h }: { shape: CutShape; uri: string | null | undefined; w: number; h: number }) {
  const clipId = `cut-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const border = Math.max(3, w * 0.04);
  const d = cutPath(shape, w, h);
  return (
    <View style={[styles.cutShadow, { width: w + border * 2, height: h + border * 2 }]}>
      <Svg width={w + border * 2} height={h + border * 2}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={d} />
          </ClipPath>
        </Defs>
        <G transform={`translate(${border} ${border})`}>
          {/* The border: the outline stroked wide in white, behind the photo. */}
          <Path d={d} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={border * 2} strokeLinejoin="round" />
          {uri ? <SvgImage href={{ uri }} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} /> : null}
        </G>
      </Svg>
    </View>
  );
}

// ─── Songs and voice notes ──────────────────────────────────────────────

export function AudioStickerView({
  layer,
  media,
  width,
  compositionId,
  interactive,
}: {
  layer: AudioSticker;
  media: MediaElement;
  width: number;
  compositionId: number;
  interactive: boolean;
}) {
  const theme = useTheme();
  const { isPlaying, toggle } = useMemoryAudio(media.uri, compositionId, interactive);
  const size = AUDIO_DISC * width * layer.scale;
  const artwork = getHighResArtwork(media.metadata?.artwork);

  const disc = media.metadata && artwork ? <MusicDisc size={size} artwork={artwork} /> : <VinylRecord size={size} isPlaying={isPlaying} />;
  const body = (
    <View style={styles.audio}>
      {disc}
      {media.metadata && (
        // Plain title and artist, no box: a soft halo in the card colour keeps
        // them legible over a photo without drawing a shape around them.
        <View style={[styles.audioLabel, { maxWidth: size * 1.4 }]}>
          <Text style={[styles.audioTitle, { color: theme.text, fontSize: size * 0.085, textShadowColor: theme.background }]} numberOfLines={1}>
            {media.metadata.title}
          </Text>
          <Text style={[styles.audioArtist, { color: theme.textMuted, fontSize: size * 0.07, textShadowColor: theme.background }]} numberOfLines={1}>
            {media.metadata.artist}
          </Text>
        </View>
      )}
    </View>
  );

  if (!interactive) return body;
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={media.metadata ? `${isPlaying ? 'Pause' : 'Play'} ${media.metadata.title}` : `${isPlaying ? 'Pause' : 'Play'} voice note`}
    >
      {body}
    </Pressable>
  );
}

// ─── Location and date ──────────────────────────────────────────────────

export function LocationStickerView({ name, width, scale }: { name: string; width: number; scale: number }) {
  const size = 0.034 * width * scale;
  return (
    <View style={[styles.pill, { paddingHorizontal: size * 0.9, paddingVertical: size * 0.5, gap: size * 0.4 }]}>
      <MapPin size={size * 1.1} color="#111111" />
      <Text style={[styles.pillText, { fontSize: size }]}>{name.toUpperCase()}</Text>
    </View>
  );
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function DateStickerView({ layer, createdAt, width }: { layer: DateSticker; createdAt: number; width: number }) {
  const d = new Date(createdAt);
  const size = 0.036 * width * layer.scale;
  if (layer.style === 'stamp') {
    return (
      <View style={[styles.dateStamp, { padding: size * 0.6, borderRadius: size * 0.4 }]}>
        <Text style={[styles.dateStampDay, { fontSize: size * 2.2 }]}>{String(d.getDate()).padStart(2, '0')}</Text>
        <Text style={[styles.dateStampMonth, { fontSize: size * 0.8 }]}>
          {MONTHS[d.getMonth()]} {d.getFullYear()}
        </Text>
      </View>
    );
  }
  const stamp = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  return <Text style={[styles.dateMono, { fontSize: size * 1.3 }]}>{stamp}</Text>;
}

const styles = StyleSheet.create({
  // No fill: the shadow follows the cut outline drawn inside.
  cutShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  photoShadow: {
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  polaroid: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  // No background: the shadow follows the perforated paper drawn inside.
  stamp: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  tape: { position: 'absolute', backgroundColor: '#F2E6B8CC', transform: [{ rotate: '-4deg' }] },
  audio: { alignItems: 'center', gap: 8 },
  audioLabel: { alignItems: 'center', gap: 2 },
  audioTitle: { fontFamily: 'JetBrainsMono-Bold', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
  audioArtist: { fontFamily: 'JetBrainsMono-Medium', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999 },
  pillText: { fontFamily: 'JetBrainsMono-Bold', letterSpacing: 1.5, color: '#111111' },
  dateStamp: { backgroundColor: '#111111', alignItems: 'center' },
  dateStampDay: { fontFamily: 'BitcountGridDouble-Light', color: '#FFFFFF' },
  dateStampMonth: { fontFamily: 'JetBrainsMono-Medium', letterSpacing: 2, color: '#FFFFFF' },
  dateMono: { fontFamily: 'JetBrainsMono-Medium', letterSpacing: 2, color: '#FFFFFF', textShadowColor: '#0008', textShadowRadius: 6 },
});
