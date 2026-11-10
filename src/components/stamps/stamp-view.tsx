/**
 * StampView — one stamp: perforated white paper with the photo filling it
 * (an even white border all round), the place and date printed over the
 * photo's foot like a real stamp's lettering, and a round postmark inked
 * over the corner as the proof you were there. Everything is sized from `width`, so the same stamp
 * draws as a collection tile, a map card or the camera's freshly made one.
 */

import React, { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { stampOutline } from "@/canvas/render/stamp-outline";
import { formatSerial, postmarkDate, postmarkInk } from "@/stamps/geometry";

/** Paper height per unit of width: a portrait stamp. */
export const STAMP_ASPECT = 1.24;

/** The white border around the photo, as a share of the width (the camera's window uses it too). */
export const STAMP_MARGIN = 0.08;

const PAPER = "#FFFFFF";
/** How far the drawn shadow falls below the paper (px). */
const SHADOW = 4;

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

export function StampView({
  imageUri,
  place,
  createdAt,
  width,
  postmark = true,
  serial,
}: StampViewProps) {
  const height = width * STAMP_ASPECT;
  // Each stamp's gradient needs its own id (ids are shared across SVGs on some platforms).
  const shadeId = `foot${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const margin = width * STAMP_MARGIN;
  // Below this the lettering is too small to read; thumbnails show just the photo.
  const lettered = width >= 100;
  const photoW = width - margin * 2;
  const photoH = height - margin * 2;
  // Bites about every 7% of the width, so small and large stamps read alike.
  const r = width * 0.026;
  const holes = Math.round(width / (r * 3.6));

  return (
    <View style={{ width, height }}>
      {/* The shadow is the paper's own outline, offset and faint: drawn, not computed by the
          compositor (a view shadow on a transparent view renders every stamp offscreen). */}
      <Svg width={width + SHADOW} height={height + SHADOW} style={styles.paper}>
        <Path
          d={stampOutline(width, height, r, holes, { x: 0, y: SHADOW * 0.7 })}
          fill="#000000"
          fillOpacity={0.28}
        />
        <Path d={stampOutline(width, height, r, holes)} fill={PAPER} />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: margin,
          top: margin,
          width: photoW,
          height: photoH,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
        {/* A soft shade at the foot so the lettering reads on any photo (none on thumbnails, too small to read). */}
        {lettered && (
          <Svg width={photoW} height={photoH * 0.42} style={styles.shade}>
            <Defs>
              <LinearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity={0} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
              </LinearGradient>
            </Defs>
            <Rect
              width={photoW}
              height={photoH * 0.42}
              fill={`url(#${shadeId})`}
            />
          </Svg>
        )}
        {lettered && (
          <View
            style={[
              styles.caption,
              {
                left: width * 0.05,
                right: width * 0.05,
                bottom: width * 0.045,
              },
            ]}
          >
            <Text
              style={[styles.place, { fontSize: width * 0.085 }]}
              numberOfLines={1}
            >
              {place.toUpperCase()}
            </Text>
            <View style={styles.captionRow}>
              <Text style={[styles.meta, { fontSize: width * 0.05 }]}>
                {postmarkDate(createdAt)}
              </Text>
              <Text style={[styles.meta, { fontSize: width * 0.05 }]}>
                {serial ? formatSerial(serial) : "FOLD"}
              </Text>
            </View>
          </View>
        )}
      </View>
      {postmark && (
        <Postmark
          size={width * 0.42}
          place={place}
          createdAt={createdAt}
          style={{ right: -width * 0.06, top: width * 0.5 }}
        />
      )}
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
  const wave = (y: number) =>
    `M ${-size * 0.9} ${y} q ${size * 0.11} ${-size * 0.06} ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0 t ${size * 0.22} 0`;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.postmark,
        { width: size, height: size, transform: [{ rotate: "-14deg" }] },
        style,
      ]}
    >
      <Svg
        width={size * 1.9}
        height={size}
        style={{ position: "absolute", left: -size * 0.9 }}
        viewBox={`${-size * 0.9} 0 ${size * 1.9} ${size}`}
      >
        {[0.36, 0.5, 0.64].map((t) => (
          <Path
            key={t}
            d={wave(size * t)}
            stroke={ink}
            strokeWidth={size * 0.022}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <Circle
          cx={c}
          cy={c}
          r={ring}
          stroke={ink}
          strokeWidth={size * 0.03}
          fill="none"
        />
        <Circle
          cx={c}
          cy={c}
          r={ring * 0.72}
          stroke={ink}
          strokeWidth={size * 0.016}
          fill="none"
        />
        <SvgText
          x={c}
          y={c - size * 0.02}
          fontSize={size * 0.1}
          fontFamily="JetBrainsMono-Bold"
          fill={ink}
          textAnchor="middle"
        >
          {place.toUpperCase().slice(0, 10)}
        </SvgText>
        <SvgText
          x={c}
          y={c + size * 0.11}
          fontSize={size * 0.08}
          fontFamily="JetBrainsMono-Medium"
          fill={ink}
          textAnchor="middle"
        >
          {postmarkDate(createdAt)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { position: "absolute", left: 0, top: 0 },
  shade: { position: "absolute", left: 0, bottom: 0 },
  caption: { position: "absolute" },
  place: {
    fontFamily: "JetBrainsMono-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  captionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  meta: {
    fontFamily: "JetBrainsMono-Medium",
    color: "#FFFFFFCC",
    letterSpacing: 1,
  },
  postmark: { position: "absolute", opacity: 0.62 },
});
