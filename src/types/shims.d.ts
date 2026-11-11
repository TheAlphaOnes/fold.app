/**
 * Declarations for the pure-JS codec libraries that ship no TypeScript
 * types of their own. Kept to exactly the surface the animated export
 * uses; see src/canvas/gif-codec.ts.
 */

declare module 'gifenc' {
  export interface GifFrameOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GifEncoderInstance;

  export interface QuantizeOptions {
    format?: 'rgb565' | 'rgb444' | 'rgba4444';
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }

  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: QuantizeOptions): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette?: number[][],
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
}

declare module 'upng-js' {
  interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    data: ArrayBuffer;
    frames?: unknown[];
    tabs?: Record<string, unknown>;
  }

  const UPNG: {
    decode(buffer: ArrayBuffer): UPNGImage;
    toRGBA8(image: UPNGImage): ArrayBuffer[];
  };

  export default UPNG;
}
