import type { SQLiteDatabase } from 'expo-sqlite';
import type { CompositionRow } from '@/types/journal';

const CREATE_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS compositions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  text_content   TEXT    NOT NULL,
  media_elements TEXT    NOT NULL, -- JSON string
  created_at     INTEGER NOT NULL,
  font_family    TEXT    DEFAULT 'JetBrainsMono-Regular',
  font_size      INTEGER DEFAULT 21
);

CREATE INDEX IF NOT EXISTS idx_compositions_created_at
  ON compositions (created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export async function initSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_SQL);

  // Safe migrations if the table existed before columns were added
  try {
    await db.execAsync("ALTER TABLE compositions ADD COLUMN font_family TEXT DEFAULT 'JetBrainsMono-Regular';");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) throw e;
  }

  try {
    await db.execAsync("ALTER TABLE compositions ADD COLUMN font_size INTEGER DEFAULT 21;");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) throw e;
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
    font_size: r.font_size ? Number(r.font_size) : 21,
  };
}
