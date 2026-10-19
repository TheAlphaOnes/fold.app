/**
 * Memory analytics — describes a memory by its shape only (counts, types,
 * length buckets, time of day), never its content. Kept apart from the
 * journal store so the store reads as journal logic.
 */

import { momentAt } from '@/constants/progression';
import type { CreateCompositionInput } from '@/db/journal-repository';
import { useProgressionStore } from '@/hooks/use-progression';
import {
  takeReminderAttribution,
  textLengthBucket,
  track,
  type CaptureSource,
  type MemoryShape,
} from '@/services/analytics';
import type { MediaElement } from '@/types/journal';
import { toDayKey } from '@/utils/format-date';

type ShapeInput = Pick<
  CreateCompositionInput,
  'textContent' | 'mediaElements' | 'fontFamily' | 'textColor' | 'locationName' | 'storyIds'
>;

function countMedia(media: MediaElement[]) {
  const counts = { photos: 0, videos: 0, voice_notes: 0, songs: 0, gifs: 0 };
  for (const element of media) {
    if (element.isGif) counts.gifs++;
    else if (element.type === 'image') counts.photos++;
    else if (element.type === 'video') counts.videos++;
    else if (element.metadata) counts.songs++;
    else counts.voice_notes++;
  }
  return counts;
}

export function memoryShape(input: ShapeInput): MemoryShape {
  const textLength = input.textContent.trim().length;
  const mediaCount = input.mediaElements.length;
  return {
    content_type: textLength > 0 && mediaCount > 0 ? 'text_media' : mediaCount > 0 ? 'media' : 'text',
    text_length: textLengthBucket(textLength),
    media_count: mediaCount,
    ...countMedia(input.mediaElements),
    has_location: Boolean(input.locationName),
    story_count: input.storyIds?.length ?? 0,
    font_family: input.fontFamily,
    has_custom_color: Boolean(input.textColor),
  };
}

/**
 * Reports a new memory. Call before progression refreshes, so "first
 * memory" and "first today" read the journal as it was before this save.
 */
export function trackMemoryCreated(input: CreateCompositionInput, createdAt: number, source: CaptureSource): void {
  const { activeDays } = useProgressionStore.getState();
  const now = new Date();
  const at = new Date(createdAt);
  const nudge = takeReminderAttribution();
  track('memory_created', {
    ...memoryShape(input),
    source,
    via_reminder: nudge !== null,
    reminder_nudge: nudge,
    backdated: toDayKey(at) !== toDayKey(now),
    moment: momentAt(at).id,
    hour_of_day: at.getHours(),
    weekday: at.getDay(),
    is_first_memory: activeDays.size === 0,
    is_first_today: !activeDays.has(toDayKey(now)),
  });
}
