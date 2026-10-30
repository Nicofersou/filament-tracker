/** @jest-environment node */
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../../db/migrations';
import { createTestDb } from '../../test-utils/sqlite';
import {
  createPrinter,
  getPrinter,
  listPrinters,
  setPrinterArchived,
  updatePrinter,
} from './repository';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
});

describe('printers repository', () => {
  it('crea y recupera una impresora', async () => {
    const id = await createPrinter(db, {
      brand: 'Anycubic',
      model: 'Kobra 4 Combo',
      powerW: 100,
    });

    expect(await getPrinter(db, id)).toMatchObject({
      brand: 'Anycubic',
      model: 'Kobra 4 Combo',
      powerW: 100,
      costCents: null,
      lifetimeHours: null,
      archivedAt: null,
    });
  });

  it('actualiza los datos de una impresora', async () => {
    const id = await createPrinter(db, { brand: 'Anycubic', model: 'Kobra 4 Combo' });
    await updatePrinter(db, id, {
      brand: 'Anycubic',
      model: 'Kobra 4 Combo',
      costCents: 30000,
      lifetimeHours: 3000,
    });

    expect(await getPrinter(db, id)).toMatchObject({ costCents: 30000, lifetimeHours: 3000 });
  });

  it('las archivadas no salen por defecto pero se pueden pedir', async () => {
    const id = await createPrinter(db, { brand: 'Anycubic', model: 'Kobra 4 Combo' });
    await createPrinter(db, { brand: 'Bambu Lab', model: 'A1' });

    await setPrinterArchived(db, id, true);

    expect((await listPrinters(db)).map((p) => p.model)).toEqual(['A1']);
    expect(await listPrinters(db, { includeArchived: true })).toHaveLength(2);

    await setPrinterArchived(db, id, false);
    expect(await listPrinters(db)).toHaveLength(2);
  });
});
