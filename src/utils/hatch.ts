/**
 * Fold's diagonal hatching as plain path data for an exact size.
 *
 * Lines run "\" (top-left to bottom-right): y = x + c, one family per
 * offset, repeating every `period` points. Drawing them for the measured
 * size (instead of an SVG <Pattern> sized in percentages) means the
 * stripes always reach every edge: react-native-svg resolves percentage
 * patterns against a stale size and leaves areas bare.
 */
export function hatchPath(width: number, height: number, period: number, offsets: readonly number[] = [0]): string {
  if (width <= 0 || height <= 0 || period <= 0) return '';
  const segments: string[] = [];
  // c spans every line that crosses the box: from the bottom-left corner
  // (c = height) to the top-right one (c = -width), with one period spare.
  const first = Math.floor(-width / period) - 1;
  const last = Math.ceil(height / period) + 1;
  for (let k = first; k <= last; k++) {
    for (const offset of offsets) {
      const c = k * period + offset;
      segments.push(`M0 ${round(c)}L${round(width)} ${round(c + width)}`);
    }
  }
  return segments.join('');
}

const round = (v: number) => Math.round(v * 100) / 100;
