import { getDatabase } from './client';
import { mapRow } from './schema';
import type { Story, StoryRow, Composition } from '@/types/journal';
import { resolveDocumentUri, rowToComposition } from './journal-repository';

export interface CreateStoryInput {
  title: string;
  coverImageUri?: string;
}

export interface UpdateStoryInput {
  id: number;
  title?: string;
  coverImageUri?: string;
}

function mapStoryRow(row: unknown): Story {
  const r = row as Record<string, unknown>;
  
  let sampleMedia: { uri: string; type: 'image' | 'video' | 'audio' }[] | undefined = undefined;
  if (r.sample_media && typeof r.sample_media === 'string') {
    try {
      const mediaArrays = JSON.parse(`[${r.sample_media}]`);
      const mediaList: { uri: string; type: 'image' | 'video' | 'audio' }[] = [];
      for (const arr of mediaArrays) {
        if (Array.isArray(arr)) {
          for (const media of arr) {
            // Include audio? The previous code didn't filter, but maybe we only want visual media for thumbnails.
            // Let's stick to what we have, but we can handle audio later if needed.
            if (media?.uri && mediaList.length < 3) {
              mediaList.push({
                uri: resolveDocumentUri(media.uri),
                type: media.type || 'image' // fallback to image
              });
            }
          }
        }
      }
      if (mediaList.length > 0) {
        sampleMedia = mediaList;
      }
    } catch (e) {
      console.warn('Failed to parse sample_media for story', r.id);
    }
  }

  return {
    id: Number(r.id),
    title: String(r.title),
    coverImageUri: r.cover_image_uri ? resolveDocumentUri(String(r.cover_image_uri)) : undefined,
    sampleMedia,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export async function createStory(input: CreateStoryInput): Promise<Story> {
  const db = await getDatabase();
  const now = Date.now();
  
  const result = await db.runAsync(
    'INSERT INTO stories (title, cover_image_uri, created_at, updated_at) VALUES (?, ?, ?, ?)',
    input.title,
    input.coverImageUri || null,
    now,
    now
  );

  return {
    id: result.lastInsertRowId as number,
    title: input.title,
    coverImageUri: input.coverImageUri,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateStory(input: UpdateStoryInput): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  let query = 'UPDATE stories SET updated_at = ?';
  const params: any[] = [now];

  if (input.title !== undefined) {
    query += ', title = ?';
    params.push(input.title);
  }
  if (input.coverImageUri !== undefined) {
    query += ', cover_image_uri = ?';
    params.push(input.coverImageUri);
  }

  query += ' WHERE id = ?';
  params.push(input.id);

  await db.runAsync(query, ...params);
}

export async function getAllStories(): Promise<Story[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT s.*, 
      (SELECT group_concat(media_elements) FROM (
         SELECT c.media_elements FROM composition_stories cs
         JOIN compositions c ON c.id = cs.composition_id
         WHERE cs.story_id = s.id AND c.media_elements != '[]' 
         ORDER BY c.created_at DESC LIMIT 5
      )) as sample_media
     FROM stories s 
     ORDER BY updated_at DESC`
  );
  return rows.map(mapStoryRow);
}

export async function getStoryById(id: number): Promise<Story | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM stories WHERE id = ?',
    id
  );
  if (!row) return null;
  return mapStoryRow(row);
}

export async function getCompositionsByStoryId(storyId: number): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT c.*, (SELECT GROUP_CONCAT(story_id) FROM composition_stories WHERE composition_id = c.id) as story_ids
     FROM compositions c
     JOIN composition_stories cs ON cs.composition_id = c.id
     WHERE cs.story_id = ? 
     ORDER BY c.created_at ASC`,
    storyId
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export async function deleteStory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM composition_stories WHERE story_id = ?', id);
  await db.runAsync('DELETE FROM stories WHERE id = ?', id);
}
