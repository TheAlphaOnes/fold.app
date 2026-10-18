import { getDatabase } from './client';
import { mapRow } from './schema';
import type { Composition, CompositionRow, MediaElement, LocationData } from '@/types/journal';
import type { TimelineFeedMode, TimelineSpineEntry } from '@/utils/timeline';
import * as FileSystem from 'expo-file-system/legacy';
import { isGifMedia } from '@/utils/media-kind';

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
  textColor?: string | null;
  locationName?: string;
  locationCoords?: string;
  storyIds?: number[];
  createdAt?: number;
}

export interface UpdateCompositionInput {
  id: number;
  textContent: string;
  mediaElements: MediaElement[];
  fontFamily: string;
  fontSize: number;
  textColor?: string | null;
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
    textColor: row.text_color,
    deletedAt: row.deleted_at,
    location,
    storyIds: row.story_ids ? row.story_ids.split(',').map(Number) : (row.story_id ? [row.story_id] : []),
  };
}

export async function getAllCompositions(limit: number = 100, offset: number = 0): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c 
     WHERE c.deleted_at IS NULL
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  // We reverse the result to maintain the ASC order expected by the app for the feed
  return rows.reverse().map((row) => rowToComposition(mapRow(row)));
}

const COMPOSITION_SELECT = `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids FROM compositions c`;

function anchorParts(anchor: Date): { monthDay: string; day: string } {
  const month = String(anchor.getMonth() + 1).padStart(2, '0');
  const day = String(anchor.getDate()).padStart(2, '0');
  return { monthDay: `${month}-${day}`, day };
}

/**
 * Lightweight index for the active feed.
 * Yearly keeps this calendar day across every year.
 * Monthly keeps this day-of-month across every month.
 * Infinite keeps every memory.
 * Ordered newest-first so the present sits at the bottom of the inverted list.
 */
export async function getTimelineSpine(
  mode: TimelineFeedMode,
  anchor: Date,
): Promise<TimelineSpineEntry[]> {
  const db = await getDatabase();
  const { monthDay, day } = anchorParts(anchor);

  let where = 'WHERE c.deleted_at IS NULL';
  const params: string[] = [];
  if (mode === 'yearly') {
    where += ` AND strftime('%m-%d', datetime(c.created_at / 1000, 'unixepoch', 'localtime')) = ?`;
    params.push(monthDay);
  } else if (mode === 'monthly') {
    where += ` AND strftime('%d', datetime(c.created_at / 1000, 'unixepoch', 'localtime')) = ?`;
    params.push(day);
  }

  const rows = await db.getAllAsync<{ id: number; created_at: number }>(
    `SELECT c.id as id, c.created_at as created_at FROM compositions c ${where} ORDER BY c.created_at DESC`,
    params,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: Number(row.created_at),
  }));
}

export async function getCompositionsByIds(ids: number[]): Promise<Composition[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync(
    `${COMPOSITION_SELECT} WHERE c.id IN (${placeholders}) AND c.deleted_at IS NULL`,
    ids,
  );
  const byId = new Map<number, Composition>();
  for (const row of rows) {
    const composition = rowToComposition(mapRow(row));
    byId.set(composition.id, composition);
  }
  return ids.flatMap((id) => {
    const composition = byId.get(id);
    return composition ? [composition] : [];
  });
}

export async function getOnThisDayCompositions(month: number, date: number): Promise<Composition[]> {
  const db = await getDatabase();
  const targetStr = `${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c 
     WHERE strftime('%m-%d', datetime(c.created_at / 1000, 'unixepoch', 'localtime')) = ? 
       AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    targetStr
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export async function getCompositionsOnDate(dayKey: string): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids
     FROM compositions c
     WHERE strftime('%Y-%m-%d', datetime(c.created_at / 1000, 'unixepoch', 'localtime')) = ?
       AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    dayKey,
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

/** A random sample of memories created before `timestamp` (ms). */
export async function getRandomCompositionsBefore(timestamp: number, limit: number): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `${COMPOSITION_SELECT} WHERE c.created_at < ? AND c.deleted_at IS NULL ORDER BY RANDOM() LIMIT ?`,
    timestamp,
    limit,
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export interface DayCover {
  uri: string;
  type: 'image' | 'video';
}

/**
 * One cover image per day for a calendar month ("YYYY-MM"): the newest
 * photo or video of that day, keyed by "YYYY-MM-DD". GIF stickers are skipped.
 */
export async function getDayCoversForMonth(yearMonth: string): Promise<Record<string, DayCover>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string; media_elements: string }>(
    `SELECT strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) AS day, media_elements
     FROM compositions
     WHERE strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch', 'localtime')) = ?
       AND media_elements != '[]'
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    yearMonth,
  );
  const covers: Record<string, DayCover> = {};
  for (const row of rows) {
    if (covers[row.day]) continue;
    try {
      const media: MediaElement[] = JSON.parse(row.media_elements);
      const visual = media.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
      if (visual) covers[row.day] = { uri: resolveDocumentUri(visual.uri), type: visual.type as DayCover['type'] };
    } catch (error) {
      console.error('Failed to parse media for day cover', row.day, error);
    }
  }
  return covers;
}

export async function getDatesWithMemories(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ date_str: string }>(
    `SELECT DISTINCT strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) as date_str 
     FROM compositions WHERE deleted_at IS NULL`
  );
  return rows.map(r => r.date_str).filter(Boolean);
}

export async function getCompositionById(id: number): Promise<Composition | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids 
     FROM compositions c WHERE c.id = ? AND c.deleted_at IS NULL`,
    id
  );
  if (!row) return null;
  return rowToComposition(mapRow(row));
}

/**
 * The most recently *added* memory (highest id), or null when the journal is
 * empty. Ordered by id rather than created_at so a memory backdated through
 * the time machine still counts as the newest addition.
 */
export async function getLatestComposition(): Promise<Composition | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`${COMPOSITION_SELECT} WHERE c.deleted_at IS NULL ORDER BY c.id DESC LIMIT 1`);
  if (!row) return null;
  return rowToComposition(mapRow(row));
}

export async function createComposition(input: CreateCompositionInput): Promise<Composition> {
  const db = await getDatabase();
  const creationTime = input.createdAt ?? Date.now();
  const mediaJson = JSON.stringify(input.mediaElements);
  
  const result = await db.runAsync(
    'INSERT INTO compositions (text_content, media_elements, created_at, font_family, font_size, text_color, location_name, location_coords, story_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    input.textContent,
    mediaJson,
    creationTime,
    input.fontFamily,
    input.fontSize,
    input.textColor ?? null,
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
    createdAt: creationTime,
    fontFamily: input.fontFamily,
    fontSize: input.fontSize,
    textColor: input.textColor ?? undefined,
    location,
    storyIds: input.storyIds || [],
  };
}

export async function updateComposition(input: UpdateCompositionInput): Promise<Composition | null> {
  const db = await getDatabase();
  const mediaJson = JSON.stringify(input.mediaElements);
  await db.runAsync(
    'UPDATE compositions SET text_content = ?, media_elements = ?, font_family = ?, font_size = ?, text_color = ?, location_name = ?, location_coords = ? WHERE id = ?',
    input.textContent,
    mediaJson,
    input.fontFamily,
    input.fontSize,
    input.textColor ?? null,
    input.locationName || null,
    input.locationCoords || null,
    input.id
  );

  if (input.storyIds !== undefined) {
    await db.runAsync('DELETE FROM composition_stories WHERE composition_id = ?', input.id);
    for (const sId of input.storyIds) {
      await db.runAsync('INSERT INTO composition_stories (composition_id, story_id) VALUES (?, ?)', input.id, sId);
    }
  }

  return getCompositionById(input.id);
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

// Foreign keys are not enabled on this connection, so ON DELETE CASCADE never
// fires; story links are removed explicitly in the same transaction.
export async function deleteComposition(id: number): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM composition_stories WHERE composition_id = ?', id);
    await db.runAsync('DELETE FROM compositions WHERE id = ?', id);
  });
}

// --- Recently Deleted -------------------------------------------------------

/** Move a memory to the bin. It disappears everywhere but keeps its files. */
export async function trashComposition(id: number, at: number = Date.now()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE compositions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', at, id);
}

/** Move every live memory to the bin ("clear all" stays recoverable). */
export async function trashAllCompositions(at: number = Date.now()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE compositions SET deleted_at = ? WHERE deleted_at IS NULL', at);
}

/** Bring a memory back from the bin, story links intact. */
export async function restoreComposition(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE compositions SET deleted_at = NULL WHERE id = ?', id);
}

/** Everything in the bin, most recently deleted first. */
export async function getTrashedCompositions(): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `${COMPOSITION_SELECT} WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC`,
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

/** Binned memories deleted before `cutoff` (ms) — due for permanent removal. */
export async function getTrashedBefore(cutoff: number): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `${COMPOSITION_SELECT} WHERE c.deleted_at IS NOT NULL AND c.deleted_at < ?`,
    cutoff,
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export async function countTrashed(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM compositions WHERE deleted_at IS NOT NULL');
  return Number(row?.n ?? 0);
}

/**
 * True when any memory or story cover still points at a file with this name.
 * Matched by file name because stored absolute paths go stale across iOS
 * reinstalls; media files get unique random names when they are copied in.
 */
export async function isMediaFileReferenced(fileName: string): Promise<boolean> {
  const db = await getDatabase();
  const needle = `/${fileName}`;
  const row = await db.getFirstAsync(
    `SELECT 1 FROM compositions WHERE instr(media_elements, ?) > 0
     UNION ALL
     SELECT 1 FROM stories WHERE instr(IFNULL(cover_image_uri, ''), ?) > 0
     LIMIT 1`,
    needle,
    needle,
  );
  return row != null;
}
