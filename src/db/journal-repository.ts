import { getDatabase } from './client';
import { mapRow } from './schema';
import type { Composition, CompositionRow, MediaElement } from '@/types/journal';

export interface CreateCompositionInput {
  textContent: string;
  mediaElements: MediaElement[];
}

export interface UpdateMediaPositionsInput {
  id: number;
  mediaElements: MediaElement[];
}

function rowToComposition(row: CompositionRow): Composition {
  let mediaElements: MediaElement[] = [];
  try {
    mediaElements = JSON.parse(row.media_elements);
  } catch (e) {
    console.error('Failed to parse media_elements for composition', row.id, e);
  }
  return {
    id: row.id,
    textContent: row.text_content,
    mediaElements,
    createdAt: row.created_at,
  };
}

export async function getAllCompositions(): Promise<Composition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM compositions ORDER BY created_at ASC'
  );
  return rows.map((row) => rowToComposition(mapRow(row)));
}

export async function createComposition(input: CreateCompositionInput): Promise<Composition> {
  const db = await getDatabase();
  const now = Date.now();
  const mediaJson = JSON.stringify(input.mediaElements);
  
  const result = await db.runAsync(
    'INSERT INTO compositions (text_content, media_elements, created_at) VALUES (?, ?, ?)',
    input.textContent,
    mediaJson,
    now
  );
  return {
    id: result.lastInsertRowId as number,
    textContent: input.textContent,
    mediaElements: input.mediaElements,
    createdAt: now,
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

export async function deleteComposition(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM compositions WHERE id = ?', id);
}
