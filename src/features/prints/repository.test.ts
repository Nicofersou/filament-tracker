/** @jest-environment node */
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../../db/migrations';
import { createTestDb } from '../../test-utils/sqlite';
import { createPrinter, setPrinterArchived } from '../printers/repository';
import { setEnergyPrice } from '../settings/repository';
import { createSpool, getSpoolById, updateSpoolStatus } from '../spools/repository';
import { createPrint, deletePrint, getPrintDetail, listPrints } from './repository';

let db: SQLiteDatabase;
let printerId: number;
let spoolId: number;

const basePrint = { name: 'Pieza', printedAt: '2026-10-30T10:00:00.000Z', durationMin: 180 };

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
  await setEnergyPrice(db, 0.15);
  printerId = await createPrinter(db, {
    brand: 'Anycubic',
    model: 'Kobra 4 Combo',
    powerW: 100,
    costCents: 30000,
    lifetimeHours: 3000,
  });
  spoolId = await createSpool(db, { material: 'PLA', colorName: 'Negro', priceCents: 2000 });
});

describe('createPrint', () => {
  it('guarda la impresión con los costes calculados', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [{ spoolId, grams: 100 }],
    });

    expect(await getPrintDetail(db, id)).toMatchObject({
      printerName: 'Anycubic Kobra 4 Combo',
      result: 'success',
      materialCostCents: 200,
      energyCostCents: 5,
      wearCostCents: 30,
      totalCostCents: 235,
      usages: [{ spoolId, material: 'PLA', colorName: 'Negro', grams: 100, costCents: 200 }],
    });
  });

  it('descuenta los gramos y abre una bobina sin abrir', async () => {
    await createPrint(db, { ...basePrint, printerId, spools: [{ spoolId, grams: 100 }] });

    const spool = await getSpoolById(db, spoolId);
    expect(spool).toMatchObject({ remainingWeightG: 900, status: 'in_use' });
    expect(spool?.openedAt).not.toBeNull();
  });

  it('no cambia la fecha de apertura de una bobina que ya estaba en uso', async () => {
    await updateSpoolStatus(db, spoolId, 'in_use');
    const before = await getSpoolById(db, spoolId);

    await createPrint(db, { ...basePrint, printerId, spools: [{ spoolId, grams: 50 }] });

    const after = await getSpoolById(db, spoolId);
    expect(after?.openedAt).toBe(before?.openedAt);
    expect(after?.remainingWeightG).toBe(950);
  });

  it('los gramos restantes nunca bajan de 0 y la impresión se guarda igualmente', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [{ spoolId, grams: 5000 }],
    });

    expect(await getSpoolById(db, spoolId)).toMatchObject({
      remainingWeightG: 0,
      status: 'in_use',
    });
    expect(await getPrintDetail(db, id)).not.toBeNull();
  });

  it('una impresión fallida también cuenta coste y descuenta material', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      result: 'failed',
      spools: [{ spoolId, grams: 20 }],
    });

    expect(await getPrintDetail(db, id)).toMatchObject({
      result: 'failed',
      materialCostCents: 40,
    });
    expect((await getSpoolById(db, spoolId))?.remainingWeightG).toBe(980);
  });

  it('admite varias bobinas en una impresión', async () => {
    const otherId = await createSpool(db, {
      material: 'PETG',
      colorName: 'Rojo',
      priceCents: 1000,
    });

    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [
        { spoolId, grams: 50 },
        { spoolId: otherId, grams: 30 },
      ],
    });

    const detail = await getPrintDetail(db, id);
    expect(detail?.usages).toHaveLength(2);
    expect(detail?.materialCostCents).toBe(130);
    expect((await getSpoolById(db, spoolId))?.remainingWeightG).toBe(950);
    expect((await getSpoolById(db, otherId))?.remainingWeightG).toBe(970);
  });

  it('si algo falla a medias, se deshace todo', async () => {
    const otherId = await createSpool(db, { material: 'PETG', colorName: 'Rojo' });

    await expect(
      createPrint(db, {
        ...basePrint,
        printerId,
        // Los gramos negativos violan una restricción de la base de datos
        // después de haber guardado ya la impresión y la primera bobina.
        spools: [
          { spoolId, grams: 50 },
          { spoolId: otherId, grams: -5 },
        ],
      }),
    ).rejects.toThrow();

    expect(await listPrints(db)).toHaveLength(0);
    expect((await getSpoolById(db, spoolId))?.remainingWeightG).toBe(1000);
    expect((await getSpoolById(db, spoolId))?.status).toBe('sealed');
  });

  it('rechaza una impresora archivada', async () => {
    await setPrinterArchived(db, printerId, true);
    await expect(
      createPrint(db, { ...basePrint, printerId, spools: [{ spoolId, grams: 10 }] }),
    ).rejects.toMatchObject({ code: 'PRINTER_ARCHIVED' });
  });

  it('rechaza una impresora inexistente', async () => {
    await expect(
      createPrint(db, { ...basePrint, printerId: 999, spools: [{ spoolId, grams: 10 }] }),
    ).rejects.toMatchObject({ code: 'PRINTER_NOT_FOUND' });
  });

  it('rechaza una bobina gastada', async () => {
    await updateSpoolStatus(db, spoolId, 'empty');
    await expect(
      createPrint(db, { ...basePrint, printerId, spools: [{ spoolId, grams: 10 }] }),
    ).rejects.toMatchObject({ code: 'SPOOL_EMPTY' });
  });

  it('rechaza una bobina inexistente', async () => {
    await expect(
      createPrint(db, { ...basePrint, printerId, spools: [{ spoolId: 999, grams: 10 }] }),
    ).rejects.toMatchObject({ code: 'SPOOL_NOT_FOUND' });
  });

  it('rechaza una impresión sin bobinas o con la misma bobina repetida', async () => {
    await expect(createPrint(db, { ...basePrint, printerId, spools: [] })).rejects.toMatchObject({
      code: 'NO_SPOOLS',
    });
    await expect(
      createPrint(db, {
        ...basePrint,
        printerId,
        spools: [
          { spoolId, grams: 10 },
          { spoolId, grams: 20 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_SPOOL' });
  });
});

describe('listPrints', () => {
  it('ordena de más reciente a más antigua', async () => {
    await createPrint(db, {
      ...basePrint,
      name: 'Antigua',
      printedAt: '2026-10-01T10:00:00.000Z',
      printerId,
      spools: [{ spoolId, grams: 10 }],
    });
    await createPrint(db, {
      ...basePrint,
      name: 'Reciente',
      printedAt: '2026-10-29T10:00:00.000Z',
      printerId,
      spools: [{ spoolId, grams: 10 }],
    });

    expect((await listPrints(db)).map((p) => p.name)).toEqual(['Reciente', 'Antigua']);
  });
});

describe('deletePrint', () => {
  it('devuelve los gramos a la bobina y borra la impresión con sus usos', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [{ spoolId, grams: 100 }],
    });

    await deletePrint(db, id);

    expect(await listPrints(db)).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM print_spool_usages')).toHaveLength(0);
    expect((await getSpoolById(db, spoolId))?.remainingWeightG).toBe(1000);
  });

  it('no devuelve gramos a una bobina que se marcó como gastada', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [{ spoolId, grams: 100 }],
    });
    await updateSpoolStatus(db, spoolId, 'empty');

    await deletePrint(db, id);

    expect(await getSpoolById(db, spoolId)).toMatchObject({
      status: 'empty',
      remainingWeightG: 0,
    });
  });

  it('nunca supera el peso inicial de la bobina', async () => {
    const id = await createPrint(db, {
      ...basePrint,
      printerId,
      spools: [{ spoolId, grams: 5000 }],
    });

    await deletePrint(db, id);

    expect((await getSpoolById(db, spoolId))?.remainingWeightG).toBe(1000);
  });
});
