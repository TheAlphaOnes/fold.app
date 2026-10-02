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
 * Rendered completely still — no entrance or perpetual motion.
 */

import React from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';

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
  /** Effective glyph size in dp; the piece sizes itself from its grid. */
  fontSize: number;
}

export function AsciiArt({ art, color, fontSize }: AsciiArtProps) {
  const lines = art.split('\n');
  const cols = Math.max(...lines.map((line) => line.length));
  const rows = lines.length;
  const scale = fontSize / CELL_H;
  const width = cols * CELL_W * scale;
  const height = rows * CELL_H * scale;

  return (
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
  );
}
