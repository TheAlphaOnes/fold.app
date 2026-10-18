/**
 * Resurface — a random handful of the user's past memories.
 *
 * Any memory from before today can appear; each load draws a fresh random
 * sample. The same media file is often attached to several memories (and a
 * re-captured video is stored under a new name), so repeats are dropped by
 * media type + file size, and identical text memories are dropped too.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { getRandomCompositionsBefore } from '@/db/journal-repository';
import type { Composition } from '@/types/journal';
import { isGifMedia } from '@/utils/media-kind';

const SAMPLE_POOL = 80;

export function hasVisualMedia(memory: Composition): boolean {
  return memory.mediaElements.some((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
}

async function identityOf(memory: Composition): Promise<string> {
  const lead = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  if (!lead) return `text:${memory.textContent.trim().toLowerCase()}`;
  try {
    const info = await FileSystem.getInfoAsync(lead.uri);
    if (info.exists && typeof info.size === 'number') return `${lead.type}:${info.size}`;
  } catch {
    // Unreadable file: fall back to its path.
  }
  return `${lead.type}:${lead.uri}`;
}

/** Up to `count` distinct random memories from before today. */
export async function findRandomPastMemories(count = 18, now: Date = new Date()): Promise<Composition[]> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pool = await getRandomCompositionsBefore(startOfToday, SAMPLE_POOL);

  const seen = new Set<string>();
  const picked: Composition[] = [];
  for (const memory of pool) {
    if (picked.length >= count) break;
    const hasWords = memory.textContent.trim().length > 0;
    if (!hasVisualMedia(memory) && !hasWords) continue;
    const identity = await identityOf(memory);
    if (seen.has(identity)) continue;
    seen.add(identity);
    picked.push(memory);
  }
  return picked;
}
