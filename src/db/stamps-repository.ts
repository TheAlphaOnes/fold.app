/**
 * Stamps repository — database operations for the stamp collection only.
 * Image files live in the documents directory; their URIs are re-based on
 * read so they survive app reinstalls (see resolveDocumentUri).
 */

import { getDatabase } from './client';
import { resolveDocumentUri } from './journal-repository';
import type { NewStamp, Stamp } from '@/types/stamp';

function mapStampRow(row: unknown): Stamp {
  const r = row as Record<string, unknown>;
  return {
    id: Number(r.id),
    imageUri: resolveDocumentUri(String(r.image_uri)),
    place: String(r.place),
    country: r.country ? String(r.country) : undefined,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    createdAt: Number(r.created_at),
  };
}

/** Every stamp, newest first. */
export async function getAllStamps(): Promise<Stamp[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM stamps ORDER BY created_at DESC');
  return rows.map(mapStampRow);
}

export async function createStamp(stamp: NewStamp): Promise<Stamp> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO stamps (image_uri, place, country, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    stamp.imageUri,
    stamp.place,
    stamp.country ?? null,
    stamp.latitude,
    stamp.longitude,
    stamp.createdAt,
  );
  return { ...stamp, id: Number(result.lastInsertRowId) };
}

export async function deleteStamp(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM stamps WHERE id = ?', id);
}
