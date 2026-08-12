import type { SQLiteDatabase } from 'expo-sqlite';
import type { CompositionRow } from '@/types/journal';

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS compositions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  text_content   TEXT    NOT NULL,
  media_elements TEXT    NOT NULL, -- JSON string
  created_at     INTEGER NOT NULL,
  font_family    TEXT    DEFAULT 'JetBrainsMono-Regular'
);

-- Safe migration if the table existed before font_family was added
ALTER TABLE compositions ADD COLUMN font_family TEXT DEFAULT 'JetBrainsMono-Regular';

CREATE INDEX IF NOT EXISTS idx_compositions_created_at
  ON compositions (created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export async function initSchema(db: SQLiteDatabase): Promise<void> {
  // We wrap in a try-catch because ALTER TABLE will throw if the column already exists
  try {
    await db.execAsync(SCHEMA_SQL);
  } catch (e: any) {
    // Ignore duplicate column errors from the naive migration
    if (!e.message?.includes('duplicate column name')) {
      throw e;
    }
  }
}

export function mapRow(row: unknown): CompositionRow {
  const r = row as Record<string, unknown>;
  return {
    id: Number(r.id),
    text_content: String(r.text_content),
    media_elements: String(r.media_elements),
    created_at: Number(r.created_at),
    font_family: r.font_family ? String(r.font_family) : 'JetBrainsMono-Regular',
  };
}
