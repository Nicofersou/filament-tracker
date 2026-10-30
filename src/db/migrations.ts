import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = (db: SQLiteDatabase) => Promise<void>;

/** v1: inventario de bobinas. Una vez publicada, NO se edita. */
const migrateToV1: Migration = async (db) => {
  await db.execAsync(`
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
};

/** v2: impresoras, ajustes, impresiones y uso de bobinas. */
const migrateToV2: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      power_w INTEGER CHECK (power_w IS NULL OR power_w > 0),
      cost_cents INTEGER CHECK (cost_cents IS NULL OR cost_cents >= 0),
      lifetime_hours INTEGER CHECK (lifetime_hours IS NULL OR lifetime_hours > 0),
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      energy_price_per_kwh REAL CHECK (energy_price_per_kwh IS NULL OR energy_price_per_kwh >= 0)
    );
    INSERT INTO settings (id, energy_price_per_kwh) VALUES (1, NULL);

    CREATE TABLE prints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      printed_at TEXT NOT NULL,
      duration_min INTEGER NOT NULL CHECK (duration_min > 0),
      result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failed')),
      energy_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (energy_cost_cents >= 0),
      wear_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (wear_cost_cents >= 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX idx_prints_printed_at ON prints(printed_at);
    CREATE INDEX idx_prints_printer_id ON prints(printer_id);

    CREATE TABLE print_spool_usages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      print_id INTEGER NOT NULL REFERENCES prints(id) ON DELETE CASCADE,
      spool_id INTEGER NOT NULL REFERENCES spools(id) ON DELETE RESTRICT,
      grams REAL NOT NULL CHECK (grams > 0),
      cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0)
    );
    CREATE INDEX idx_usages_print_id ON print_spool_usages(print_id);
    CREATE INDEX idx_usages_spool_id ON print_spool_usages(spool_id);
  `);
};

const MIGRATIONS: Migration[] = [migrateToV1, migrateToV2];

export const DATABASE_VERSION = MIGRATIONS.length;

/**
 * Aplica las migraciones pendientes. `targetVersion` existe para poder probar
 * migraciones intermedias en los tests; la app siempre usa la última.
 */
export async function migrateDbIfNeeded(
  db: SQLiteDatabase,
  targetVersion: number = DATABASE_VERSION,
) {
  // Ajustes de conexión: se aplican en cada apertura y no forman parte del esquema.
  await db.execAsync(`
    PRAGMA journal_mode = 'wal';
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < targetVersion; version++) {
    const migrate = MIGRATIONS[version];
    if (!migrate) break;

    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
