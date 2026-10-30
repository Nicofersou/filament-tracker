/** @jest-environment node */
import { createTestDb } from '../test-utils/sqlite';
import { DATABASE_VERSION, migrateDbIfNeeded } from './migrations';

async function getVersion(db: ReturnType<typeof createTestDb>) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version;
}

describe('migrateDbIfNeeded', () => {
  it('una base nueva termina en la última versión con todas las tablas', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    expect(await getVersion(db)).toBe(DATABASE_VERSION);

    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name`,
    );
    expect(tables.map((t) => t.name)).toEqual([
      'print_spool_usages',
      'printers',
      'prints',
      'settings',
      'spools',
    ]);
  });

  it('se puede ejecutar varias veces sin fallar', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);
    await expect(migrateDbIfNeeded(db)).resolves.toBeUndefined();
    expect(await getVersion(db)).toBe(DATABASE_VERSION);
  });

  it('migrar de v1 a v2 conserva las bobinas existentes', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db, 1);
    expect(await getVersion(db)).toBe(1);

    await db.runAsync(
      `INSERT INTO spools (material, color_name, remaining_weight_g, status, price_cents)
       VALUES ('PLA', 'Negro', 640, 'in_use', 1899)`,
    );

    await migrateDbIfNeeded(db);

    expect(await getVersion(db)).toBe(2);
    const spools = await db.getAllAsync<{ color_name: string; remaining_weight_g: number }>(
      'SELECT color_name, remaining_weight_g FROM spools',
    );
    expect(spools).toEqual([{ color_name: 'Negro', remaining_weight_g: 640 }]);
  });

  it('activa las claves foráneas en cada apertura', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);
    const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(row?.foreign_keys).toBe(1);
  });

  it('deja una única fila de ajustes y no admite más', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    expect(await db.getAllAsync('SELECT id, energy_price_per_kwh FROM settings')).toEqual([
      { id: 1, energy_price_per_kwh: null },
    ]);
    await expect(db.runAsync('INSERT INTO settings (id) VALUES (2)')).rejects.toThrow();
  });
});

describe('integridad referencial del esquema v2', () => {
  async function seed() {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    const printer = await db.runAsync(
      "INSERT INTO printers (brand, model) VALUES ('Anycubic', 'Kobra 4 Combo')",
    );
    const spool = await db.runAsync(
      "INSERT INTO spools (material, color_name, remaining_weight_g) VALUES ('PLA', 'Negro', 1000)",
    );
    const print = await db.runAsync(
      `INSERT INTO prints (printer_id, name, printed_at, duration_min)
       VALUES (?, 'Pieza de prueba', '2026-10-30T10:00:00.000Z', 60)`,
      [printer.lastInsertRowId],
    );
    await db.runAsync(
      'INSERT INTO print_spool_usages (print_id, spool_id, grams) VALUES (?, ?, 12.5)',
      [print.lastInsertRowId, spool.lastInsertRowId],
    );

    return {
      db,
      printerId: printer.lastInsertRowId,
      spoolId: spool.lastInsertRowId,
      printId: print.lastInsertRowId,
    };
  }

  it('rechaza una impresión de una impresora que no existe', async () => {
    const { db } = await seed();
    await expect(
      db.runAsync(
        `INSERT INTO prints (printer_id, name, printed_at, duration_min)
         VALUES (999, 'Huérfana', '2026-10-30T10:00:00.000Z', 30)`,
      ),
    ).rejects.toThrow();
  });

  it('no permite borrar una bobina usada en una impresión', async () => {
    const { db, spoolId } = await seed();
    await expect(db.runAsync('DELETE FROM spools WHERE id = ?', [spoolId])).rejects.toThrow();
  });

  it('no permite borrar una impresora con impresiones', async () => {
    const { db, printerId } = await seed();
    await expect(db.runAsync('DELETE FROM printers WHERE id = ?', [printerId])).rejects.toThrow();
  });

  it('al borrar una impresión se borran sus usos de bobina', async () => {
    const { db, printId } = await seed();
    await db.runAsync('DELETE FROM prints WHERE id = ?', [printId]);

    const usages = await db.getAllAsync('SELECT * FROM print_spool_usages');
    expect(usages).toHaveLength(0);
  });
});
