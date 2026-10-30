/** @jest-environment node */
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../../db/migrations';
import { createTestDb } from '../../test-utils/sqlite';
import {
  createSpool,
  createSpools,
  deleteSpool,
  getInventorySummary,
  listSpools,
  listSpoolsByColor,
  updateSpoolStatus,
} from './repository';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
});

describe('createSpool', () => {
  it('aplica los valores por defecto', async () => {
    await createSpool(db, { material: 'PLA', colorName: 'Negro' });
    const [spool] = await listSpools(db);

    expect(spool).toMatchObject({
      status: 'sealed',
      initialWeightG: 1000,
      remainingWeightG: 1000,
      openedAt: null,
      finishedAt: null,
      priceCents: null,
    });
  });

  it('una bobina creada como gastada tiene 0 gramos y fecha de fin', async () => {
    await createSpool(db, { material: 'PLA', colorName: 'Negro', status: 'empty' });
    const [spool] = await listSpools(db);

    expect(spool?.remainingWeightG).toBe(0);
    expect(spool?.finishedAt).not.toBeNull();
  });
});

describe('createSpools', () => {
  it('crea tantas bobinas como se pida', async () => {
    await createSpools(db, { material: 'PETG', colorName: 'Rojo' }, 4);
    expect(await listSpools(db)).toHaveLength(4);
  });
});

describe('getInventorySummary', () => {
  it('agrupa por material y color y cuenta cada estado', async () => {
    await createSpools(db, { material: 'PLA', colorName: 'Negro' }, 2);
    await createSpool(db, { material: 'PLA', colorName: 'Negro', status: 'empty' });
    await createSpool(db, { material: 'PLA', colorName: 'Rojo', status: 'in_use' });

    expect(await getInventorySummary(db)).toEqual([
      { material: 'PLA', colorName: 'Negro', colorHex: null, sealed: 2, inUse: 0, empty: 1 },
      { material: 'PLA', colorName: 'Rojo', colorHex: null, sealed: 0, inUse: 1, empty: 0 },
    ]);
  });
});

describe('listSpoolsByColor', () => {
  it('ordena primero en uso, luego sin abrir y al final gastadas', async () => {
    await createSpool(db, { material: 'PLA', colorName: 'Negro', status: 'empty' });
    await createSpool(db, { material: 'PLA', colorName: 'Negro', status: 'sealed' });
    await createSpool(db, { material: 'PLA', colorName: 'Negro', status: 'in_use' });

    const spools = await listSpoolsByColor(db, 'PLA', 'Negro');
    expect(spools.map((s) => s.status)).toEqual(['in_use', 'sealed', 'empty']);
  });
});

describe('updateSpoolStatus', () => {
  it('abrir guarda la fecha de apertura y no la pisa al repetir', async () => {
    const id = await createSpool(db, { material: 'PLA', colorName: 'Negro' });

    await updateSpoolStatus(db, id, 'in_use');
    const [first] = await listSpools(db);
    expect(first?.openedAt).not.toBeNull();

    await updateSpoolStatus(db, id, 'in_use');
    const [second] = await listSpools(db);
    expect(second?.openedAt).toBe(first?.openedAt);
  });

  it('gastar pone los gramos a 0 y volver a sin abrir lo restaura todo', async () => {
    const id = await createSpool(db, { material: 'PLA', colorName: 'Negro' });

    await updateSpoolStatus(db, id, 'empty');
    const [empty] = await listSpools(db);
    expect(empty).toMatchObject({ status: 'empty', remainingWeightG: 0 });
    expect(empty?.finishedAt).not.toBeNull();

    await updateSpoolStatus(db, id, 'sealed');
    const [sealed] = await listSpools(db);
    expect(sealed).toMatchObject({
      status: 'sealed',
      remainingWeightG: 1000,
      openedAt: null,
      finishedAt: null,
    });
  });
});

describe('deleteSpool', () => {
  it('elimina la bobina', async () => {
    const id = await createSpool(db, { material: 'PLA', colorName: 'Negro' });
    await deleteSpool(db, id);
    expect(await listSpools(db)).toHaveLength(0);
  });
});
