import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE spools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material TEXT NOT NULL,
        color_name TEXT NOT NULL,
        color_hex TEXT,
        brand TEXT,
        initial_weight_g INTEGER NOT NULL DEFAULT 1000 CHECK (initial_weight_g > 0),
        remaining_weight_g INTEGER NOT NULL CHECK (remaining_weight_g >= 0),
        price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
        status TEXT NOT NULL DEFAULT 'sealed'
          CHECK (status IN ('sealed', 'in_use', 'empty')),
        opened_at TEXT,
        finished_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_spools_status ON spools(status);
    `);
    currentVersion = 1;
  }

  // Futuras migraciones: if (currentVersion === 1) { ...; currentVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
