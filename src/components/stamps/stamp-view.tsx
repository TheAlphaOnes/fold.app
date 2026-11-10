/**
 * StampView — one stamp: the photo itself cut to a perforated stamp (it runs
 * right to the scalloped edge), the place and date printed over its foot
 * like a real stamp's lettering, and a round postmark inked over the corner
 * as the proof you were there. Everything is sized from `width`, so the same
 * stamp draws as a collection tile, a map card or the camera's fresh one.
 */

import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { stampOutline } from '@/canvas/render/stamp-outline';
import { formatSerial, postmarkDate, postmarkInk } from '@/stamps/geometry';

/** Height per unit of width: a portrait stamp. */
export const STAMP_ASPECT = 1.24;

/** How far the drawn shadow falls below the stamp (px). */
const SHADOW = 4;

/** The perforation for a stamp of this width: bites about every 7% of it, so any size reads alike. */
export function stampPerforation(width: number): { r: number; holes: number } {
  const r = width * 0.026;
  return { r, holes: Math.round(width / (r * 3.6)) };
}

interface StampViewProps {
  imageUri: string;
  place: string;
  createdAt: number;
  width: number;
  /** Hide the postmark (the camera inks it on with its own animation). */
  postmark?: boolean;
  /** The stamp's number in the collection ("No. 007"); FOLD when unknown. */
  serial?: number;
}

export function StampView({ imageUri, place, createdAt, width, postmark = true, serial }: StampViewProps) {
  const height = width * STAMP_ASPECT;
  // Ids must be unique per stamp (they're shared across SVGs on some platforms).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { r, holes } = stampPerforation(width);
  const outline = stampOutline(width, height, r, holes);
  // Below this the lettering is too small to read; thumbnails show just the photo.
  const lettered = width >= 100;
  const shadeH = height * 0.42;

  return (
    <View style={{ width, height }}>
      {/* The shadow is the stamp's own outline, offset and faint: drawn, not computed by the
          compositor (a view shadow on a transparent view renders every stamp offscreen). */}
      <Svg width={width + SHADOW} height={height + SHADOW} style={styles.layer}>
        <Defs>
          <ClipPath id={`cut${uid}`}>
            <Path d={outline} />
          </ClipPath>
          <LinearGradient id={`foot${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        <Path d={stampOutline(width, height, r, holes, { x: 0, y: SHADOW * 0.7 })} fill="#000000" fillOpacity={0.28} />
        <G clipPath={`url(#cut${uid})`}>
          <Rect width={width} height={height} fill="#FFFFFF" />
          <SvgImage href={{ uri: imageUri }} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
          {/* A soft shade at the foot so the lettering reads on any photo. */}
          {lettered && <Rect y={height - shadeH} width={width} height={shadeH} fill={`url(#foot${uid})`} />}
        </G>
      </Svg>
      {lettered && (
        <View style={[styles.caption, { left: width * 0.09, right: width * 0.09, bottom: width * 0.08 }]}>
          <Text style={[styles.place, { fontSize: width * 0.085 }]} numberOfLines={1}>
            {place.toUpperCase()}
          </Text>
          <View style={styles.captionRow}>
            <Text style={[styles.meta, { fontSize: width * 0.05 }]}>{postmarkDate(createdAt)}</Text>
            <Text style={[styles.meta, { fontSize: width * 0.05 }]}>{serial ? formatSerial(serial) : 'FOLD'}</Text>
          </View>
        </View>
      )}
      {postmark && <Postmark size={width * 0.42} place={place} createdAt={createdAt} style={{ right: -width * 0.06, top: width * 0.42 }} />}
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
  const ink = postmarkInk(place);
  const c = size / 2;
  const ring = size * 0.42;
  const wave = (y: number) => `M ${-size * 0.9} ${y} q ${size * 0.11} ${-size * 0.06} ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0`;
  return (
    <View pointerEvents="none" style={[styles.postmark, { width: size, height: size, transform: [{ rotate: '-14deg' }] }, style]}>
      <Svg width={size * 1.9} height={size} style={{ position: 'absolute', left: -size * 0.9 }} viewBox={`${-size * 0.9} 0 ${size * 1.9} ${size}`}>
        {[0.36, 0.5, 0.64].map((t) => (
          <Path key={t} d={wave(size * t)} stroke={ink} strokeWidth={size * 0.022} fill="none" strokeLinecap="round" />
        ))}
        <Circle cx={c} cy={c} r={ring} stroke={ink} strokeWidth={size * 0.03} fill="none" />
        <Circle cx={c} cy={c} r={ring * 0.72} stroke={ink} strokeWidth={size * 0.016} fill="none" />
        <SvgText x={c} y={c - size * 0.02} fontSize={size * 0.1} fontFamily="JetBrainsMono-Bold" fill={ink} textAnchor="middle">
          {place.toUpperCase().slice(0, 10)}
        </SvgText>
        <SvgText x={c} y={c + size * 0.11} fontSize={size * 0.08} fontFamily="JetBrainsMono-Medium" fill={ink} textAnchor="middle">
          {postmarkDate(createdAt)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
  caption: { position: 'absolute' },
  place: { fontFamily: 'JetBrainsMono-Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  meta: { fontFamily: 'JetBrainsMono-Medium', color: '#FFFFFFCC', letterSpacing: 1 },
  postmark: { position: 'absolute', opacity: 0.62 },
});
