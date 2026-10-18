/**
 * Marker, script, and sketch faces draw outside the em box.
 * A 1.5 line height clips those strokes on both the card and the memory page.
 */
const TALL_FONT = /PermanentMarker|RockSalt|Bigelow|Caveat|Amatic|Cookiemonster|DancingScript|Pacifico/i;

/**
 * Optical size balance. The same point size looks wildly different across
 * these faces (Caveat's lowercase is ~60% the height of JetBrains Mono's;
 * Press Start is nearly twice as wide). Each factor is the geometric mean of
 * the font's x-height ratio and average glyph-width ratio against JetBrains
 * Mono, measured from the font files, clamped to 0.72–1.45 so condensed
 * scripts never overflow a card. S/M/L/XL/XXL therefore read as the same
 * size whichever font is picked.
 */
const OPTICAL_SCALE: readonly [RegExp, number][] = [
  [/^JetBrainsMono/, 1],
  [/^BitcountGridDouble/, 1.08],
  [/^RockSalt/, 0.8],
  [/^BigelowRules/, 1.45],
  [/^RubikGlitchPop/, 1.07],
  [/^Ewert/, 0.8],
  [/^RubikDoodleShadow/, 1.04],
  [/^Cookiemonster/, 1.45],
  [/^PlayfairDisplay/, 1.17],
  [/^SpaceGrotesk/, 1.16],
  [/^BebasNeue/, 1.16],
  [/^Caveat/, 1.45],
  [/^DancingScript/, 1.45],
  [/^Righteous/, 1.14],
  [/^Pacifico/, 1.28],
  [/^PermanentMarker/, 1],
  [/^AmaticSC/, 1.29],
  [/^PressStart2P/, 0.73],
];

export function opticalScale(fontFamily: string | undefined): number {
  if (!fontFamily) return 1;
  return OPTICAL_SCALE.find(([pattern]) => pattern.test(fontFamily))?.[1] ?? 1;
}

export function memoryTextMetrics(fontFamily: string | undefined, fontSize: number) {
  const base = fontSize > 0 ? fontSize : 21;
  const size = Math.round(base * opticalScale(fontFamily));
  const tall = TALL_FONT.test(fontFamily ?? '');
  return {
    fontSize: size,
    lineHeight: Math.ceil(size * (tall ? 2.2 : 1.55)),
    paddingTop: tall ? Math.ceil(size * 0.16) : 0,
    paddingBottom: tall ? Math.ceil(size * 0.08) : 0,
  };
}
