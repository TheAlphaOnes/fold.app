/**
 * Marker, script, and sketch faces draw outside the em box.
 * A 1.5 line height clips those strokes on both the card and the memory page.
 */
const TALL_FONT = /PermanentMarker|RockSalt|Bigelow|Caveat|Amatic/i;

export function memoryTextMetrics(fontFamily: string | undefined, fontSize: number) {
  const size = fontSize > 0 ? fontSize : 21;
  const tall = TALL_FONT.test(fontFamily ?? '');
  return {
    fontSize: size,
    lineHeight: Math.ceil(size * (tall ? 2.2 : 1.55)),
    paddingTop: tall ? Math.ceil(size * 0.16) : 0,
    paddingBottom: tall ? Math.ceil(size * 0.08) : 0,
  };
}
