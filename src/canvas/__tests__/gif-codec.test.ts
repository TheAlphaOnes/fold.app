import { describe, expect, it } from 'vitest';

import { base64ToBytes, bytesToBase64, decodeGifFrames, encodeAnimatedGif, pngToRgba, rgbaToGifDataUri } from '@/canvas/gif-codec';

/** A 4×4 frame of one flat colour. */
const flat = (r: number, g: number, b: number): Uint8Array => {
  const d = new Uint8Array(4 * 4 * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  return d;
};

describe('base64 helpers', () => {
  it('round-trips any byte length', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 16, 255]) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = (i * 37 + n) % 256;
      expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
    }
  });

  it('matches the known encodings', () => {
    expect(bytesToBase64(new Uint8Array([0, 0, 0]))).toBe('AAAA');
    expect(Array.from(base64ToBytes('/w=='))).toEqual([255]);
    expect(Array.from(base64ToBytes('AAAA'))).toEqual([0, 0, 0]);
  });
});

describe('encodeAnimatedGif + decodeGifFrames', () => {
  it('encodes frames that decode back with the same colours and pacing', () => {
    const bytes = encodeAnimatedGif(
      [
        { width: 4, height: 4, rgba: flat(255, 0, 0) },
        { width: 4, height: 4, rgba: flat(0, 0, 255) },
      ],
      120,
    );
    const decoded = decodeGifFrames(bytes);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect(decoded.frames).toHaveLength(2);
    expect(decoded.frames.map((f) => f.delayMs)).toEqual([120, 120]);
    const first = Array.from(decoded.frames[0].rgba.slice(0, 4));
    const second = Array.from(decoded.frames[1].rgba.slice(0, 4));
    expect(first).toEqual([255, 0, 0, 255]);
    expect(second).toEqual([0, 0, 255, 255]);
  });

  it('writes a looped GIF89a', () => {
    const bytes = encodeAnimatedGif([{ width: 4, height: 4, rgba: flat(1, 2, 3) }], 120);
    expect(Array.from(bytes.slice(0, 6))).toEqual([71, 73, 70, 56, 57, 97]); // GIF89a
  });
});

describe('rgbaToGifDataUri', () => {
  it('keeps a sticker’s transparent pixels in the still frame', () => {
    const rgba = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const k = (i * 4 + j) * 4;
        if (j >= 2) rgba.set([255, 0, 0, 255], k);
      }
    }
    const uri = rgbaToGifDataUri(rgba, 4, 4);
    expect(uri.startsWith('data:image/gif;base64,')).toBe(true);
    const decoded = decodeGifFrames(base64ToBytes(uri.slice('data:image/gif;base64,'.length)));
    expect(decoded.frames).toHaveLength(1);
    const left = Array.from(decoded.frames[0].rgba.slice(0, 4));
    const right = Array.from(decoded.frames[0].rgba.slice(28, 32));
    expect(left[3]).toBe(0);
    expect(right).toEqual([255, 0, 0, 255]);
  });
});

describe('pngToRgba', () => {
  it('decodes a captured PNG back to pixels', () => {
    // A 1×1 PNG, rgba(255,0,0,127).
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const { width, height, rgba } = pngToRgba(base64ToBytes(png));
    expect(width).toBe(1);
    expect(height).toBe(1);
    expect(Array.from(rgba)).toEqual([255, 0, 0, 127]);
  });
});
