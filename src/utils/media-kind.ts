import type { MediaElement } from '@/types/journal';

/** GIFs from the picker are downloaded as `klipy_<time>_<id>.<ext>`. */
const GIF_FILENAME = /\/klipy_[^/]*$/;
const GIF_EXTENSION = /\.gif(\?.*)?$/i;

/**
 * True for GIF stickers. New GIFs carry `isGif`; ones saved before the flag
 * existed are recognised by their download filename or extension.
 */
export function isGifMedia(media: Pick<MediaElement, 'uri'> & { isGif?: boolean }): boolean {
  if (media.isGif) return true;
  return GIF_FILENAME.test(media.uri) || GIF_EXTENSION.test(media.uri);
}

/**
 * Decorative media: GIFs and stamps placed as stickers. They dress a memory
 * but aren't its photos, so covers, backdrops, reels and template cells skip them.
 */
export function isDecorativeMedia(media: Pick<MediaElement, 'uri'> & { isGif?: boolean; isStamp?: boolean }): boolean {
  return !!media.isStamp || isGifMedia(media);
}
