/**
 * app_cache: disposable JSON snapshots of derived data. A missing, stale or
 * unreadable row just means the caller computes it again.
 */

import { getDatabase } from './client';

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_cache WHERE key = ?', [key]);
    return row ? (JSON.parse(row.value) as T) : null;
  } catch (error) {
    console.warn(`Ignoring unreadable cache "${key}"`, error);
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_cache (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), Date.now()],
  );
}
