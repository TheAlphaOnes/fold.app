/**
 * StampView — one stamp: perforated white paper, the photo inset in it, the
 * place and date beneath, and a round postmark inked over the corner as the
 * proof you were there. Everything is sized from `width`, so the same stamp
 * draws as a collection tile, a map card or the camera's freshly made one.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { postmarkDate } from '@/stamps/geometry';

/** Paper height per unit of width: a portrait stamp with room for its caption. */
export const STAMP_ASPECT = 1.24;

const PAPER = '#FFFFFF';
const INK = '#1C1B18';

interface StampViewProps {
  imageUri: string;
  place: string;
  createdAt: number;
  width: number;
  /** Hide the postmark (the camera inks it on with its own animation). */
  postmark?: boolean;
}

export function StampView({ imageUri, place, createdAt, width, postmark = true }: StampViewProps) {
  const height = width * STAMP_ASPECT;
  const margin = width * 0.08;
  const photo = width - margin * 2;
  // Bites about every 7% of the width, so small and large stamps read alike.
  const r = width * 0.026;
  const holes = Math.round(width / (r * 3.6));

  return (
    <View style={[styles.shadow, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={stampOutline(width, height, r, holes)} fill={PAPER} />
      </Svg>
      <View style={{ position: 'absolute', left: margin, top: margin, width: photo, height: photo, overflow: 'hidden' }}>
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      </View>
      <View style={{ position: 'absolute', left: margin, right: margin, top: margin + photo + width * 0.035 }}>
        <Text style={[styles.place, { fontSize: width * 0.085 }]} numberOfLines={1}>
          {place.toUpperCase()}
        </Text>
        <View style={styles.captionRow}>
          <Text style={[styles.meta, { fontSize: width * 0.05 }]}>{postmarkDate(createdAt)}</Text>
          <Text style={[styles.meta, { fontSize: width * 0.05 }]}>FOLD</Text>
        </View>
      </View>
      {postmark && <Postmark size={width * 0.42} place={place} createdAt={createdAt} style={{ right: -width * 0.06, top: width * 0.5 }} />}
    </View>
  );
}

interface PostmarkProps {
  size: number;
  place: string;
  createdAt: number;
  style?: object;
}

/** A round cancellation mark with wavy lines trailing off to the left. */
export function Postmark({ size, place, createdAt, style }: PostmarkProps) {
  const c = size / 2;
  const ring = size * 0.42;
  const wave = (y: number) => `M ${-size * 0.9} ${y} q ${size * 0.11} ${-size * 0.06} ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0`;
  return (
    <View pointerEvents="none" style={[styles.postmark, { width: size, height: size, transform: [{ rotate: '-14deg' }] }, style]}>
      <Svg width={size * 1.9} height={size} style={{ position: 'absolute', left: -size * 0.9 }} viewBox={`${-size * 0.9} 0 ${size * 1.9} ${size}`}>
        {[0.36, 0.5, 0.64].map((t) => (
          <Path key={t} d={wave(size * t)} stroke={INK} strokeWidth={size * 0.022} fill="none" strokeLinecap="round" />
        ))}
        <Circle cx={c} cy={c} r={ring} stroke={INK} strokeWidth={size * 0.03} fill="none" />
        <Circle cx={c} cy={c} r={ring * 0.72} stroke={INK} strokeWidth={size * 0.016} fill="none" />
        <SvgText x={c} y={c - size * 0.02} fontSize={size * 0.1} fontFamily="JetBrainsMono-Bold" fill={INK} textAnchor="middle">
          {place.toUpperCase().slice(0, 10)}
        </SvgText>
        <SvgText x={c} y={c + size * 0.11} fontSize={size * 0.08} fontFamily="JetBrainsMono-Medium" fill={INK} textAnchor="middle">
          {postmarkDate(createdAt)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  place: { fontFamily: 'JetBrainsMono-Bold', color: INK, letterSpacing: 0.5 },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  meta: { fontFamily: 'JetBrainsMono-Medium', color: '#6B6A66', letterSpacing: 1 },
  postmark: { position: 'absolute', opacity: 0.62 },
});
