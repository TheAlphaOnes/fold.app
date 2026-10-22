/**
 * Which stories the profile's story board shows, and with which photo.
 * Shared by the card and the profile cache, which pre-loads these photos.
 */

import type { Story } from '@/types/journal';

const MAX_TILES = 5;

export interface StoryTile {
  storyId: number;
  title: string;
  uri: string | null;
}

/** Cheap string hash, for a shuffle that is stable for a given seed. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Shuffled per day, not per render: the profile shows the same tiles every
 * time it opens today (their photos already cached), and new ones tomorrow.
 */
function dailyShuffle<T extends StoryTile>(items: T[]): T[] {
  const day = new Date().toDateString();
  return [...items].sort((a, b) => hash(day + a.storyId + a.uri) - hash(day + b.storyId + b.uri));
}

/** Up to five tiles: photos from stories first, then stories with none. */
export function pickTiles(stories: Story[]): StoryTile[] {
  const withMedia: StoryTile[] = [];
  const empty: StoryTile[] = [];
  for (const story of stories) {
    // Only photos can fill a tile; voice notes and videos have no frame to show here.
    const uris = new Set<string>();
    if (story.coverImageUri) uris.add(story.coverImageUri);
    for (const media of story.sampleMedia ?? []) if (media.type === 'image') uris.add(media.uri);
    if (uris.size === 0) empty.push({ storyId: story.id, title: story.title, uri: null });
    for (const uri of uris) withMedia.push({ storyId: story.id, title: story.title, uri });
  }
  return [...dailyShuffle(withMedia), ...dailyShuffle(empty)].slice(0, MAX_TILES);
}
