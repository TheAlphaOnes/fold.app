/**
 * Fold — Database client
 *
 * Singleton SQLite client. Opens the database once and reuses the connection.
 * All data stays on-device — nothing is transmitted anywhere.
 */

import * as SQLite from 'expo-sqlite';

import { initSchema } from './schema';

const DB_NAME = 'fold.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get the initialized database instance.
 * Safe to call concurrently — initialization runs exactly once.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  if (!initPromise) {
    initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await initSchema(db);
      dbInstance = db;
      return db;
    })();
  }

  return initPromise;
}
