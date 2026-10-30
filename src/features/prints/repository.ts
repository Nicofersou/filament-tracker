import type { SQLiteDatabase } from 'expo-sqlite';
import { getPrinter } from '../printers/repository';
import { getSettings } from '../settings/repository';
import { getSpoolById } from '../spools/repository';
import type { Material } from '../spools/types';
import { calcMaterialCostCents, calcPrintCost } from './costs';
import {
  CreatePrintError,
  type NewPrint,
  type PrintDetail,
  type PrintListItem,
  type PrintResult,
} from './types';

interface PrintRow {
  id: number;
  printer_id: number;
  name: string;
  printed_at: string;
  duration_min: number;
  result: string;
  energy_cost_cents: number;
  wear_cost_cents: number;
  notes: string | null;
  printer_brand: string;
  printer_model: string;
  material_cost_cents: number;
}

// Constante del código (nunca texto del usuario): se le añade WHERE/ORDER BY fijos.
const PRINT_SELECT = `
  SELECT p.id, p.printer_id, p.name, p.printed_at, p.duration_min, p.result,
         p.energy_cost_cents, p.wear_cost_cents, p.notes,
         pr.brand AS printer_brand, pr.model AS printer_model,
         COALESCE(
           (SELECT SUM(u.cost_cents) FROM print_spool_usages u WHERE u.print_id = p.id), 0
         ) AS material_cost_cents
    FROM prints p
    JOIN printers pr ON pr.id = p.printer_id`;

function toListItem(row: PrintRow): PrintListItem {
  return {
    id: row.id,
    printerId: row.printer_id,
    printerName: `${row.printer_brand} ${row.printer_model}`,
    name: row.name,
    printedAt: row.printed_at,
    durationMin: row.duration_min,
    result: row.result as PrintResult,
    materialCostCents: row.material_cost_cents,
    energyCostCents: row.energy_cost_cents,
    wearCostCents: row.wear_cost_cents,
    totalCostCents: row.material_cost_cents + row.energy_cost_cents + row.wear_cost_cents,
    notes: row.notes,
  };
}

export async function createPrint(db: SQLiteDatabase, input: NewPrint): Promise<number> {
  if (input.spools.length === 0) {
    throw new CreatePrintError('NO_SPOOLS');
  }
  const spoolIds = input.spools.map((item) => item.spoolId);
  if (new Set(spoolIds).size !== spoolIds.length) {
    throw new CreatePrintError('DUPLICATE_SPOOL');
  }

  let printId = 0;

  await db.withTransactionAsync(async () => {
    const printer = await getPrinter(db, input.printerId);
    if (!printer) throw new CreatePrintError('PRINTER_NOT_FOUND');
    if (printer.archivedAt !== null) throw new CreatePrintError('PRINTER_ARCHIVED');

    const { energyPricePerKwh } = await getSettings(db);

    const usages = [];
    for (const item of input.spools) {
      const spool = await getSpoolById(db, item.spoolId);
      if (!spool) throw new CreatePrintError('SPOOL_NOT_FOUND');
      if (spool.status === 'empty') throw new CreatePrintError('SPOOL_EMPTY');

      const usage = {
        grams: item.grams,
        priceCents: spool.priceCents,
        initialWeightG: spool.initialWeightG,
      };
      usages.push({ spoolId: spool.id, ...usage, costCents: calcMaterialCostCents(usage) });
    }

    const cost = calcPrintCost({
      durationMin: input.durationMin,
      spools: usages.map(({ grams, priceCents, initialWeightG }) => ({
        grams,
        priceCents,
        initialWeightG,
      })),
      printer: {
        powerW: printer.powerW,
        costCents: printer.costCents,
        lifetimeHours: printer.lifetimeHours,
      },
      energyPricePerKwh,
    });

    const result = await db.runAsync(
      `INSERT INTO prints
         (printer_id, name, printed_at, duration_min, result,
          energy_cost_cents, wear_cost_cents, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.printerId,
        input.name,
        input.printedAt,
        input.durationMin,
        input.result ?? 'success',
        cost.energyCents,
        cost.wearCents,
        input.notes ?? null,
      ],
    );
    printId = result.lastInsertRowId;

    const now = new Date().toISOString();
    for (const usage of usages) {
      await db.runAsync(
        `INSERT INTO print_spool_usages (print_id, spool_id, grams, cost_cents)
         VALUES (?, ?, ?, ?)`,
        [printId, usage.spoolId, usage.grams, usage.costCents],
      );

      // Descuenta sin bajar de 0; si estaba sin abrir, pasa a "en uso". Nunca la marca como gastada.
      await db.runAsync(
        `UPDATE spools
            SET remaining_weight_g = MAX(0, remaining_weight_g - ?),
                opened_at = CASE WHEN status = 'sealed' THEN COALESCE(opened_at, ?) ELSE opened_at END,
                status = CASE WHEN status = 'sealed' THEN 'in_use' ELSE status END
          WHERE id = ?`,
        [Math.round(usage.grams), now, usage.spoolId],
      );
    }
  });

  return printId;
}

export async function listPrints(db: SQLiteDatabase): Promise<PrintListItem[]> {
  const rows = await db.getAllAsync<PrintRow>(
    `${PRINT_SELECT} ORDER BY p.printed_at DESC, p.id DESC`,
  );
  return rows.map(toListItem);
}

export async function getPrintDetail(db: SQLiteDatabase, id: number): Promise<PrintDetail | null> {
  const row = await db.getFirstAsync<PrintRow>(`${PRINT_SELECT} WHERE p.id = ?`, [id]);
  if (!row) return null;

  const usages = await db.getAllAsync<{
    spool_id: number;
    material: string;
    color_name: string;
    color_hex: string | null;
    grams: number;
    cost_cents: number;
  }>(
    `SELECT u.spool_id, s.material, s.color_name, s.color_hex, u.grams, u.cost_cents
       FROM print_spool_usages u
       JOIN spools s ON s.id = u.spool_id
      WHERE u.print_id = ?
      ORDER BY u.id`,
    [id],
  );

  return {
    ...toListItem(row),
    usages: usages.map((u) => ({
      spoolId: u.spool_id,
      material: u.material as Material,
      colorName: u.color_name,
      colorHex: u.color_hex,
      grams: u.grams,
      costCents: u.cost_cents,
    })),
  };
}

/** Borra la impresión y devuelve los gramos a las bobinas que no estén gastadas. */
export async function deletePrint(db: SQLiteDatabase, printId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    const usages = await db.getAllAsync<{ spool_id: number; grams: number }>(
      'SELECT spool_id, grams FROM print_spool_usages WHERE print_id = ?',
      [printId],
    );

    for (const usage of usages) {
      await db.runAsync(
        `UPDATE spools
            SET remaining_weight_g = MIN(initial_weight_g, remaining_weight_g + ?)
          WHERE id = ? AND status != 'empty'`,
        [Math.round(usage.grams), usage.spool_id],
      );
    }

    await db.runAsync('DELETE FROM prints WHERE id = ?', [printId]);
  });
}
