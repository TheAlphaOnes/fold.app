/**
 * Even line breaks for copy in a monospaced face (JetBrains Mono, the app's
 * voice). Every glyph is the same width, so how many characters fit on a
 * line is exact; this uses the fewest lines the text needs and then makes
 * them as even as possible, instead of filling the first lines and leaving
 * one or two words alone on the last.
 */

/** Characters of a monospaced face that fit in `width` (advance ≈ 0.6 em + letter spacing). */
export function monoCharsPerLine(width: number, fontSize: number, letterSpacing = 0): number {
  return Math.max(1, Math.floor(width / (fontSize * 0.6 + letterSpacing)));
}

/** Greedy wrap at `limit` characters per line. */
function wrap(words: string[], limit: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= limit || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The text broken into even lines, each at most `maxChars` long: the line
 * count a plain wrap needs, with the shortest width that still fits in it.
 */
export function balanceLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const count = wrap(words, maxChars).length;
  if (count <= 1) return [words.join(' ')];
  // Narrow the measure until one more line would be needed.
  let best = wrap(words, maxChars);
  for (let limit = maxChars - 1; limit > 0; limit--) {
    const lines = wrap(words, limit);
    if (lines.length > count) break;
    best = lines;
  }
  return best;
}
