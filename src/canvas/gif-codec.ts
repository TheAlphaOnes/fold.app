/**
 * Byte work for the animated export, on pure-JS codecs only: gifenc to
 * encode, gifuct-js to decode GIFs, upng-js to decode the captured
 * frames. No native video pipeline anywhere — every step is plain
 * typed-array maths that runs the same under Hermes as in Node, so it is
 * unit-testable end to end.
 */

import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { decompressFrames, parseGIF } from 'gifuct-js';
import UPNG from 'upng-js';

/** The alphabet of base64, table-driven both ways so no runtime builtin is assumed. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_INDEX = new Int16Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) B64_INDEX[B64.charCodeAt(i)] = i;

/** base64 → bytes (the share pipeline's only binary bridge; RN has no atob). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[\s=]/g, '');
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_INDEX[clean.charCodeAt(i)];
    const b = B64_INDEX[clean.charCodeAt(i + 1)];
    const c = B64_INDEX[clean.charCodeAt(i + 2)];
    const d = B64_INDEX[clean.charCodeAt(i + 3)];
    const n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    out[o++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length) out[o++] = n & 0xff;
  }
  return o === out.length ? out : out.subarray(0, o);
}

/** bytes → base64 with padding (RN has no btoa; the encoder writes files and data URIs). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

/** One decoded GIF frame: the whole image at that moment, and how long it shows. */
export interface DecodedGifFrame {
  rgba: Uint8ClampedArray;
  delayMs: number;
}

/**
 * Every frame of a GIF, composited to full-size RGBA (disposal handled by
 * the decoder). Frames marked too fast to see hold for a beat — the same
 * 100ms browsers and iOS stretch them to — so playback timing matches what
 * the live card shows.
 */
export function decodeGifFrames(bytes: Uint8Array): { width: number; height: number; frames: DecodedGifFrame[] } {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const parsed = parseGIF(buffer);
  const frames = decompressFrames(parsed, true).map((f) => ({
    rgba: f.patch,
    delayMs: f.delay > 0 && f.delay < 20 ? 100 : f.delay || 100,
  }));
  return { width: parsed.lsd.width, height: parsed.lsd.height, frames };
}

/**
 * One RGBA frame as a single-frame GIF data URI — the only still-image
 * form that keeps a sticker's transparent pixels (a PNG writer would need
 * its own compressor; a single-frame GIF is exactly what the encoder here
 * already makes). The view shows it like any image; it just never moves.
 */
export function rgbaToGifDataUri(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): string {
  const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true });
  let transparentIndex = -1;
  palette.forEach((c, i) => {
    // 1-bit alpha means any entry with zero alpha is THE transparent one.
    if (transparentIndex < 0 && c.length > 3 && c[3] === 0) transparentIndex = i;
  });
  const index = applyPalette(rgba, palette, 'rgba4444');
  const enc = GIFEncoder();
  enc.writeFrame(index, width, height, { palette, delay: 0, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex) });
  enc.finish();
  return `data:image/gif;base64,${bytesToBase64(enc.bytes())}`;
}

/** A captured frame, decoded back to pixels for the encoder. */
export interface RgbaFrame {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** Decodes a PNG (the capture of one frame) to RGBA pixels. */
export function pngToRgba(png: Uint8Array): RgbaFrame {
  const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
  const image = UPNG.decode(buffer);
  const [rgba] = UPNG.toRGBA8(image);
  return { width: image.width, height: image.height, rgba: new Uint8Array(rgba) };
}

/**
 * The captured frames become one looping GIF. The card is fully opaque
 * (its own background paints behind everything), so a plain 256-colour
 * palette per frame is all it needs.
 */
export function encodeAnimatedGif(frames: RgbaFrame[], stepMs: number): Uint8Array {
  const enc = GIFEncoder();
  frames.forEach((f, i) => {
    const palette = quantize(f.rgba, 256);
    const index = applyPalette(f.rgba, palette);
    enc.writeFrame(index, f.width, f.height, { palette, delay: stepMs, repeat: 0, first: i === 0 });
  });
  enc.finish();
  return enc.bytes();
}
