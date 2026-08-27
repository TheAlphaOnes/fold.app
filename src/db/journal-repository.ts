import { getDatabase } from './client';
import { mapRow } from './schema';
import type { Composition, CompositionRow, MediaElement, LocationData } from '@/types/journal';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Re-anchors a stored absolute file URI to the current app container path.
 *
 * iOS changes the app sandbox container UUID on every fresh install/update.
 * All absolute URIs stored in SQLite become invalid after this happens.
 *
 * Strategy: extract just the filename (everything after the last `/`)
 * and re-prefix with the live FileSystem.documentDirectory.
 * Files stored in sub-folders of documentDirectory are handled by
 * preserving the path relative to the last "Documents/" segment.
 */
export function resolveDocumentUri(uri: string): string {
  if (!uri) return uri;
  // Only patch file:// URIs that point into a Documents folder
  if (!uri.startsWith('file://') || !uri.includes('/Documents/')) return uri;

  const currentBase = FileSystem.documentDirectory ?? '';
  // Extract the path relative to /Documents/ (e.g. "picked_xxx.m4a")
  const afterDocuments = uri.split('/Documents/').pop();
  if (!afterDocuments) return uri;

  return `${currentBase}${afterDocuments}`;
}


export interface CreateCompositionInput {
  textContent: string;
  mediaElements: MediaElement[];
  fontFamily: string;
  fontSize: number;
  locationName?: string;
  locationCoords?: string;
  storyIds?: number[];
}

export interface UpdateMediaPositionsInput {
  id: number;
  mediaElements: MediaElement[];
}

export function rowToComposition(row: CompositionRow): Composition {
  let mediaElements: MediaElement[] = [];
  try {
    const parsed: MediaElement[] = JSON.parse(row.media_elements);
    // Re-anchor any stored URIs whose app container path has become stale
    // (happens on every iOS fresh install/simulator reinstall).
    mediaElements = parsed.map((m) => ({
      ...m,
      uri: resolveDocumentUri(m.uri),
    }));
  } catch (e) {
    console.error('Failed to parse media_elements for composition', row.id, e);
  }
  let location: LocationData | undefined = undefined;
  if (row.location_coords) {
    try {
      location = JSON.parse(row.location_coords);
      if (row.location_name && location) {
        location.name = row.location_name;
      }
    } catch(e) {}
  } else if (row.location_name) {
    location = { latitude: 0, longitude: 0, name: row.location_name };
  }

  return {
    id: row.id,
    textContent: row.text_content,
    mediaElements,
    createdAt: row.created_at,
    fontFamily: row.font_family,
    fontSize: row.font_size,
    location,
    storyIds: row.story_ids ? row.story_ids.split(',').map(Number) : (row.story_id ? [row.story_id] : []),
  };
}

export async function getAllCompositions(limit: number = 100, offset: number = 0): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c 
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  // We reverse the result to maintain the ASC order expected by the app for the feed
  return rows.reverse().map((row) => rowToComposition(mapRow(row)));
}

export async function getOnThisDayCompositions(month: number, date: number): Promise<Composition[]> {
  const db = await getDatabase();
  const targetStr = `${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c 
     WHERE strftime('%m-%d', datetime(c.created_at / 1000, 'unixepoch', 'localtime')) = ? 
     ORDER BY c.created_at ASC`,
    targetStr
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export async function getDatesWithMemories(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ date_str: string }>(
    `SELECT DISTINCT strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) as date_str 
     FROM compositions`
  );
  return rows.map(r => r.date_str).filter(Boolean);
}

export async function getCompositionById(id: number): Promise<Composition | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c WHERE c.id = ?`,
    id
  );
  if (!row) return null;
  return rowToComposition(mapRow(row));
}

export async function createComposition(input: CreateCompositionInput): Promise<Composition> {
  const db = await getDatabase();
  const now = Date.now();
  const mediaJson = JSON.stringify(input.mediaElements);
  
  const result = await db.runAsync(
    'INSERT INTO compositions (text_content, media_elements, created_at, font_family, font_size, location_name, location_coords, story_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    input.textContent,
    mediaJson,
    now,
    input.fontFamily,
    input.fontSize,
    input.locationName || null,
    input.locationCoords || null,
    null // Legacy story_id
  );
  
  const compositionId = result.lastInsertRowId as number;
  
  if (input.storyIds && input.storyIds.length > 0) {
    for (const sId of input.storyIds) {
      await db.runAsync('INSERT INTO composition_stories (composition_id, story_id) VALUES (?, ?)', compositionId, sId);
    }
  }

  let location: LocationData | undefined = undefined;
  if (input.locationCoords) {
    try {
      location = JSON.parse(input.locationCoords);
      if (input.locationName && location) {
        location.name = input.locationName;
      }
    } catch(e) {}
  } else if (input.locationName) {
    location = { latitude: 0, longitude: 0, name: input.locationName };
  }

  return {
    id: compositionId,
    textContent: input.textContent,
    mediaElements: input.mediaElements,
    createdAt: now,
    fontFamily: input.fontFamily,
    fontSize: input.fontSize,
    location,
    storyIds: input.storyIds || [],
  };
}

export async function updateMediaPositions(input: UpdateMediaPositionsInput): Promise<void> {
  const db = await getDatabase();
  const mediaJson = JSON.stringify(input.mediaElements);
  await db.runAsync(
    'UPDATE compositions SET media_elements = ? WHERE id = ?',
    mediaJson,
    input.id
  );
}

export async function toggleCompositionStoryId(id: number, storyId: number): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT 1 FROM composition_stories WHERE composition_id = ? AND story_id = ?', id, storyId);
  
  if (existing) {
    await db.runAsync('DELETE FROM composition_stories WHERE composition_id = ? AND story_id = ?', id, storyId);
    return false; // Removed
  } else {
    await db.runAsync('INSERT INTO composition_stories (composition_id, story_id) VALUES (?, ?)', id, storyId);
    return true; // Added
  }
}

export async function deleteComposition(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM compositions WHERE id = ?', id);
}

export async function deleteAllCompositions(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM compositions');
}
