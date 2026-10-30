/** @jest-environment node */
import { createTestDb } from '../test-utils/sqlite';
import { migrateDbIfNeeded } from './migrations';

describe('migrateDbIfNeeded', () => {
  it('crea la tabla spools y fija la versión del esquema', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'spools'",
    );

    expect(version?.user_version).toBe(1);
    expect(tables).toHaveLength(1);
  });

  it('se puede ejecutar dos veces sin fallar', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);
    await expect(migrateDbIfNeeded(db)).resolves.toBeUndefined();
  });

  it('la base de datos rechaza un estado inválido (restricción CHECK)', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    await expect(
      db.runAsync(
        `INSERT INTO spools (material, color_name, remaining_weight_g, status)
         VALUES ('PLA', 'Negro', 1000, 'roto')`,
      ),
    ).rejects.toThrow();
  });
});
