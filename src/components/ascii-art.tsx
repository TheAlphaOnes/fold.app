/**
 * AsciiArt — renders ASCII art as a vector graphic.
 *
 * The art is converted to an SVG at render time: every line becomes one
 * SVG text node pinned to an exact row of a character grid, drawn in the
 * bundled JetBrains Mono (fixed 0.6 em advance). The whole piece scales as
 * a single unit through one fixed viewBox and lines can neither wrap nor
 * reflow, so the art renders identically on every device — the failure
 * modes of ASCII art in a plain <Text> (platform font fallback,
 * line-height collapse, letter-spacing drift) cannot occur.
 *
 * The motion matches the home empty state: the piece fades and rises in,
 * then drifts on a slow float with a subtle, out-of-phase twist.
 */

import React, { useEffect } from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const FONT_FAMILY = 'JetBrainsMono-Regular';

/** JetBrains Mono advances exactly 0.6 em, so one column is 6 units at a 10 unit font size. */
const CELL_W = 6;
/** Row pitch — the 10/10 rhythm the home empty state renders its art with. */
const CELL_H = 10;
/** Baseline position inside a row. */
const BASELINE = 8;

interface AsciiArtProps {
  /** The art, one line per row. */
  art: string;
  /** Glyph color. */
  color: string;
  /** Rendered width in dp; the height follows the art's aspect ratio. */
  width: number;
}

export function AsciiArt({ art, color, width }: AsciiArtProps) {
  const lines = art.split('\n');
  const cols = Math.max(...lines.map((line) => line.length));
  const rows = lines.length;
  const height = (width * rows * CELL_H) / (cols * CELL_W);

  const artOpacity = useSharedValue(0);
  const artTranslateY = useSharedValue(8);
  const floatOffset = useSharedValue(0);
  const artRotation = useSharedValue(0);

  useEffect(() => {
    // Entrance: fade and rise, then hand over to the perpetual drift.
    artOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    artTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    // Slow float.
    floatOffset.value = withDelay(
      1100,
      withRepeat(
        withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    // Out-of-phase twist so the drift never reads as one rigid movement.
    artRotation.value = withDelay(
      1100,
      withSequence(
        withTiming(1.5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withRepeat(
          withTiming(-1.5, {
            duration: 3600,
            easing: Easing.inOut(Easing.sin),
          }),
          -1,
          true,
        ),
      ),
    );
  }, [artOpacity, artTranslateY, floatOffset, artRotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: artOpacity.value,
    transform: [
      { translateY: artTranslateY.value + floatOffset.value },
      { rotate: `${artRotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, { width, height }]}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${cols * CELL_W} ${rows * CELL_H}`}
      >
        {lines.map((line, index) => (
          <SvgText
            key={`line-${index}`}
            x={0}
            y={index * CELL_H + BASELINE}
            fill={color}
            fontFamily={FONT_FAMILY}
            fontSize={CELL_H}
          >
            {line}
          </SvgText>
        ))}
      </Svg>
    </Animated.View>
  );
}
