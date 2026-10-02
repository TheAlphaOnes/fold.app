/**
 * Media limits for a single memory.
 *
 * The element cap keeps a memory's sticker canvas from growing unbounded
 * (10-12 was the brief; 12 chosen). The per-file caps are deliberately
 * generous — big files should still come in, just not blow up the system.
 */

export const MAX_MEDIA_ELEMENTS = 12;

export const MAX_FILE_SIZE_BYTES = {
  /** Images and GIFs. */
  image: 25 * 1024 * 1024,
  /** Videos. */
  video: 500 * 1024 * 1024,
  /** Audio (music previews, shared audio files). */
  audio: 50 * 1024 * 1024,
} as const;

export type MediaKind = keyof typeof MAX_FILE_SIZE_BYTES;
