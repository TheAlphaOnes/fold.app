import type { SQLiteDatabase } from 'expo-sqlite';
import type { CompositionRow } from '@/types/journal';

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS compositions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  text_content   TEXT    NOT NULL,
  media_elements TEXT    NOT NULL, -- JSON string
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compositions_created_at
  ON compositions (created_at DESC);
`;

export async function initSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);
}

export function mapRow(row: unknown): CompositionRow {
  const r = row as Record<string, unknown>;
  return {
    id: Number(r.id),
    text_content: String(r.text_content),
    media_elements: String(r.media_elements),
    created_at: Number(r.created_at),
  };
}
