import type { SQLiteDatabase } from 'expo-sqlite';
import type { CompositionRow } from '@/types/journal';

const CREATE_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS stories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  title           TEXT    NOT NULL,
  cover_image_uri TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS compositions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  text_content   TEXT    NOT NULL,
  media_elements TEXT    NOT NULL, -- JSON string
  created_at     INTEGER NOT NULL,
  font_family    TEXT    DEFAULT 'JetBrainsMono-Regular',
  font_size      INTEGER DEFAULT 21,
  location_name  TEXT,
  location_coords TEXT,
  story_id       INTEGER REFERENCES stories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_compositions_created_at
  ON compositions (created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export async function initSchema(db: SQLiteDatabase): Promise<void> {
  // We can't run CREATE_SQL fully if it creates indexes on columns that don't exist yet, 
  // but we removed the story_id index from it.
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

  try {
    await db.execAsync("ALTER TABLE compositions ADD COLUMN location_name TEXT;");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) throw e;
  }

  try {
    await db.execAsync("ALTER TABLE compositions ADD COLUMN location_coords TEXT;");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) throw e;
  }

  try {
    await db.execAsync("ALTER TABLE compositions ADD COLUMN story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL;");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) throw e;
  }
  
  // Create index AFTER column is guaranteed to exist
  await db.execAsync("CREATE INDEX IF NOT EXISTS idx_compositions_story_id ON compositions (story_id);");

  // Create junction table for many-to-many relationship
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS composition_stories (
      composition_id INTEGER NOT NULL REFERENCES compositions(id) ON DELETE CASCADE,
      story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      PRIMARY KEY (composition_id, story_id)
    );
  `);

  // Migrate existing data from compositions.story_id to the junction table safely
  await db.execAsync(`
    INSERT OR IGNORE INTO composition_stories (composition_id, story_id)
    SELECT id, story_id FROM compositions WHERE story_id IS NOT NULL;
  `);
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
    location_name: r.location_name ? String(r.location_name) : undefined,
    location_coords: r.location_coords ? String(r.location_coords) : undefined,
    story_ids: r.story_ids ? String(r.story_ids) : undefined,
    story_id: r.story_id ? Number(r.story_id) : undefined,
  };
}
